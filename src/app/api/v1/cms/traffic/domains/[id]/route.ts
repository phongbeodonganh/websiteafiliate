import { NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { connectToDatabase } from '@/lib/db/mongodb';
import { TrafficDomainModel } from '@/lib/db/models';
import { getAuthUser } from '@/lib/auth';

export const runtime = 'nodejs';

const WORK_STATUSES = ['chua_xet', 'dang_xet', 'chon', 'loai'] as const;
const WORK_NOTE_MAX_LENGTH = 500;

// Serves the stored report only — zero upstream calls; the detail modal reads
// whatever the last add&run / refresh persisted.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ status: 'error', message: 'Authentication required. Please sign in.' }, { status: 401 });
  }
  if (user.role !== 'admin') {
    return NextResponse.json(
      { status: 'error', message: 'Only administrators can view Traffic domains.' },
      { status: 403 }
    );
  }

  const { id } = await params;
  if (!Types.ObjectId.isValid(id)) {
    return NextResponse.json({ status: 'error', message: 'ID không hợp lệ.' }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const row = await TrafficDomainModel.findById(id);
    if (!row) {
      return NextResponse.json({ status: 'error', message: 'Không tìm thấy tên miền.' }, { status: 404 });
    }

    return NextResponse.json({
      status: 'success',
      data: {
        id: row._id.toString(),
        domain: row.domain,
        report: row.report,
        lastFetchedAt: row.lastFetchedAt,
        lastError: row.lastError,
        updatedAt: row.updatedAt,
        workStatus: row.workStatus,
        workNote: row.workNote,
      },
    });
  } catch (error) {
    return NextResponse.json({ status: 'error', message: 'Unable to load the Traffic domain.' }, { status: 500 });
  }
}

// Screening workflow state (A6): work status + short note, admin-only, zero
// upstream calls — persisted on the existing TrafficDomain document.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ status: 'error', message: 'Authentication required. Please sign in.' }, { status: 401 });
  }
  if (user.role !== 'admin') {
    return NextResponse.json(
      { status: 'error', message: 'Only administrators can manage Traffic domains.' },
      { status: 403 }
    );
  }

  const { id } = await params;
  if (!Types.ObjectId.isValid(id)) {
    return NextResponse.json({ status: 'error', message: 'ID không hợp lệ.' }, { status: 400 });
  }

  let body: { workStatus?: unknown; workNote?: unknown };
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const update: { workStatus?: string; workNote?: string } = {};
  if (body.workStatus !== undefined) {
    if (typeof body.workStatus !== 'string' || !(WORK_STATUSES as readonly string[]).includes(body.workStatus)) {
      return NextResponse.json(
        { status: 'error', error: { code: 'invalid_work_status', message: 'Trạng thái làm việc không hợp lệ.' }, message: 'Trạng thái làm việc không hợp lệ.' },
        { status: 400 }
      );
    }
    update.workStatus = body.workStatus;
  }
  if (body.workNote !== undefined) {
    if (typeof body.workNote !== 'string' || body.workNote.length > WORK_NOTE_MAX_LENGTH) {
      return NextResponse.json(
        { status: 'error', error: { code: 'invalid_work_note', message: `Ghi chú tối đa ${WORK_NOTE_MAX_LENGTH} ký tự.` }, message: `Ghi chú tối đa ${WORK_NOTE_MAX_LENGTH} ký tự.` },
        { status: 400 }
      );
    }
    update.workNote = body.workNote;
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json(
      { status: 'error', error: { code: 'empty_update', message: 'Không có thay đổi nào.' }, message: 'Không có thay đổi nào.' },
      { status: 400 }
    );
  }

  try {
    await connectToDatabase();
    const row = await TrafficDomainModel.findByIdAndUpdate(id, update, { returnDocument: 'after' });
    if (!row) {
      return NextResponse.json({ status: 'error', message: 'Không tìm thấy tên miền.' }, { status: 404 });
    }

    return NextResponse.json({
      status: 'success',
      data: {
        id: row._id.toString(),
        domain: row.domain,
        workStatus: row.workStatus,
        workNote: row.workNote,
      },
    });
  } catch (error) {
    return NextResponse.json({ status: 'error', message: 'Unable to update the Traffic domain.' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ status: 'error', message: 'Authentication required. Please sign in.' }, { status: 401 });
  }
  if (user.role !== 'admin') {
    return NextResponse.json(
      { status: 'error', message: 'Only administrators can manage Traffic domains.' },
      { status: 403 }
    );
  }

  const { id } = await params;
  if (!Types.ObjectId.isValid(id)) {
    return NextResponse.json({ status: 'error', message: 'ID không hợp lệ.' }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const deleted = await TrafficDomainModel.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json({ status: 'error', message: 'Không tìm thấy tên miền.' }, { status: 404 });
    }

    return NextResponse.json({
      status: 'success',
      data: { id: deleted._id.toString(), domain: deleted.domain },
    });
  } catch (error) {
    return NextResponse.json({ status: 'error', message: 'Unable to delete the Traffic domain.' }, { status: 500 });
  }
}
