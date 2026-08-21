import type { Metadata } from 'next';
import CollectionClient from '../collection-client';

export const metadata: Metadata = { title: 'Hottest Articles', description: 'The stories attracting the most readers right now.' };

export default function HottestPage() {
  return <CollectionClient kind="hottest" />;
}
