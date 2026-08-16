import type { Metadata } from 'next';
import CollectionClient from '../collection-client';

export const metadata: Metadata = { title: 'Hottest Articles', description: 'The most-read articles right now.' };

export default function HottestArticlesPage() {
  return <CollectionClient kind="hottest" />;
}
