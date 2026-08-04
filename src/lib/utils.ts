import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Chuyển chuỗi tiếng Việt thành slug chuẩn SEO
export function slugify(str: string): string {
  let slug = str.toLowerCase();
  slug = slug.replace(/á|à|ả|ã|ạ|ă|ắ|ằ|ẳ|ẵ|ặ|â|ấ|ầ|ẩ|ẫ|ậ/g, "a");
  slug = slug.replace(/é|è|ẻ|ẽ|ẹ|ê|ế|ề|ể|ễ|ệ/g, "e");
  slug = slug.replace(/i|í|ì|ỉ|ĩ|ị/g, "i");
  slug = slug.replace(/ó|ò|ỏ|õ|ọ|ô|ố|ồ|ổ|ỗ|ộ|ơ|ớ|ờ|ở|ỡ|ợ/g, "o");
  slug = slug.replace(/ú|ù|ủ|ũ|ụ|ư|ứ|ừ|ử|ữ|ự/g, "u");
  slug = slug.replace(/ý|ỳ|ỷ|ỹ|ỵ/g, "y");
  slug = slug.replace(/đ/g, "d");
  slug = slug.replace(/[^a-z0-9\s-]/g, "");
  slug = slug.replace(/\s+/g, "-");
  slug = slug.replace(/-+/g, "-");
  slug = slug.replace(/^-+|-+$/g, "");
  return slug;
}

// Tự động append sub_id / tracking parameters vào link Affiliate
export function appendSubId(baseUrl: string, subId: string): string {
  try {
    const url = new URL(baseUrl);
    // Nếu chưa có sub_id hoặc affiliate sub id parameter
    url.searchParams.set('sub_id', subId);
    url.searchParams.set('utm_source', 'affiliate_news');
    url.searchParams.set('utm_medium', 'content_cta');
    return url.toString();
  } catch {
    // Nếu URL không hợp lệ, nối chuỗi thủ công
    const separator = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${separator}sub_id=${encodeURIComponent(subId)}&utm_source=affiliate_news`;
  }
}

// Lấy IP từ Request
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }
  return '127.0.0.1';
}
