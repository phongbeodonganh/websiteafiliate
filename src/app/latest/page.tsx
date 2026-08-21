import type { Metadata } from 'next';
import CollectionClient from '../collection-client';

export const metadata: Metadata = { title: 'Latest Articles', description: 'The newest technology, finance and AI stories.' };

export default function LatestPage() {
  return <CollectionClient kind="latest" />;
}
