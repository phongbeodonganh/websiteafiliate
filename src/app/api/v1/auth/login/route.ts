import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { UserModel } from '@/lib/db/models';
import { verifyPassword, signToken } from '@/lib/auth';

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

    await connectToDatabase();
    const user = await UserModel.findOne({ username });

    if (!user) {
      return NextResponse.json(
        { status: 'error', message: 'Tên đăng nhập hoặc mật khẩu không đúng' },
        { status: 401 }
      );
    }

    if (user.status === 'inactive') {
      return NextResponse.json(
        { status: 'error', message: 'Tài khoản đã bị vô hiệu hóa' },
        { status: 403 }
      );
    }

    const isPasswordValid = await verifyPassword(password, user.password_hash);
    if (!isPasswordValid) {
      return NextResponse.json(
        { status: 'error', message: 'Tên đăng nhập hoặc mật khẩu không đúng' },
        { status: 401 }
      );
    }

    const tokenPayload = {
      userId: user._id.toString(),
      username: user.username,
      role: user.role,
    };
    const token = signToken(tokenPayload);

    return NextResponse.json({
      status: 'success',
      token,
      user: {
        id: user._id.toString(),
        username: user.username,
        role: user.role,
        name: user.name,
        avatar: user.avatar,
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
