export const FALLBACK_CATEGORY_SLUG = 'uncategorized';

function segment(value: string | null | undefined, fallback: string) {
  const normalized = value?.trim().replace(/^\/+|\/+$/g, '');
  return encodeURIComponent(normalized || fallback);
}

export function categoryPath(categorySlug: string) {
  return `/${segment(categorySlug, FALLBACK_CATEGORY_SLUG)}`;
}

export function subCategoryPath(categorySlug: string, subCategorySlug: string) {
  return `${categoryPath(categorySlug)}/${segment(subCategorySlug, '')}`;
}

export function articlePath(input: {
  slug: string;
  categorySlug?: string | null;
  subCategorySlug?: string | null;
}) {
  return `/article/${segment(input.slug, '')}`;
}
