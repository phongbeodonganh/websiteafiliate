import { randomUUID } from "node:crypto";
import { sanitizeArticleContent } from "@/lib/sanitize";
import { slugify } from "@/lib/utils";
import type { StoreRecord, StoreOffer } from "./types";

export function normalizeStoreInput(input: unknown) {
  const errors: string[] = [];
  const body = input && typeof input === "object" && !Array.isArray(input) ? input as Record<string, unknown> : {};
  function value(source: Record<string, unknown>, key: string, max: number) {
    const raw = source[key];
    if (raw !== undefined && typeof raw !== "string") errors.push(`${key} phải là văn bản.`);
    const text = typeof raw === "string" ? raw.trim() : "";
    if (text.length > max) errors.push(`${key} vượt quá ${max} ký tự.`);
    return text.slice(0, max);
  }
  function url(source: Record<string, unknown>, key: string, required = false) {
    const text = value(source, key, 2048);
    if (!text && !required) return "";
    try {
      const parsed = new URL(text);
      if (!["http:", "https:"].includes(parsed.protocol) || parsed.username || parsed.password) throw new Error();
      return parsed.href;
    } catch { errors.push(`${key} phải là URL http/https hợp lệ.`); return ""; }
  }
  function date(source: Record<string, unknown>, key: string) {
    const text = value(source, key, 40);
    if (!text) return "";
    if (!/^\d{4}-\d{2}-\d{2}T/.test(text) || !Number.isFinite(Date.parse(text))) {
      errors.push(`${key} không phải ngày giờ hợp lệ.`); return "";
    }
    return new Date(text).toISOString();
  }
  function rows(key: string, max: number): Record<string, unknown>[] {
    const raw = body[key] ?? [];
    if (!Array.isArray(raw) || raw.length > max) { errors.push(`${key} tối đa ${max} mục.`); return []; }
    return raw.map((row) => {
      if (!row || typeof row !== "object" || Array.isArray(row)) { errors.push(`${key} chứa mục không hợp lệ.`); return {}; }
      return row as Record<string, unknown>;
    });
  }
  const name = value(body, "name", 120);
  const slug = slugify(value(body, "slug", 120) || name);
  if (!name || !slug) errors.push("Tên và đường dẫn store không được để trống.");
  const status = body.status ?? "draft";
  if (!["draft", "published", "archived"].includes(String(status))) errors.push("Trạng thái store không hợp lệ.");
  if (body.showOnHomepage !== undefined && typeof body.showOnHomepage !== "boolean") errors.push("Hiển thị homepage phải là boolean.");
  const sortOrder = body.sortOrder ?? 0;
  if (typeof sortOrder !== "number" || !Number.isInteger(sortOrder) || Math.abs(sortOrder) > 100000) errors.push("Thứ tự hiển thị phải là số nguyên từ -100000 đến 100000.");
  const offers: StoreOffer[] = rows("offers", 100).map((row) => {
    const title = value(row, "title", 200);
    const kind = row.kind;
    const code = value(row, "code", 100);
    if (!title) errors.push("Ưu đãi cần có tiêu đề.");
    if (!["code", "coupon"].includes(String(kind))) errors.push("Loại ưu đãi không hợp lệ.");
    if (kind === "code" && !code) errors.push("Promo code cần có mã giảm giá.");
    if (typeof row.active !== "boolean") errors.push("Trạng thái ưu đãi không hợp lệ.");
    const startsAt = date(row, "startsAt"), expiresAt = date(row, "expiresAt"), checkedAt = date(row, "checkedAt");
    if (startsAt && expiresAt && Date.parse(startsAt) >= Date.parse(expiresAt)) errors.push("Ngày hết hạn phải sau ngày bắt đầu.");
    if (checkedAt && Date.parse(checkedAt) > Date.now()) errors.push("Ngày kiểm tra không được ở tương lai.");
    return {
      id: value(row, "id", 80) || randomUUID(), kind: kind as StoreOffer["kind"], title,
      description: value(row, "description", 2000), saving: value(row, "saving", 100),
      code: kind === "code" ? code : "", destination: url(row, "destination"), terms: value(row, "terms", 4000),
      startsAt, expiresAt, checkedAt, active: row.active === true,
    };
  });
  if (new Set(offers.map((offer) => offer.id)).size !== offers.length) errors.push("ID ưu đãi bị trùng.");
  const faqs = rows("faqs", 50).map((row) => {
    const question = value(row, "question", 300), answer = value(row, "answer", 5000);
    if (!question || !answer) errors.push("Q&A cần có cả câu hỏi và câu trả lời.");
    return { question, answer };
  });
  const data: Omit<StoreRecord, "id" | "updatedAt"> = {
    name, slug, description: value(body, "description", 2000), categorySlug: value(body, "categorySlug", 120),
    destination: url(body, "destination", true), imageUrl: url(body, "imageUrl"), imageAlt: value(body, "imageAlt", 300),
    content: sanitizeArticleContent(value(body, "content", 200000)), faqs, offers,
    status: status as StoreRecord["status"], showOnHomepage: body.showOnHomepage !== false, sortOrder: sortOrder as number,
  };
  return { data, errors };
}
