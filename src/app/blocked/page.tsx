import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { ShieldAlert } from 'lucide-react';
import { connectToDatabase } from '@/lib/db/mongodb';
import { AffiliateLinkModel, ClickLogModel } from '@/lib/db/models';
import { checkUrlAgainstBlacklist } from '@/lib/blacklist';
import { isValidObjectId } from '@/lib/utils';
import { BRAND_NAME } from '@/lib/brand';

export const metadata: Metadata = {
  title: 'Link blocked for your safety',
  robots: { index: false, follow: false },
};

// DB-backed per-request page: every render re-resolves current blacklist state.
export const dynamic = 'force-dynamic';

// English default per the UI-SPEC planner note (PROJECT.md constraint #8:
// public site content is English). Blacklist-supplied data values themselves
// always render verbatim — this fallback only applies when the DB reason is empty.
const DEFAULT_BLOCK_REASON =
  'Flagged by the AIDEALSUK safety review — fraud or unpaid commissions.';

type BlockedPageProps = {
  searchParams: Promise<{ ref?: string | string[] }>;
};

type BlockedData = {
  projectName: string;
  reason: string;
  blockedCountries: string[];
};

/**
 * Re-resolve current blacklist state for a click log (D-10). Returns null when
 * the log/link is gone or the link is no longer blacklisted (race-tolerant).
 * Throws on DB failure — the caller renders fail-closed instead.
 */
async function resolveBlockedData(ref: string): Promise<BlockedData | null> {
  await connectToDatabase();

  const log = await ClickLogModel.findById(ref);
  const link = log?.affiliate_link_id
    ? await AffiliateLinkModel.findById(log.affiliate_link_id)
    : null;
  if (!link) {
    return null;
  }

  const check = await checkUrlAgainstBlacklist(link.base_url);
  const blocked = link.status === 'blacklisted' || check.isBlacklisted;
  if (!blocked) {
    return null;
  }

  return {
    projectName: check.projectName || link.name,
    reason: check.reason || DEFAULT_BLOCK_REASON,
    blockedCountries: check.blockedCountries ?? [],
  };
}

export default async function BlockedPage({ searchParams }: BlockedPageProps) {
  const { ref } = await searchParams;

  // D-10: the only URL-borne value is a single 24-hex ObjectId. Missing,
  // repeated (array-valued), or malformed refs bounce home BEFORE any DB call.
  if (typeof ref !== 'string' || !isValidObjectId(ref)) {
    redirect('/');
  }

  let data: BlockedData | null = null;
  let resolutionFailed = false;
  try {
    data = await resolveBlockedData(ref);
  } catch (error) {
    // Fail closed (T-1-03/T-1-04): a DB failure after a valid ref is accepted
    // renders the generic blocked copy — never a crash screen, never a bounce
    // to the offer, never internal error text.
    console.error('Blocked page resolution error:', error);
    resolutionFailed = true;
  }

  if (!resolutionFailed && !data) {
    // Unknown ref, deleted log/link, or the link is no longer blacklisted
    // (race-tolerant re-resolution) → home. No empty state ever renders.
    redirect('/');
  }

  const projectName = data?.projectName ?? 'Unavailable';
  const reason = data?.reason ?? DEFAULT_BLOCK_REASON;
  const blockedCountries = data?.blockedCountries ?? [];

  return (
    <main className="relative isolate grid min-h-svh place-items-center overflow-hidden bg-[var(--editorial-canvas)] p-4 text-[var(--editorial-ink)] sm:p-8">
      {/* Quiet print-inspired backdrop grid (InsiderResult precedent) */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10"
        style={{
          backgroundImage:
            'linear-gradient(rgba(17, 17, 17, 0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(17, 17, 17, 0.045) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          maskImage: 'linear-gradient(to bottom, black, transparent 88%)',
        }}
      />

      <section
        aria-labelledby="blocked-title"
        className="w-full max-w-[720px] border border-[var(--editorial-divider)] bg-[var(--editorial-surface)] shadow-[8px_8px_0_rgba(17,17,17,0.07)] sm:shadow-[18px_18px_0_rgba(17,17,17,0.07)]"
      >
        {/* Masthead */}
        <header className="flex items-center justify-between gap-4 border-b border-[var(--editorial-divider)] p-6">
          <a
            href="/"
            aria-label={`${BRAND_NAME} home`}
            className="text-lg font-extrabold tracking-[-0.04em] text-[var(--editorial-ink)] no-underline focus-visible:[outline:3px_solid_#B91C1C] focus-visible:[outline-offset:3px]"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            {BRAND_NAME}
          </a>
          <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--editorial-muted)]">
            Security Notice
          </span>
        </header>

        <div className="flex flex-col items-center px-6 py-12 text-center sm:px-8">
          {/* Status mark — the page's only saturated element (focal point) */}
          <div
            aria-hidden="true"
            className="grid h-[68px] w-[68px] place-items-center border border-[rgba(185,28,28,0.45)] bg-[rgba(185,28,28,0.08)] text-[#B91C1C] sm:h-[88px] sm:w-[88px]"
          >
            <ShieldAlert aria-hidden="true" className="h-9 w-9 sm:h-11 sm:w-11" strokeWidth={1.7} />
          </div>

          <p className="mt-6 text-xs font-extrabold uppercase tracking-[0.16em] text-[#B91C1C]">
            Link blocked
          </p>
          <h1
            id="blocked-title"
            className="mt-3 max-w-[680px] text-[28px] font-extrabold leading-[1.2] text-[var(--editorial-ink)] sm:text-[32px]"
          >
            We blocked this link to protect you
          </h1>
          <p className="mt-4 max-w-[620px] text-base leading-[1.5] text-[var(--editorial-copy)]">
            {data ? (
              <>
                The destination project{' '}
                <strong className="text-[var(--editorial-ink)]">{projectName}</strong> was disabled
                by {BRAND_NAME}&apos;s blacklist protection, so this link can no longer be opened.
              </>
            ) : (
              <>We couldn&apos;t verify this destination, so it has been blocked as a precaution.</>
            )}
          </p>

          {/* Receipt — labels are fixed copy (uppercase); values are data and
              render verbatim, never re-cased or truncated (overflow-wrap anywhere) */}
          <dl className="mt-8 w-full border-y border-[var(--editorial-divider)] text-left">
            <div className="grid grid-cols-[112px_minmax(0,1fr)] border-b border-[var(--editorial-divider)]">
              <dt className="py-3 text-xs font-extrabold uppercase tracking-[0.12em] text-[var(--editorial-muted)]">
                Project
              </dt>
              <dd className="py-3 text-sm font-extrabold leading-[1.4] text-[var(--editorial-ink)] [overflow-wrap:anywhere]">
                {projectName}
              </dd>
            </div>
            <div className="grid grid-cols-[112px_minmax(0,1fr)]">
              <dt className="py-3 text-xs font-extrabold uppercase tracking-[0.12em] text-[var(--editorial-muted)]">
                Block reason
              </dt>
              <dd className="py-3 text-sm font-extrabold leading-[1.4] text-[var(--editorial-ink)] [overflow-wrap:anywhere]">
                {reason}
              </dd>
            </div>
            {blockedCountries.length > 0 ? (
              <div className="grid grid-cols-[112px_minmax(0,1fr)] border-t border-[var(--editorial-divider)]">
                <dt className="py-3 text-xs font-extrabold uppercase tracking-[0.12em] text-[var(--editorial-muted)]">
                  Blocked countries
                </dt>
                <dd className="py-3 text-sm font-extrabold leading-[1.4] text-[var(--editorial-ink)] [overflow-wrap:anywhere]">
                  {blockedCountries.join(', ')}
                </dd>
              </div>
            ) : null}
          </dl>

          {/* Primary CTA — hover-lift per site convention, disabled under
              prefers-reduced-motion; focus ring in accent red */}
          <a
            href="/"
            className="mt-12 inline-flex min-h-[48px] w-full items-center justify-center gap-2 bg-[var(--editorial-ink)] px-8 text-xs font-extrabold uppercase tracking-[0.08em] text-white no-underline transition-transform duration-200 hover:-translate-y-0.5 focus-visible:[outline:3px_solid_#B91C1C] focus-visible:[outline-offset:3px] motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:w-auto"
          >
            Return to the safe homepage
          </a>
        </div>

        {/* Footer strip */}
        <footer className="flex items-center justify-between gap-4 border-t border-[var(--editorial-divider)] p-6">
          <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--editorial-muted)]">
            {BRAND_NAME} / SECURITY
          </span>
          <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#B91C1C]">
            Link disabled
          </span>
        </footer>
      </section>
    </main>
  );
}
