import type { Metadata } from 'next';
import CollectionClient from '../collection-client';
import { createPageMetadata } from '@/lib/seo';

export const metadata: Metadata = createPageMetadata({ title: 'Hottest Articles', description: 'The stories attracting the most readers right now.', path: '/hottest' });

export default function HottestPage() {
  return <CollectionClient kind="hottest" />;
}
