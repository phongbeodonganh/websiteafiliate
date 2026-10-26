import { describe, expect, it } from "vitest";
import { collectHomepageDeals, filterHomepageDeals, interleaveStoreDeals } from "../../src/lib/homepage/deals";
import type { StoreRecord, StoreOffer } from "../../src/lib/stores/types";
const now = Date.parse("2026-10-23T10:00:00Z");
const offer = (overrides: Partial<StoreOffer> = {}): StoreOffer => ({ id: "offer", kind: "code", title: "Save on desk lamps", description: "Selected lights", saving: "10% off", code: "LIGHT10", destination: "https://example.com", terms: "", startsAt: "", expiresAt: "", checkedAt: "", active: true, ...overrides });
const store = (overrides: Partial<StoreRecord> = {}): StoreRecord => ({ id: "store", slug: "lamps", name: "Lamp store", description: "", categorySlug: "tech", destination: "https://example.com", imageUrl: "", imageAlt: "", content: "", faqs: [], offers: [offer()], status: "published", showOnHomepage: true, sortOrder: 0, ...overrides });
describe("homepage deal discovery", () => {
  it("excludes drafts, inactive offers, future starts and expired offers, including the expiry boundary", () => {
    const deals = collectHomepageDeals([store({ offers: [offer(), offer({ id: "off", active: false }), offer({ id: "future", startsAt: "2026-10-24T00:00:00Z" }), offer({ id: "expired", expiresAt: new Date(now).toISOString() })] }), store({ slug: "draft", status: "draft" })], now);
    expect(deals.map(deal => deal.id)).toEqual(["lamps:offer"]);
  });
  it("searches offer text and coupon codes as well as store names, with category and type filters", () => {
    const deals = collectHomepageDeals([store(), store({ slug: "other", categorySlug: "home", offers: [offer({ kind: "coupon", code: "" })] })], now);
    expect(filterHomepageDeals(deals, { q: " light10 ", category: "tech", kind: "code" }, now)).toHaveLength(1);
    expect(filterHomepageDeals(deals, { q: "desk lamps", kind: "coupon" }, now).map(d => d.storeSlug)).toEqual(["other"]);
    expect(filterHomepageDeals(deals, { q: "no-such-offer" }, now)).toEqual([]);
  });
  it("orders known expiry dates first and uses click metrics for popularity", () => {
    const deals = collectHomepageDeals([store(), store({ slug: "ending", clickCount: 5, offers: [offer({ expiresAt: "2026-10-24T00:00:00Z" })] })], now);
    expect(filterHomepageDeals(deals, { sort: "ending" }, now)[0].storeSlug).toBe("ending");
    expect(filterHomepageDeals(deals, { sort: "popular" }, now)[0].storeSlug).toBe("ending");
  });
  it("rechecks expiry after initial rendering and sorts dated checks before undated offers", () => {
    const deals = collectHomepageDeals([store(), store({ slug: "checked", offers: [offer({ checkedAt: "2026-10-22T00:00:00Z", expiresAt: "2026-10-24T00:00:00Z" })] })], now);
    expect(filterHomepageDeals(deals, {}, now)[0].storeSlug).toBe("checked");
    expect(filterHomepageDeals(deals, {}, Date.parse("2026-10-25T00:00:00Z")).map(d=>d.storeSlug)).toEqual(["lamps"]);
  });
});


describe("store variety on the homepage", () => {
  it("interleaves uneven merchant groups without losing offers or changing their order within a store", () => {
    const deals = collectHomepageDeals([
      store({ offers: [offer({ id: "a1" }), offer({ id: "a2" }), offer({ id: "a3" })] }),
      store({ slug: "second", offers: [offer({ id: "b1" }), offer({ id: "b2" })] }),
      store({ slug: "third", offers: [offer({ id: "c1" })] }),
    ], now);
    const mixed = interleaveStoreDeals(deals);
    expect(mixed.map(item => item.offerId)).toEqual(["a1", "b1", "c1", "a2", "b2", "a3"]);
    expect(deals.map(item => item.offerId)).toEqual(["a1", "a2", "a3", "b1", "b2", "c1"]);
  });
  it("supports an empty result and a single store", () => {
    expect(interleaveStoreDeals([])).toEqual([]);
    const deals = collectHomepageDeals([store()], now);
    expect(interleaveStoreDeals(deals)).toEqual(deals);
  });
});
