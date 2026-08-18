import "server-only";

import { unstable_cache } from "next/cache";
import { connectToDatabase } from "@/lib/db/mongodb";
import { ArticleModel } from "@/lib/db/models";

export type HomepageArticle = {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  content?: string;
  isFeatured: boolean;
  viewCount: number;
  thumbnailUrl?: string;
  createdAt: string;
  categoryName?: string | null;
  authorName?: string | null;
  authorAvatar?: string | null;
};

export type HomepageArticleData = {
  latest: HomepageArticle[];
  popular: HomepageArticle[];
  editorial: HomepageArticle[];
};

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function populatedValue(value: unknown, key: string) {
  if (!value || typeof value !== "object") return undefined;
  const field = (value as Record<string, unknown>)[key];
  return typeof field === "string" ? field : undefined;
}

async function findArticles(limit: number, tab?: "popular" | "hot", query?: string) {
  const filter: Record<string, unknown> = { status: "published" };

  if (tab === "hot") filter.is_featured = true;
  if (query) {
    const regex = new RegExp(escapeRegExp(query), "i");
    filter.$or = [{ title: regex }, { excerpt: regex }, { content: regex }];
  }

  const sort: Record<string, 1 | -1> = tab === "popular"
    ? { view_count: -1 }
    : { created_at: -1 };
  const articles = await ArticleModel.find(filter)
    .populate("author_id", "name avatar username")
    .populate("category_id", "name slug")
    .sort(sort)
    .limit(limit)
    .lean();

  return articles.map((doc): HomepageArticle => ({
    id: doc._id.toString(),
    title: doc.title,
    slug: doc.slug,
    excerpt: doc.excerpt || "",
    content: doc.content || "",
    isFeatured: Boolean(doc.is_featured),
    viewCount: Number(doc.view_count || 0),
    thumbnailUrl: doc.thumbnail_url || "",
    createdAt: doc.created_at ? new Date(doc.created_at).toISOString() : "",
    categoryName: populatedValue(doc.category_id, "name") || null,
    authorName:
      populatedValue(doc.author_id, "name") ||
      populatedValue(doc.author_id, "username") ||
      null,
    authorAvatar: populatedValue(doc.author_id, "avatar") || null,
  }));
}

async function loadHomepageArticles(query?: string): Promise<HomepageArticleData> {
  await connectToDatabase();
  const [latest, popular, editorial] = await Promise.all([
    findArticles(8, undefined, query),
    findArticles(2, "popular", query),
    findArticles(3, "hot", query),
  ]);

  return { latest, popular, editorial };
}

const getCachedHomepageArticles = unstable_cache(
  () => loadHomepageArticles(),
  ["homepage-public-articles"],
  { tags: ["public-articles"], revalidate: 60 },
);

export function getHomepageArticles(query = "") {
  const normalizedQuery = query.trim();
  return normalizedQuery
    ? loadHomepageArticles(normalizedQuery)
    : getCachedHomepageArticles();
}
