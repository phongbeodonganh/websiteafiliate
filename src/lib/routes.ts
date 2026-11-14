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
  const category = categoryPath(input.categorySlug || FALLBACK_CATEGORY_SLUG);
  const article = segment(input.slug, '');
  return input.subCategorySlug
    ? `${category}/${segment(input.subCategorySlug, '')}/${article}`
    : `${category}/${article}`;
}
