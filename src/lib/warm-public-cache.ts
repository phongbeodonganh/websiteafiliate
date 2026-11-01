import "server-only";

import { refreshHomepageArticlesCache } from "@/lib/homepage-articles";
import { refreshProductCache } from "@/lib/products/public";
import { refreshPublicSettingsCache, refreshPublicTaxonomyCache } from "@/lib/public-data-cache";
import { refreshStorefrontCategoriesCache } from "@/lib/storefront-categories";
import { refreshStoreRecordsCache } from "@/lib/stores/public";

export async function warmPublicRamCache() {
  const startedAt = Date.now();
  const results = await Promise.allSettled([
    refreshPublicSettingsCache(),
    refreshPublicTaxonomyCache(),
    refreshHomepageArticlesCache(),
    refreshStorefrontCategoriesCache(),
    refreshStoreRecordsCache(),
    refreshProductCache(),
  ]);

  const failed = results.filter((result) => result.status === "rejected");
  if (failed.length > 0) {
    console.error(`[ram-cache] warm-up completed with ${failed.length} failed dataset(s)`, failed);
  } else {
    console.info(`[ram-cache] warmed ${results.length} datasets in ${Date.now() - startedAt}ms`);
  }
}
