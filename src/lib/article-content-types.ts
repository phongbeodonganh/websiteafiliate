export const ARTICLE_CONTENT_TYPES = [
  { value: 'review', label: 'Review' },
  { value: 'case_study', label: 'Case Study' },
  { value: 'guide', label: 'Guide' },
] as const;

export type ArticleContentType = typeof ARTICLE_CONTENT_TYPES[number]['value'];

export function isArticleContentType(value: unknown): value is ArticleContentType {
  return ARTICLE_CONTENT_TYPES.some((type) => type.value === value);
}

export function articleContentTypeLabel(value: unknown): string {
  return ARTICLE_CONTENT_TYPES.find((type) => type.value === value)?.label || 'Untagged';
}
