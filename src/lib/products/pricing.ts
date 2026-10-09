/**
 * Pure pricing helpers (no DB / no mongoose) so they can run inside the
 * Product pre-validate hook, in API serializers and in unit tests alike.
 * All prices are USD, stored as decimal numbers (e.g. 199.99).
 */

export interface PricedOfferLike {
  price?: number | null;
  original_price?: number | null;
  status?: string;
  stock_status?: string;
  is_primary?: boolean;
  free_shipping?: boolean;
  sort_order?: number;
}

export interface ProductPriceSummary {
  price_min: number;
  price_max: number;
  original_price?: number;
  discount_percent: number;
}

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function isOfferPurchasable(offer: PricedOfferLike): boolean {
  return offer.status === 'active' && typeof offer.price === 'number' && offer.price > 0;
}

export function computeDiscountPercent(price?: number | null, original?: number | null): number {
  if (!price || !original || original <= price) return 0;
  return Math.round(((original - price) / original) * 100);
}

/**
 * Price range comes from active offers first; the manual product-level
 * `price`/`original_price` is the fallback when no offer is priced yet.
 */
export function computePriceSummary(
  offers: PricedOfferLike[],
  fallback: { price?: number | null; original_price?: number | null } = {}
): ProductPriceSummary {
  const live = offers.filter(isOfferPurchasable);

  if (live.length === 0) {
    const price = fallback.price && fallback.price > 0 ? roundMoney(fallback.price) : 0;
    const original =
      fallback.original_price && fallback.original_price > price ? roundMoney(fallback.original_price) : undefined;
    return {
      price_min: price,
      price_max: price,
      original_price: original,
      discount_percent: computeDiscountPercent(price, original),
    };
  }

  const prices = live.map((o) => o.price as number);
  const price_min = roundMoney(Math.min(...prices));
  const price_max = roundMoney(Math.max(...prices));

  // Discount is advertised against the cheapest offer's own strike-through price
  // (never mix one store's sale price with another store's list price).
  const cheapest = live.reduce((a, b) => ((a.price as number) <= (b.price as number) ? a : b));
  const original =
    cheapest.original_price && cheapest.original_price > (cheapest.price as number)
      ? roundMoney(cheapest.original_price)
      : fallback.original_price && fallback.original_price > price_min
        ? roundMoney(fallback.original_price)
        : undefined;

  return {
    price_min,
    price_max,
    original_price: original,
    discount_percent: computeDiscountPercent(price_min, original),
  };
}

/**
 * Exactly one primary offer. Keeps an explicit, still-active primary; otherwise
 * picks the cheapest in-stock active offer, then the cheapest active offer.
 * Returns the index of the primary offer, or -1 when there are no active offers.
 */
export function pickPrimaryOfferIndex(offers: PricedOfferLike[]): number {
  const explicit = offers.findIndex((o) => o.is_primary && isOfferPurchasable(o));
  if (explicit !== -1) return explicit;

  const rank = (o: PricedOfferLike) => (o.stock_status === 'out_of_stock' ? 1 : 0);
  let best = -1;
  offers.forEach((o, i) => {
    if (!isOfferPurchasable(o)) return;
    if (best === -1) {
      best = i;
      return;
    }
    const b = offers[best];
    if (rank(o) < rank(b) || (rank(o) === rank(b) && (o.price as number) < (b.price as number))) {
      best = i;
    }
  });
  return best;
}
