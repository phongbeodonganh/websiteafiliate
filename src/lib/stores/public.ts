import "server-only";
import { cache } from "react";
import { connectToDatabase } from "@/lib/db/mongodb";
import { StoreModel } from "@/lib/db/store-models";
import { MARKETPLACE_STORES, getDealsForStore, getStore, type MarketplaceStore, type MarketplaceDeal } from "@/lib/marketplace";
import { isOfferActive, type StoreRecord } from "./types";

// Keep existing stores and coupons until an admin saves a managed replacement.
// Reads do not seed or mutate the database.
export function legacyStoreRecords(): StoreRecord[] {
  return MARKETPLACE_STORES.map((store, index) => ({
    id: "", slug: store.slug, name: store.name, description: store.description,
    categorySlug: store.categorySlug, destination: store.destination,
    imageUrl: "", imageAlt: "", content: "", faqs: [],
    offers: getDealsForStore(store.slug).map((deal) => ({
      id: deal.id, kind: deal.code ? "code" as const : "coupon" as const,
      title: deal.title, description: deal.description, saving: deal.saving,
      code: deal.code || "", destination: "", terms: "", startsAt: "", expiresAt: "",
      checkedAt: deal.retestedAt ? new Date(`${deal.retestedAt} 00:00:00 GMT`).toISOString() : "", active: true,
    })),
    status: "published", showOnHomepage: true, sortOrder: index,
  }));
}

export const getStoreRecords = cache(async (): Promise<StoreRecord[]> => {
  await connectToDatabase();
  const docs = await StoreModel.find().sort({ sortOrder: 1, name: 1 }).lean();
  const records: StoreRecord[] = docs.map((doc) => ({
    id: doc._id.toString(), slug: doc.slug, name: doc.name, description: doc.description,
    categorySlug: doc.categorySlug, destination: doc.destination, imageUrl: doc.imageUrl,
    imageAlt: doc.imageAlt, content: doc.content, faqs: doc.faqs, offers: doc.offers,
    status: doc.status, showOnHomepage: doc.showOnHomepage, sortOrder: doc.sortOrder,
    updatedAt: doc.updatedAt.toISOString(),
  }));
  const managed = new Set(records.map((store) => store.slug));
  return [...records, ...legacyStoreRecords().filter((store) => !managed.has(store.slug))]
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
});

export async function getPublishedStores() {
  try {
    const now = Date.now();
    return (await getStoreRecords()).filter((store) => store.status === "published")
      .map((store) => ({ ...store, offers: store.offers.filter((offer) => isOfferActive(offer, now)) }));
  } catch {
    // Never resurrect archived legacy stores when the database is unavailable.
    return [];
  }
}

// Existing coupon search/category surfaces use the same publication and expiry
// rules as store pages, while retaining their original card presentation.
export async function getStoreCatalogue(): Promise<{ stores: MarketplaceStore[]; deals: MarketplaceDeal[] }> {
  const records = await getPublishedStores();
  const date = (value: string) => new Date(value).toLocaleDateString("en-GB", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" });
  return {
    stores: records.map((store) => ({
      slug: store.slug, name: store.name, description: store.description, categorySlug: store.categorySlug,
      destination: store.destination, initials: getStore(store.slug)?.initials || store.name.slice(0, 2).toUpperCase(),
      accent: getStore(store.slug)?.accent || "#0d766e", offerCount: store.offers.length, managed: !!store.id,
    })),
    deals: records.flatMap((store) => !store.id ? getDealsForStore(store.slug) : store.offers.map((offer) => ({
      id: `${store.slug}-${offer.id}`, storeSlug: store.slug, categorySlug: store.categorySlug,
      title: offer.title, description: offer.description, saving: offer.saving,
      code: offer.kind === "code" ? offer.code : undefined, automatic: offer.kind === "coupon",
      imageUrl: store.imageUrl || undefined, imageAlt: store.imageAlt || undefined,
      destination: offer.destination || store.destination, terms: offer.terms, expiresAt: offer.expiresAt,
      publishedAt: store.updatedAt ? date(store.updatedAt) : "", retestedAt: offer.checkedAt ? date(offer.checkedAt) : undefined,
    }))),
  };
}
