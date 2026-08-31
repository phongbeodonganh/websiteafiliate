import type { Metadata } from 'next';
import CollectionClient from '../collection-client';
import { createPageMetadata } from '@/lib/seo';

export const metadata: Metadata = createPageMetadata({ title: 'Affiliate Deals', description: 'Browse all affiliate partner deals.', path: '/affiliates' });

export default function AffiliatesPage() {
  return <CollectionClient kind="affiliates" />;
}
