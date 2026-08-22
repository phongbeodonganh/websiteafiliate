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

// Sinh trước 1 Mongo ObjectId hợp lệ ở client, dùng làm article_id cho các
// link/nút affiliate chèn vào bài trước khi bài được lưu lần đầu. Nếu bài
// không được lưu, id này không tồn tại ở đâu khác nên tự bị bỏ qua.
export function generateObjectId(): string {
  const timestamp = Math.floor(Date.now() / 1000)
    .toString(16)
    .padStart(8, '0');
  const random = Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  return (timestamp + random).slice(0, 24);
}

export function isValidObjectId(id: string): boolean {
  return /^[0-9a-fA-F]{24}$/.test(id);
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

// Trích xuất số % hoa hồng từ chuỗi commission (ví dụ "30% recurring" -> 30)
export function parseCommissionRate(commission?: string): number {
  if (!commission) return 0;
  const percentMatch = commission.match(/(\d+(?:\.\d+)?)\s*%/);
  if (percentMatch) return parseFloat(percentMatch[1]);
  const numMatch = commission.match(/(\d+(?:\.\d+)?)/);
  return numMatch ? parseFloat(numMatch[1]) : 0;
}

// Trích xuất số ngày cookie từ chuỗi cookie (ví dụ "30 days" -> 30, "1 year" -> 365, "Lifetime" -> 9999)
export function parseCookieDays(cookie?: string): number {
  if (!cookie) return 0;
  const lower = cookie.toLowerCase();
  if (lower.includes('lifetime') || lower.includes('vĩnh viễn')) return 9999;
  if (lower.includes('year') || lower.includes('năm')) {
    const m = lower.match(/(\d+)/);
    return m ? parseInt(m[1], 10) * 365 : 365;
  }
  const match = lower.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

