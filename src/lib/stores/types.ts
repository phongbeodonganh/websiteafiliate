export type StoreOffer = {
  id: string;
  kind: "code" | "coupon";
  title: string;
  description: string;
  saving: string;
  code: string;
  destination: string;
  terms: string;
  startsAt: string;
  expiresAt: string;
  checkedAt: string;
  active: boolean;
};

export type StoreRecord = {
  id: string;
  slug: string;
  name: string;
  description: string;
  categorySlug: string;
  destination: string;
  imageUrl: string;
  imageAlt: string;
  content: string;
  faqs: { question: string; answer: string }[];
  offers: StoreOffer[];
  status: "draft" | "published" | "archived";
  showOnHomepage: boolean;
  sortOrder: number;
  updatedAt?: string;
};

export function isOfferActive(offer: StoreOffer, now = Date.now()) {
  return offer.active
    && (!offer.startsAt || Date.parse(offer.startsAt) <= now)
    && (!offer.expiresAt || Date.parse(offer.expiresAt) > now);
}
