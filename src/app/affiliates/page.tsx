import type { Metadata } from 'next';
import CollectionClient from '../collection-client';

export const metadata: Metadata = { title: 'Affiliate Deals', description: 'Browse all affiliate partner deals.' };

export default function AffiliatesPage() {
  return <CollectionClient kind="affiliates" />;
}
