import type { Metadata } from 'next';
import InsiderResult from '../InsiderResult';

export const metadata: Metadata = {
  title: 'Insider confirmation failed',
  description: 'This AIDEALSUK Insider link could not be confirmed.',
  robots: { index: false, follow: false },
};

export default function InsiderFailedPage() {
  return (
    <InsiderResult
      tone="failed"
      eyebrow="Confirmation incomplete"
      title="This link could not be confirmed."
      description="The confirmation link may be invalid, expired, or replaced by a newer email. Request a fresh link and try again."
      detail="No subscription change was made"
      primaryHref="/#newsletter-section"
      primaryLabel="Request a new link"
    />
  );
}
