import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { UserModel, ArticleModel } from '@/lib/db/models';
import { getAuthUser, hashPassword } from '@/lib/auth';

export async function GET(req: Request) {
  const currentUser = getAuthUser(req);
  if (!currentUser || currentUser.role !== 'admin') {
    return NextResponse.json(
      { status: 'error', message: '403 Forbidden - Chỉ Admin mới có quyền xem danh sách nhân sự' },
      { status: 403 }
    );
  }

  try {
    await connectToDatabase();
    const rawUsers = await UserModel.find().sort({ created_at: -1 });
    const allArticles = await ArticleModel.find({}, 'author_id status');

    const dataWithArticleCounts = rawUsers.map((u) => {
      const uDoc = u.toObject();
      const userArts = allArticles.filter((a) => a.author_id.toString() === uDoc._id.toString());
      return {
        id: uDoc._id.toString(),
        username: uDoc.username,
        role: uDoc.role,
        name: uDoc.name,
        status: uDoc.status,
        avatar: uDoc.avatar,
        createdAt: uDoc.created_at,
        totalArticles: userArts.length,
        publishedArticles: userArts.filter((a) => a.status === 'published').length,
      };
    });

    return NextResponse.json({
      status: 'success',
      data: dataWithArticleCounts,
    });
  } catch (error) {
    return NextResponse.json({ status: 'error', message: 'Lỗi lấy danh sách nhân sự' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const currentUser = getAuthUser(req);
  if (!currentUser || currentUser.role !== 'admin') {
    return NextResponse.json(
      { status: 'error', message: '403 Forbidden - Chỉ Admin mới có quyền thêm nhân sự' },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const { username, password, name, role, status } = body;

    if (!username || !password) {
      return NextResponse.json(
        { status: 'error', message: 'Username và Password là bắt buộc' },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const existing = await UserModel.findOne({ username });
    if (existing) {
      return NextResponse.json(
        { status: 'error', message: 'Tên đăng nhập đã tồn tại trên hệ thống' },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(password);
    const avatar = name ? name[0].toUpperCase() : username[0].toUpperCase();

    const newUser = await UserModel.create({
      username,
      password_hash: passwordHash,
      role: role || 'editor',
      name: name || username,
      status: status || 'active',
      avatar,
    });

    return NextResponse.json(
      {
        status: 'success',
        data: {
          id: newUser._id.toString(),
          username: newUser.username,
          role: newUser.role,
          name: newUser.name,
          status: newUser.status,
          avatar: newUser.avatar,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json({ status: 'error', message: 'Lỗi tạo nhân sự mới' }, { status: 500 });
  }
}
