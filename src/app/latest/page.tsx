import type { Metadata } from 'next';
import CollectionClient from '../collection-client';
import StorefrontHeader from '@/components/storefront/StorefrontHeader';
import { createPageMetadata } from '@/lib/seo';

export const metadata: Metadata = createPageMetadata({ title: 'Latest Buying Guides', description: 'The newest product guides, comparisons and practical buying advice from GoodPick.', path: '/latest' });

export default function LatestPage() {
  return <CollectionClient kind="latest" header={<StorefrontHeader />} />;
}
