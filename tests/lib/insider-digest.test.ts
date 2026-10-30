import { describe, expect, it } from 'vitest';
import {
  buildInsiderDigestEmail,
  getCurrentGmtPlus12Period,
  getPreviousGmtPlus12Period,
} from '@/lib/insider/digest';

describe('TheHavenDeals product digest', () => {
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

  it('renders products, coupons, prices and links as safe HTML', () => {
    const email = buildInsiderDigestEmail({
      siteName: 'TheHavenDeals',
      siteUrl: 'https://thehavendeals.com',
      dayKey: '2026-08-31',
      deals: [{
        name: 'Deal <Camera>',
        slug: 'deal-camera',
        shortDescription: 'A useful & compact camera.',
        price: 79.99,
        originalPrice: 99.99,
        discountPercent: 20,
      }],
      newest: [{
        name: 'Newest product',
        slug: 'newest-product',
        shortDescription: 'Freshly published.',
        price: 25,
        discountPercent: 0,
      }],
      coupons: [{
        storeName: 'Example & Co',
        storeSlug: 'example-store',
        title: 'Save <20%> today',
        description: 'Selected products only.',
        saving: '20% off',
        code: 'SAVE20',
      }],
      unsubscribeUrl: 'https://thehavendeals.com/api/v1/public/insider/unsubscribe?token=test',
    });

    expect(email.subject).toBe('TheHavenDeals Daily Edit — 2026-08-31');
    expect(email.html).toContain('Deal &lt;Camera&gt;');
    expect(email.html).not.toContain('Deal <Camera>');
    expect(email.html).toContain('/products/deal-camera');
    expect(email.html).toContain('/products/newest-product');
    expect(email.html).toContain('/store/example-store');
    expect(email.html).toContain('SAVE20');
    expect(email.html).toContain('$79.99');
    expect(email.html).toContain('Unsubscribe');
    expect(email.text).toContain('https://thehavendeals.com');
  });

  it('omits empty product sections while retaining coupon deals', () => {
    const email = buildInsiderDigestEmail({
      siteName: 'TheHavenDeals',
      siteUrl: 'https://thehavendeals.com',
      dayKey: '2026-08-31',
      deals: [],
      newest: [],
      coupons: [{
        storeName: 'Coupon Store',
        storeSlug: 'coupon-store',
        title: 'A live coupon',
        description: 'Valid while active.',
        saving: '15% off',
        code: 'LIVE15',
      }],
      unsubscribeUrl: 'https://thehavendeals.com/unsubscribe',
    });

    expect(email.html).not.toContain('>Top 10 product deals</h2>');
    expect(email.html).not.toContain('>Fresh on the shelf</h2>');
    expect(email.html).toContain('>Top 10 coupon deals</h2>');
    expect(email.html).toContain('A live coupon');
    expect(email.text).not.toContain('Product price drops\n');
    expect(email.text).toContain('Current store offers\n');
  });
});
