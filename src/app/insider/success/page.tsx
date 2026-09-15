import type { Metadata } from 'next';
import InsiderResult from '../InsiderResult';

export const metadata: Metadata = {
  title: 'Insider confirmed',
  description: 'Your AIDEALSUK Insider email status.',
  robots: { index: false, follow: false },
};

type SuccessPageProps = {
  searchParams: Promise<{ status?: string | string[] }>;
};

export default async function InsiderSuccessPage({ searchParams }: SuccessPageProps) {
  const { status: rawStatus } = await searchParams;
  const status = typeof rawStatus === 'string' ? rawStatus : 'confirmed';

  if (status === 'unsubscribed') {
    return (
      <InsiderResult
        tone="success"
        eyebrow="Preference saved"
        title="You have been unsubscribed."
        description="Daily Insider dispatches will no longer be sent to this address. You can join again whenever you want."
        detail="Email delivery stopped"
        primaryHref="/#newsletter-section"
        primaryLabel="Join again"
      />
    );
  }

  if (status === 'already-active') {
    return (
      <InsiderResult
        tone="success"
        eyebrow="Access already active"
        title="You’re already an Insider."
        description="This email address was confirmed before, so there is nothing else you need to do. Your daily briefing remains active."
        detail="No duplicate subscription created"
        primaryHref="/"
        primaryLabel="Read today’s stories"
      />
    );
  }

  return (
    <InsiderResult
      tone="success"
      eyebrow="Confirmation complete"
      title="Welcome to the inside track."
      description="Your email is confirmed. We’ll send one concise daily summary of the latest and hottest stories, with a direct route back to AIDEALSUK."
      detail="First dispatch at the next scheduled run"
      primaryHref="/"
      primaryLabel="Explore AIDEALSUK"
    />
  );
}
