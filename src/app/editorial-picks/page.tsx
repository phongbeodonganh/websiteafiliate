import type { Metadata } from 'next';
import CollectionClient from '../collection-client';
import { createPageMetadata } from '@/lib/seo';

export const metadata: Metadata = createPageMetadata({ title: 'Editorial Picks', description: 'Featured reporting and analysis selected by our editors.', path: '/editorial-picks' });

export default function EditorialPicksPage() {
  return <CollectionClient kind="editorial" />;
}
