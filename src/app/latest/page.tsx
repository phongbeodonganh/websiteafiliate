import type { Metadata } from 'next';
import CollectionClient from '../collection-client';
import { createPageMetadata } from '@/lib/seo';

export const metadata: Metadata = createPageMetadata({ title: 'Latest Articles', description: 'The newest technology, finance and AI stories.', path: '/latest' });

export default function LatestPage() {
  return <CollectionClient kind="latest" />;
}
