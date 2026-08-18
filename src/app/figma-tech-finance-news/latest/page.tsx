import type { Metadata } from 'next';
import CollectionClient from '../collection-client';

export const metadata: Metadata = { title: 'Latest Articles', description: 'The latest published articles.' };

export default function LatestArticlesPage() {
  return <CollectionClient kind="latest" />;
}
