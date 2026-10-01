import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { UserModel } from '@/lib/db/models';
import { getAuthUser } from '@/lib/auth';

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = await getAuthUser(req);
  if (!currentUser || currentUser.role !== 'admin') {
    return NextResponse.json({ status: 'error', message: '403 Forbidden' }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    // D-14: the CMS must never set/reset/change a password for an existing user —
    // `password` is not destructured and is never assigned. Password recovery stays
    // CLI-only (Phase 1 D-04, scripts/reset-admin.ts). A request carrying `password`
    // is a no-op on `password_hash`.
    const { name, role, status, avatar } = body;

    await connectToDatabase();
    const userDoc = await UserModel.findById(id);

    if (!userDoc) {
      return NextResponse.json({ status: 'error', message: 'User not found' }, { status: 404 });
    }

    if (name !== undefined) userDoc.name = name;
    if (role !== undefined) userDoc.role = role;
    if (status !== undefined) userDoc.status = status;
    if (avatar !== undefined) userDoc.avatar = avatar;

    await userDoc.save();

    return NextResponse.json({
      status: 'success',
      data: {
        id: userDoc._id.toString(),
        username: userDoc.username,
        role: userDoc.role,
        name: userDoc.name,
        status: userDoc.status,
        avatar: userDoc.avatar,
      },
    });
  } catch (error) {
    return NextResponse.json({ status: 'error', message: 'Lỗi cập nhật thông tin user' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = await getAuthUser(req);
  if (!currentUser || currentUser.role !== 'admin') {
    return NextResponse.json({ status: 'error', message: '403 Forbidden' }, { status: 403 });
  }

  try {
    const { id } = await params;

    if (id === currentUser.userId.toString()) {
      return NextResponse.json(
        { status: 'error', message: 'Không thể xóa tài khoản của chính mình' },
        { status: 400 }
      );
    }

    await connectToDatabase();
    await UserModel.findByIdAndDelete(id);

    return NextResponse.json({
      status: 'success',
      message: 'Xóa người dùng thành công',
    });
  } catch (error) {
    return NextResponse.json({ status: 'error', message: 'Lỗi xóa người dùng' }, { status: 500 });
  }
}
