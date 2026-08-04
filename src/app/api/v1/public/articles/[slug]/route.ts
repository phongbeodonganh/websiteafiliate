import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { ArticleModel } from '@/lib/db/models';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    await connectToDatabase();

    const article = await ArticleModel.findOne({ slug, status: 'published' }).populate('author_id', 'username name');

    if (!article) {
      return NextResponse.json(
        { status: 'error', message: 'Không tìm thấy bài viết' },
        { status: 404 }
      );
    }

    article.view_count += 1;
    await article.save();

    const doc = article.toObject();

    return NextResponse.json({
      status: 'success',
      data: {
        id: doc._id.toString(),
        title: doc.title,
        slug: doc.slug,
        content: doc.content,
        status: doc.status,
        viewCount: doc.view_count,
        metaTitle: doc.meta_title,
        metaDescription: doc.meta_description,
        thumbnailUrl: doc.thumbnail_url,
        createdAt: doc.created_at,
        updatedAt: doc.updated_at,
        author: (doc.author_id as any)?.name || (doc.author_id as any)?.username || 'Admin',
      },
    });
  } catch (error) {
    console.error('Public article detail API error:', error);
    return NextResponse.json(
      { status: 'error', message: 'Lỗi máy chủ khi lấy bài viết' },
      { status: 500 }
    );
  }
}
