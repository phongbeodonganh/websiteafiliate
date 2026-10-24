import { permanentRedirect } from 'next/navigation';

interface ArticlePageProps {
  params: Promise<{ slug: string }>;
}

export default async function LegacyArticleRedirect({ params }: ArticlePageProps) {
  const { slug } = await params;
  permanentRedirect(`/article/${slug}`);
}

