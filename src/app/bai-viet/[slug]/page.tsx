import { permanentRedirect } from 'next/navigation';
import { legacyArticlePath } from '@/lib/routes';

interface ArticlePageProps {
  params: Promise<{ slug: string }>;
}

export default async function LegacyArticleRedirect({ params }: ArticlePageProps) {
  const { slug } = await params;
  permanentRedirect(legacyArticlePath(slug));
}

