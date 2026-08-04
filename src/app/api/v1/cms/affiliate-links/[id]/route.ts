import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { AffiliateLinkModel } from '@/lib/db/models';
import { getAuthUser } from '@/lib/auth';

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getAuthUser(req);
  if (!user || user.role !== 'admin') {
    return NextResponse.json(
      { status: 'error', message: '403 Forbidden - Chỉ Admin mới có quyền quản lý Link Affiliate' },
      { status: 403 }
    );
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const { name, base_url, commission, cookie, is_top_pick, isTopPick } = body;

    await connectToDatabase();
    const link = await AffiliateLinkModel.findById(id);

    if (!link) {
      return NextResponse.json({ status: 'error', message: 'Link not found' }, { status: 404 });
    }

    if (name !== undefined) link.name = name;
    if (base_url !== undefined) link.base_url = base_url;
    if (commission !== undefined) link.commission = commission;
    if (cookie !== undefined) link.cookie = cookie;
    if (is_top_pick !== undefined) link.is_top_pick = Boolean(is_top_pick);
    if (isTopPick !== undefined) link.is_top_pick = Boolean(isTopPick);

    await link.save();

    return NextResponse.json({
      status: 'success',
      data: {
        id: link._id.toString(),
        name: link.name,
        baseUrl: link.base_url,
        base_url: link.base_url,
        commission: link.commission,
        cookie: link.cookie,
        isTopPick: link.is_top_pick,
        is_top_pick: link.is_top_pick,
        createdAt: link.created_at,
      },
    });
  } catch (error) {
    return NextResponse.json({ status: 'error', message: 'Lỗi cập nhật affiliate link' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getAuthUser(req);
  if (!user || user.role !== 'admin') {
    return NextResponse.json(
      { status: 'error', message: '403 Forbidden - Chỉ Admin mới có quyền quản lý Link Affiliate' },
      { status: 403 }
    );
  }

  try {
    const { id } = await params;
    await connectToDatabase();
    await AffiliateLinkModel.findByIdAndDelete(id);

    return NextResponse.json({
      status: 'success',
      message: 'Xóa affiliate link thành công',
    });
  } catch (error) {
    return NextResponse.json({ status: 'error', message: 'Lỗi xóa affiliate link' }, { status: 500 });
  }
}
