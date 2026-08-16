import type { Metadata } from 'next';
import CollectionClient from '../collection-client';

export const metadata: Metadata = { title: 'Editorial Picks', description: 'Featured articles selected by our editors.' };

export default function EditorialPicksPage() {
  return <CollectionClient kind="editorial" />;
}
