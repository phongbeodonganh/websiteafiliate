// Shared by the upload modal (client) and storage.ts (server): turn any file name
// into an SEO-friendly slug — no diacritics, lowercase, hyphen-separated, no extension.
export function slugifyFileName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}
