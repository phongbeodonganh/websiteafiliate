import "server-only";

import { refreshHomepageArticlesCache } from "@/lib/homepage-articles";
import { refreshProductCache } from "@/lib/products/public";
import { refreshPublicTaxonomyCache } from "@/lib/public-data-cache";
import { refreshStorefrontCategoriesCache } from "@/lib/storefront-categories";
import { refreshStoreRecordsCache } from "@/lib/stores/public";

async function synchronize(label: string, refreshers: Array<() => Promise<unknown>>) {
  const results = await Promise.allSettled(refreshers.map((refresh) => refresh()));
  const failures = results.filter((result) => result.status === "rejected");
  if (failures.length > 0) {
    console.error(`[ram-cache] ${label}: ${failures.length} refresh(es) failed; stale entries were evicted`, failures);
  }
}

export function syncArticleRamCaches() {
  return synchronize("article write", [refreshHomepageArticlesCache, refreshPublicTaxonomyCache]);
}

export function syncTaxonomyRamCaches() {
  return synchronize("taxonomy write", [
    refreshPublicTaxonomyCache,
    refreshStorefrontCategoriesCache,
    refreshHomepageArticlesCache,
    refreshProductCache,
  ]);
}

export function syncProductRamCache() {
  return synchronize("product write", [refreshProductCache]);
}

export function syncStoreRamCache() {
  return synchronize("store write", [refreshStoreRecordsCache]);
}
