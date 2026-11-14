import { NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { connectToDatabase } from '@/lib/db/mongodb';
import { TrafficDomainModel } from '@/lib/db/models';
import { getAuthUser } from '@/lib/auth';

export const runtime = 'nodejs';

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
      },
    });
  } catch (error) {
    return NextResponse.json({ status: 'error', message: 'Unable to load the Traffic domain.' }, { status: 500 });
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
