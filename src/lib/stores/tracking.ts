export function storeRedirectHref(slug: string, offerId?: string) {
  const params = new URLSearchParams({ store: slug });
  if (offerId) params.set("offer", offerId);
  return `/api/v1/public/stores/redirect?${params}`;
}
