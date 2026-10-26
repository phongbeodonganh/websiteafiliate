import { isOfferActive, type StoreRecord } from "../stores/types";

export type HomepageDeal = {
  id: string; offerId: string; storeSlug: string; storeName: string;
  storeImageUrl: string; storeImageAlt: string;
  categorySlug: string; title: string; description: string; saving: string;
  code: string; kind: "code" | "coupon"; terms: string;
  startsAt: string; expiresAt: string; checkedAt: string; active: boolean;
  popularity: number; updatedAt: string;
};
export type DealFilters = { q?: string; category?: string; kind?: string; sort?: string };

export function collectHomepageDeals(stores: StoreRecord[], now = Date.now()): HomepageDeal[] {
  return stores.filter((store) => store.status === "published").flatMap((store) =>
    store.offers.filter((offer) => isOfferActive(offer, now)).map((offer) => ({
      id: `${store.slug}:${offer.id}`, offerId: offer.id, storeSlug: store.slug, storeName: store.name,
      storeImageUrl: store.imageUrl, storeImageAlt: store.imageAlt,
      categorySlug: store.categorySlug, title: offer.title, description: offer.description,
      saving: offer.saving, code: offer.kind === "code" ? offer.code : "", kind: offer.kind,
      terms: offer.terms, startsAt: offer.startsAt, expiresAt: offer.expiresAt,
      checkedAt: offer.checkedAt, active: offer.active, popularity: store.clickCount || 0,
      updatedAt: store.updatedAt || "",
    })));
}
const timestamp = (value: string) => Date.parse(value) || 0;
export function filterHomepageDeals(deals: HomepageDeal[], filters: DealFilters, now = Date.now()) {
  const query = filters.q?.trim().toLowerCase() || "";
  return deals.filter((deal) => isOfferActive(deal, now)
    && (!query || `${deal.storeName} ${deal.title} ${deal.description} ${deal.code}`.toLowerCase().includes(query))
    && (!filters.category || deal.categorySlug === filters.category)
    && (!filters.kind || deal.kind === filters.kind)
  ).sort((a, b) => {
    if (filters.sort === "popular") return b.popularity - a.popularity || a.storeName.localeCompare(b.storeName);
    if (filters.sort === "ending") return (timestamp(a.expiresAt) || Infinity) - (timestamp(b.expiresAt) || Infinity) || a.id.localeCompare(b.id);
    return timestamp(b.checkedAt || b.updatedAt) - timestamp(a.checkedAt || a.updatedAt) || a.id.localeCompare(b.id);
  });
}

/** Deal one offer per merchant each round, retaining the selected order within stores. */
export function interleaveStoreDeals(deals: HomepageDeal[]): HomepageDeal[] {
  const stores = new Map<string, HomepageDeal[]>();
  for (const deal of deals) {
    const offers = stores.get(deal.storeSlug) ?? [];
    offers.push(deal);
    stores.set(deal.storeSlug, offers);
  }
  const result: HomepageDeal[] = [];
  const groups = [...stores.values()];
  const rounds = Math.max(0, ...groups.map(group => group.length));
  for (let round = 0; round < rounds; round++) {
    for (const group of groups) if (group[round]) result.push(group[round]);
  }
  return result;
}
