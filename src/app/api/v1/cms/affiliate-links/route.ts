import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { AffiliateLinkModel } from '@/lib/db/models';
import { getAuthUser } from '@/lib/auth';

export async function GET(req: Request) {
  const user = getAuthUser(req);
  if (!user) {
    return NextResponse.json({ status: 'error', message: 'Unauthorized - Vui lòng đăng nhập' }, { status: 401 });
  }

  try {
    await connectToDatabase();
    const rawLinks = await AffiliateLinkModel.find().sort({ created_at: -1 });

    const links = rawLinks.map((link) => {
      const doc = link.toObject();
      return {
        id: doc._id.toString(),
        name: doc.name,
        baseUrl: doc.base_url,
        base_url: doc.base_url,
        commission: doc.commission,
        cookie: doc.cookie,
        isTopPick: doc.is_top_pick,
        is_top_pick: doc.is_top_pick,
        createdAt: doc.created_at,
      };
    });

    return NextResponse.json({
      status: 'success',
      data: links,
    });
  } catch (error) {
    return NextResponse.json({ status: 'error', message: 'Lỗi lấy danh sách affiliate links' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const user = getAuthUser(req);
  if (!user || user.role !== 'admin') {
    return NextResponse.json(
      { status: 'error', message: '403 Forbidden - Chỉ Admin mới có quyền quản lý Link Affiliate' },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const { name, base_url, commission, cookie, is_top_pick, isTopPick } = body;

    if (!name || !base_url) {
      return NextResponse.json(
        { status: 'error', message: 'Vui lòng nhập Tên chiến dịch và Link gốc' },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const newLink = await AffiliateLinkModel.create({
      name,
      base_url,
      commission: commission || 'N/A',
      cookie: cookie || '30 ngày',
      is_top_pick: is_top_pick !== undefined ? is_top_pick : (isTopPick !== undefined ? isTopPick : false),
    });

    return NextResponse.json(
      {
        status: 'success',
        data: {
          id: newLink._id.toString(),
          name: newLink.name,
          baseUrl: newLink.base_url,
          base_url: newLink.base_url,
          commission: newLink.commission,
          cookie: newLink.cookie,
          isTopPick: newLink.is_top_pick,
          is_top_pick: newLink.is_top_pick,
          createdAt: newLink.created_at,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json({ status: 'error', message: 'Lỗi thêm mới affiliate link' }, { status: 500 });
  }
}
