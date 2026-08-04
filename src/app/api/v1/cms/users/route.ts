import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, articles } from '@/lib/db/schema';
import { getAuthUser, hashPassword } from '@/lib/auth';
import { eq, desc } from 'drizzle-orm';

// GET /api/v1/cms/users - Danh sách nhân sự / cộng tác viên (Admin Only)
export async function GET(req: Request) {
  const currentUser = getAuthUser(req);
  if (!currentUser || currentUser.role !== 'admin') {
    return NextResponse.json(
      { status: 'error', message: '403 Forbidden - Chỉ Admin mới có quyền xem danh sách nhân sự' },
      { status: 403 }
    );
  }

  try {
    const userList = await db
      .select({
        id: users.id,
        username: users.username,
        role: users.role,
        name: users.name,
        status: users.status,
        avatar: users.avatar,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt));

    // Đếm số bài viết của từng user
    const allArticles = await db.select().from(articles);

    const dataWithArticleCounts = userList.map((u) => {
      const userArts = allArticles.filter((a) => a.authorId === u.id);
      return {
        ...u,
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

// POST /api/v1/cms/users - Thêm user / cộng tác viên mới (Admin Only)
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

    const existing = await db.select().from(users).where(eq(users.username, username)).get();
    if (existing) {
      return NextResponse.json(
        { status: 'error', message: 'Tên đăng nhập đã tồn tại trên hệ thống' },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(password);
    const avatar = name ? name[0].toUpperCase() : username[0].toUpperCase();

    const [newUser] = await db
      .insert(users)
      .values({
        username,
        passwordHash,
        role: role || 'editor',
        name: name || username,
        status: status || 'active',
        avatar,
      })
      .returning();

    return NextResponse.json(
      {
        status: 'success',
        data: {
          id: newUser.id,
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
