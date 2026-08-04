import { redirect } from 'next/navigation';

interface ArticlePageProps {
  params: Promise<{ slug: string }>;
}

export default async function LegacyArticleRedirect({ params }: ArticlePageProps) {
  const { slug } = await params;
  redirect(`/article/${slug}`);
}

