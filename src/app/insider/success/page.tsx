import type { Metadata } from 'next';
import InsiderResult from '../InsiderResult';

export const metadata: Metadata = {
  title: 'Insider confirmed',
  description: 'Your GoodPick email subscription status.',
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
        description="The GoodPick Edit will no longer be sent to this address. You can join again whenever you want."
        detail="Email delivery stopped"
        primaryHref="/#newsletter"
        primaryLabel="Join again"
      />
    );
  }

  if (status === 'already-active') {
    return (
      <InsiderResult
        tone="success"
        eyebrow="Access already active"
        title="You’re already on the list."
        description="This email address was confirmed before, so there is nothing else you need to do. Your GoodPick Edit remains active."
        detail="No duplicate subscription created"
        primaryHref="/"
        primaryLabel="Browse the latest picks"
      />
    );
  }

  return (
    <InsiderResult
      tone="success"
      eyebrow="Confirmation complete"
      title="Welcome to the useful edit."
      description="Your email is confirmed. We’ll send a concise selection of worthwhile products, price drops and buying guidance."
      detail="First edit at the next scheduled send"
      primaryHref="/"
      primaryLabel="Explore GoodPick"
    />
  );
}
