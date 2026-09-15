import { describe, expect, it } from 'vitest';
import {
  buildInsiderDigestEmail,
  getCurrentGmtPlus12Period,
  getPreviousGmtPlus12Period,
} from '@/lib/insider/digest';

describe('Insider daily digest', () => {
  it('selects the GMT+12 calendar day that just ended', () => {
    const period = getPreviousGmtPlus12Period(new Date('2026-08-31T12:00:00.000Z'));

    expect(period.dayKey).toBe('2026-08-31');
    expect(period.start.toISOString()).toBe('2026-08-30T12:00:00.000Z');
    expect(period.end.toISOString()).toBe('2026-08-31T12:00:00.000Z');
  });

  it('selects the current GMT+12 day up to now for a manual dispatch', () => {
    const period = getCurrentGmtPlus12Period(new Date('2026-08-31T10:30:00.000Z'));

    expect(period.dayKey).toBe('2026-08-31');
    expect(period.start.toISOString()).toBe('2026-08-30T12:00:00.000Z');
    expect(period.end.toISOString()).toBe('2026-08-31T10:30:00.000Z');
  });

  it('renders latest, hottest, website and unsubscribe links as safe HTML', () => {
    const email = buildInsiderDigestEmail({
      siteName: 'AIDEALSUK',
      siteUrl: 'https://aidealsuk.com',
      dayKey: '2026-08-31',
      latest: [{
        title: 'Latest <AI> story',
        slug: 'latest-ai-story',
        summary: 'A useful & concise summary.',
        viewCount: 5,
      }],
      hottest: [{
        title: 'Most read story',
        slug: 'most-read-story',
        summary: 'The hottest story today.',
        viewCount: 100,
      }],
      unsubscribeUrl: 'https://aidealsuk.com/api/v1/public/insider/unsubscribe?token=test',
    });

    expect(email.subject).toContain('2026-08-31');
    expect(email.html).toContain('Latest &lt;AI&gt; story');
    expect(email.html).not.toContain('Latest <AI> story');
    expect(email.html).toContain('/article/latest-ai-story');
    expect(email.html).toContain('/article/most-read-story');
    expect(email.html).toContain('Unsubscribe');
    expect(email.text).toContain('https://aidealsuk.com');
  });

  it('renders a hottest-only digest when there are no latest stories', () => {
    const email = buildInsiderDigestEmail({
      siteName: 'AIDEALSUK',
      siteUrl: 'https://aidealsuk.com',
      dayKey: '2026-08-31',
      latest: [],
      hottest: [{
        title: 'Still trending',
        slug: 'still-trending',
        summary: 'The most-read published story.',
        viewCount: 200,
      }],
      unsubscribeUrl: 'https://aidealsuk.com/unsubscribe',
    });

    expect(email.html).not.toContain('>Latest</p>');
    expect(email.html).toContain('>Hottest</p>');
    expect(email.html).toContain('Still trending');
    expect(email.text).not.toContain('LATEST\n');
    expect(email.text).toContain('HOTTEST\n');
  });
});
