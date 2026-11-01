import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import InsiderResult from '../InsiderResult';
import { isInsiderEnabled } from '@/lib/insider/feature';

export const metadata: Metadata = {
  title: 'Insider confirmation failed',
  description: 'This TheHavenDeals subscription link could not be confirmed.',
  robots: { index: false, follow: false },
};

export default function InsiderFailedPage() {
  if (!isInsiderEnabled()) notFound();

  return (
    <InsiderResult
      tone="failed"
      eyebrow="Confirmation incomplete"
      title="This link could not be confirmed."
      description="The confirmation link may be invalid, expired, or replaced by a newer email. Request a fresh link and try again."
      detail="No subscription change was made"
      primaryHref="/#newsletter"
      primaryLabel="Request a new link"
    />
  );
}
