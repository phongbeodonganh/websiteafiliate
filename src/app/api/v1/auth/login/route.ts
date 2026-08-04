import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { verifyPassword, signToken } from '@/lib/auth';
import { eq } from 'drizzle-orm';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { status: 'error', message: 'Vui lòng nhập đầy đủ username và password' },
        { status: 400 }
      );
    }

    // Tìm user theo username
    const user = await db.select().from(users).where(eq(users.username, username)).get();

    if (!user) {
      return NextResponse.json(
        { status: 'error', message: 'Tên đăng nhập hoặc mật khẩu không đúng' },
        { status: 401 }
      );
    }

    // Kiểm tra password
    const isPasswordValid = await verifyPassword(password, user.passwordHash);
    if (!isPasswordValid) {
      return NextResponse.json(
        { status: 'error', message: 'Tên đăng nhập hoặc mật khẩu không đúng' },
        { status: 401 }
      );
    }

    // Tạo JWT Token
    const tokenPayload = {
      userId: user.id,
      username: user.username,
      role: user.role,
    };
    const token = signToken(tokenPayload);

    return NextResponse.json({
      status: 'success',
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { status: 'error', message: 'Đã xảy ra lỗi máy chủ nội bộ' },
      { status: 500 }
    );
  }
}
