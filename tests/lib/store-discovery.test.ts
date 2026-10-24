import { describe, expect, it } from "vitest";
import { filterStoreDirectory, storeDirectoryHref, storeOfferCounts } from "@/lib/stores/discovery";
import { generateMetadata } from "@/app/stores/page";
import type { StoreRecord, StoreOffer } from "@/lib/stores/types";

const offer = (overrides: Partial<StoreOffer> = {}): StoreOffer => ({ id: "deal", kind: "coupon", title: "Deal", description: "", saving: "", code: "", destination: "", terms: "", startsAt: "", expiresAt: "", checkedAt: "", active: true, ...overrides });
const store = (name: string, overrides: Partial<StoreRecord> = {}): StoreRecord => ({ id: "", slug: name.toLowerCase(), name, description: "Everyday essentials", categorySlug: "tech", destination: "https://example.com/", imageUrl: "", imageAlt: "", content: "", faqs: [], offers: [], status: "published", showOnHomepage: true, sortOrder: 0, ...overrides });

describe("Public store discovery", () => {
  it("counts only currently active coupons and promo codes", () => {
    const record = store("Anker", { offers: [offer(), offer({ id: "code", kind: "code", code: "SAVE10" }), offer({ active: false }), offer({ expiresAt: new Date(Date.now() - 1000).toISOString() }), offer({ startsAt: new Date(Date.now() + 60000).toISOString() })] });
    expect(storeOfferCounts(record)).toEqual({ total: 2, codes: 1, coupons: 1 });
  });

  it("prioritizes actual affiliate clicks, then detail views, then active offers", () => {
    const records = [store("Many offers", { offers: [offer(), offer()] }), store("Most viewed", { viewCount: 100 }), store("Most clicked", { clickCount: 10 }), store("Archived", { status: "archived", clickCount: 999 })];
    expect(filterStoreDirectory(records, {}).map((item) => item.name)).toEqual(["Most clicked", "Most viewed", "Many offers"]);
    expect(records[0].name).toBe("Many offers");
  });

  it("combines category, search, letter and offer filters", () => {
    const records = [store("Anker", { offers: [offer({ kind: "code", code: "SAVE" })] }), store("Another", { categorySlug: "home", offers: [offer()] }), store("BeaverCraft", { offers: [offer()] })];
    expect(filterStoreDirectory(records, { q: "essentials", category: "tech", letter: "A", offer: "codes" }).map((item) => item.name)).toEqual(["Anker"]);
    expect(filterStoreDirectory(records, { offer: "coupons", sort: "name" }).map((item) => item.name)).toEqual(["Another", "BeaverCraft"]);
    expect(filterStoreDirectory(records, { q: "missing" })).toEqual([]);
  });

  it("sorts by active offers and supports stores beginning with numbers", () => {
    const records = [store("Anker"), store("3M", { offers: [offer()] })];
    expect(filterStoreDirectory(records, { sort: "offers" })[0].name).toBe("3M");
    expect(filterStoreDirectory(records, { letter: "#" }).map((item) => item.name)).toEqual(["3M"]);
  });

  it("preserves existing filters in alphabetical navigation and encodes query text", () => {
    const url = new URL(storeDirectoryHref({ q: "home & garden", category: "tech", offer: "codes", letter: "A", sort: "popular" }), "http://localhost");
    expect(Object.fromEntries(url.searchParams)).toEqual({ q: "home & garden", category: "tech", offer: "codes", letter: "A" });
    expect(storeDirectoryHref({ offer: "all", sort: "popular" })).toBe("/stores");
  });

  it("keeps the directory indexable and canonicalizes filtered results", async () => {
    const page = (params: Record<string, string | undefined>) => generateMetadata({ searchParams: Promise.resolve(params) });
    expect((await page({})).robots).toBeUndefined();
    for (const filters of [{ q: "Anker" }, { category: "tech" }, { offer: "codes" }, { letter: "A" }, { sort: "offers" }]) {
      const metadata = await page(filters);
      expect(metadata.robots).toEqual({ index: false, follow: true });
      expect(metadata.alternates?.canonical).toBe("/stores");
    }
  });
});
