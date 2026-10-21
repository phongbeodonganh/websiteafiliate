import { isOfferActive, type StoreRecord } from "./types";

export type StoreFilters = { q?: string; category?: string; letter?: string; offer?: string; sort?: string };

export function storeOfferCounts(store: StoreRecord) {
  const active = store.offers.filter((offer) => isOfferActive(offer));
  return { total: active.length, codes: active.filter((offer) => offer.kind === "code").length, coupons: active.filter((offer) => offer.kind === "coupon").length };
}

export function comparePopularStores(a: StoreRecord, b: StoreRecord) {
  return (b.clickCount || 0) - (a.clickCount || 0)
    || (b.viewCount || 0) - (a.viewCount || 0)
    || storeOfferCounts(b).total - storeOfferCounts(a).total
    || a.sortOrder - b.sortOrder || a.name.localeCompare(b.name);
}

export function filterStoreDirectory(stores: StoreRecord[], filters: StoreFilters) {
  const query = filters.q?.trim().toLowerCase() || "";
  return stores.filter((store) => {
    const counts = storeOfferCounts(store);
    return store.status === "published"
      && (!query || `${store.name} ${store.description}`.toLowerCase().includes(query))
      && (!filters.category || store.categorySlug === filters.category)
      && (!filters.letter || (filters.letter === "#" ? /^\d/.test(store.name) : store.name.toUpperCase().startsWith(filters.letter)))
      && (filters.offer !== "codes" || counts.codes > 0)
      && (filters.offer !== "coupons" || counts.coupons > 0)
      && (filters.offer !== "active" || counts.total > 0);
  }).sort((a, b) => filters.sort === "name" ? a.name.localeCompare(b.name)
    : filters.sort === "offers" ? storeOfferCounts(b).total - storeOfferCounts(a).total || comparePopularStores(a, b)
    : comparePopularStores(a, b));
}

export function storeDirectoryHref(filters: StoreFilters) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value && !(key === "sort" && value === "popular") && !(key === "offer" && value === "all")) params.set(key, value);
  }
  return `/stores${params.size ? `?${params}` : ""}`;
}
