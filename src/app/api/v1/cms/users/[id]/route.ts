import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { getAuthUser, hashPassword } from '@/lib/auth';
import { eq } from 'drizzle-orm';

// PUT /api/v1/cms/users/:id (Admin Only)
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = getAuthUser(req);
  if (!currentUser || currentUser.role !== 'admin') {
    return NextResponse.json({ status: 'error', message: '403 Forbidden' }, { status: 403 });
  }

  try {
    const { id } = await params;
    const userId = Number(id);
    const body = await req.json();
    const { name, role, status, password } = body;

    const updateData: Record<string, any> = {};
    if (name !== undefined) updateData.name = name;
    if (role !== undefined) updateData.role = role;
    if (status !== undefined) updateData.status = status;
    if (password) updateData.passwordHash = await hashPassword(password);

    const [updated] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning();

    return NextResponse.json({
      status: 'success',
      data: {
        id: updated.id,
        username: updated.username,
        role: updated.role,
        name: updated.name,
        status: updated.status,
      },
    });
  } catch (error) {
    return NextResponse.json({ status: 'error', message: 'Lỗi cập nhật thông tin user' }, { status: 500 });
  }
}

// DELETE /api/v1/cms/users/:id (Admin Only)
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = getAuthUser(req);
  if (!currentUser || currentUser.role !== 'admin') {
    return NextResponse.json({ status: 'error', message: '403 Forbidden' }, { status: 403 });
  }

  try {
    const { id } = await params;
    const userId = Number(id);

    if (userId === currentUser.userId) {
      return NextResponse.json(
        { status: 'error', message: 'Không thể xóa tài khoản của chính mình' },
        { status: 400 }
      );
    }

    await db.delete(users).where(eq(users.id, userId));

    return NextResponse.json({
      status: 'success',
      message: 'Xóa người dùng thành công',
    });
  } catch (error) {
    return NextResponse.json({ status: 'error', message: 'Lỗi xóa người dùng' }, { status: 500 });
  }
}
