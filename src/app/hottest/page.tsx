import type { Metadata } from 'next';
import CollectionClient from '../collection-client';
import StorefrontHeader from '@/components/storefront/StorefrontHeader';
import { createPageMetadata } from '@/lib/seo';

export const metadata: Metadata = createPageMetadata({ title: 'Most-Read Buying Guides', description: 'The GoodPick product guides attracting the most readers right now.', path: '/hottest' });

export default function HottestPage() {
  return <CollectionClient kind="hottest" header={<StorefrontHeader />} />;
}
