/**
 * Input validation / normalisation for the CMS Product write endpoints.
 *
 * Hand-rolled (no zod dependency in this project). Every function returns a
 * normalised value and pushes human-readable messages into `errors` — the
 * route returns 400 with the full list so the admin form can highlight every
 * problem at once instead of one per round-trip.
 */
import { Types } from 'mongoose';
import { isHttpUrl } from '@/lib/seo';
import { isMarketplace } from '@/lib/marketplaces';
import {
  DIMENSION_UNITS,
  OFFER_STATUSES,
  PRODUCT_STATUSES,
  STOCK_STATUSES,
  VARIANT_OPTION_TYPES,
  WEIGHT_UNITS,
  type IOffer,
  type IProductImage,
  type IProductVariant,
  type ISpecGroup,
  type IVariantOption,
} from '@/lib/db/product-models';
import { roundMoney } from './pricing';

type Json = Record<string, unknown>;

const isObj = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown, max = 500): string | undefined =>
  typeof v === 'string' ? v.trim().slice(0, max) || undefined : undefined;
const bool = (v: unknown, fallback = false): boolean => (typeof v === 'boolean' ? v : fallback);

function num(v: unknown, field: string, errors: string[], opts: { min?: number; max?: number } = {}): number | undefined {
  if (v === undefined || v === null || v === '') return undefined;
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) {
    errors.push(`${field} phải là một số`);
    return undefined;
  }
  if (opts.min !== undefined && n < opts.min) errors.push(`${field} phải lớn hơn hoặc bằng ${opts.min}`);
  if (opts.max !== undefined && n > opts.max) errors.push(`${field} phải nhỏ hơn hoặc bằng ${opts.max}`);
  return n;
}

function money(v: unknown, field: string, errors: string[]): number | undefined {
  const n = num(v, field, errors, { min: 0 });
  return n === undefined ? undefined : roundMoney(n);
}

function oneOf<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  return typeof v === 'string' && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
}

function objectId(v: unknown, field: string, errors: string[]): Types.ObjectId | undefined | null {
  if (v === undefined) return undefined;
  if (v === null || v === '') return null; // explicit unset
  if (typeof v === 'string' && Types.ObjectId.isValid(v)) return new Types.ObjectId(v);
  errors.push(`${field} không phải mã định danh hợp lệ`);
  return undefined;
}

function stringList(v: unknown, max = 30, maxLen = 300): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((s) => str(s, maxLen)).filter((s): s is string => Boolean(s)).slice(0, max);
}

function idList(v: unknown, field: string, errors: string[]): Types.ObjectId[] {
  if (!Array.isArray(v)) return [];
  const out: Types.ObjectId[] = [];
  for (const raw of v) {
    if (typeof raw === 'string' && Types.ObjectId.isValid(raw)) out.push(new Types.ObjectId(raw));
    else errors.push(`${field} chứa mã định danh không hợp lệ`);
  }
  return out;
}

/* ------------------------------------------------------------------ */

export function normalizeImages(v: unknown, errors: string[]): IProductImage[] {
  if (!Array.isArray(v)) return [];
  if (v.length > 30) errors.push('Mỗi sản phẩm được có tối đa 30 ảnh');
  return v.slice(0, 30).flatMap((raw, i) => {
    if (!isObj(raw)) return [];
    const url = str(raw.url, 2000);
    if (!url || !isHttpUrl(url)) {
      errors.push(`URL ảnh thứ ${i + 1} phải bắt đầu bằng http hoặc https`);
      return [];
    }
    const blur = str(raw.blur_data_url, 4000);
    return [
      {
        url,
        alt: str(raw.alt, 200) ?? '',
        width: num(raw.width, `images[${i}].width`, errors, { min: 1 }),
        height: num(raw.height, `images[${i}].height`, errors, { min: 1 }),
        blur_data_url: blur && blur.startsWith('data:image/') ? blur : undefined,
        variant_option: str(raw.variant_option, 100),
        sort_order: num(raw.sort_order, `images[${i}].sort_order`, errors) ?? i,
      },
    ];
  });
}

export function normalizeVariantOptions(v: unknown, errors: string[]): IVariantOption[] {
  if (!Array.isArray(v)) return [];
  const seen = new Set<string>();
  return v.slice(0, 5).flatMap((raw, i) => {
    if (!isObj(raw)) return [];
    const key = str(raw.key, 40)?.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    const label = str(raw.label, 60);
    if (!key || !label) {
      errors.push(`Tùy chọn thứ ${i + 1} cần có mã và tên hiển thị`);
      return [];
    }
    if (seen.has(key)) {
      errors.push(`Mã tùy chọn “${key}” bị trùng`);
      return [];
    }
    seen.add(key);
    const values = (Array.isArray(raw.values) ? raw.values : []).flatMap((val: unknown) => {
      if (!isObj(val)) return [];
      const value = str(val.value, 60);
      const vLabel = str(val.label, 60) ?? value;
      if (!value || !vLabel) return [];
      const hex = str(val.hex, 9);
      return [{ value, label: vLabel, hex: hex && /^#[0-9a-fA-F]{3,8}$/.test(hex) ? hex : undefined }];
    });
    if (values.length === 0) errors.push(`Tùy chọn “${key}” cần ít nhất một giá trị`);
    return [{ key, label, type: oneOf(raw.type, VARIANT_OPTION_TYPES, 'text'), values }];
  });
}

export function normalizeVariants(
  v: unknown,
  options: IVariantOption[],
  errors: string[]
): IProductVariant[] {
  if (!Array.isArray(v)) return [];
  const skus = new Set<string>();
  const variants = v.slice(0, 200).flatMap((raw, i) => {
    if (!isObj(raw)) return [];
    const sku = str(raw.sku, 64);
    if (!sku) {
      errors.push(`Biến thể thứ ${i + 1} chưa có mã SKU`);
      return [];
    }
    if (skus.has(sku)) errors.push(`Mã SKU biến thể “${sku}” bị trùng`);
    skus.add(sku);

    const rawOpts = isObj(raw.options) ? raw.options : {};
    const opts: Record<string, string> = {};
    for (const opt of options) {
      const picked = rawOpts[opt.key];
      if (typeof picked !== 'string' || !opt.values.some((val) => val.value === picked)) {
        errors.push(`Biến thể ${sku} chưa có giá trị hợp lệ cho “${opt.label}”`);
        continue;
      }
      opts[opt.key] = picked;
    }

    return [
      {
        sku,
        options: opts,
        price: money(raw.price, `variants[${i}].price`, errors),
        original_price: money(raw.original_price, `variants[${i}].original_price`, errors),
        image_index: num(raw.image_index, `variants[${i}].image_index`, errors, { min: 0 }),
        stock_status: oneOf(raw.stock_status, STOCK_STATUSES, 'in_stock'),
        is_default: bool(raw.is_default),
      },
    ];
  });

  // Exactly one default variant when variants exist.
  if (variants.length > 0) {
    const firstDefault = variants.findIndex((x) => x.is_default);
    variants.forEach((x, i) => (x.is_default = i === (firstDefault === -1 ? 0 : firstDefault)));
  }
  return variants;
}

export function normalizeSpecs(v: unknown, errors: string[]): ISpecGroup[] {
  if (!Array.isArray(v)) return [];
  return v.slice(0, 20).flatMap((raw, i) => {
    if (!isObj(raw)) return [];
    const group = str(raw.group, 80);
    if (!group) {
      errors.push(`Nhóm thông số thứ ${i + 1} chưa có tên`);
      return [];
    }
    const items = (Array.isArray(raw.items) ? raw.items : []).slice(0, 60).flatMap((it: unknown) => {
      if (!isObj(it)) return [];
      const label = str(it.label, 120);
      const value = str(it.value, 500);
      return label && value ? [{ label, value, highlight: bool(it.highlight) }] : [];
    });
    return items.length ? [{ group, items }] : [];
  });
}

export type OfferInput = Omit<IOffer, '_id' | 'click_count'> & { _id?: Types.ObjectId };

export function normalizeOffers(v: unknown, variantSkus: Set<string>, errors: string[]): OfferInput[] {
  if (!Array.isArray(v)) return [];
  return v.slice(0, 20).flatMap((raw, i) => {
    if (!isObj(raw)) return [];
    const where = `offers[${i}]`;
    if (!isMarketplace(raw.marketplace)) {
      errors.push(`Sàn bán hàng ở ưu đãi thứ ${i + 1} chưa được hỗ trợ`);
      return [];
    }
    const url = str(raw.affiliate_url, 2000);
    if (!url || !isHttpUrl(url)) {
      errors.push(`Link affiliate ở ưu đãi thứ ${i + 1} phải bắt đầu bằng http hoặc https`);
      return [];
    }
    const price = money(raw.price, `${where}.price`, errors);
    if (price === undefined) {
      errors.push(`Ưu đãi thứ ${i + 1} chưa có giá bán`);
      return [];
    }
    const original = money(raw.original_price, `${where}.original_price`, errors);
    if (original !== undefined && original < price) {
      errors.push(`Giá niêm yết ở ưu đãi thứ ${i + 1} phải lớn hơn hoặc bằng giá bán`);
    }
    const variantSku = str(raw.variant_sku, 64);
    if (variantSku && !variantSkus.has(variantSku)) {
      errors.push(`Mã biến thể “${variantSku}” ở ưu đãi thứ ${i + 1} không tồn tại`);
    }
    const subid = str(raw.subid_param, 40);
    const id = typeof raw._id === 'string' && Types.ObjectId.isValid(raw._id) ? new Types.ObjectId(raw._id) : undefined;
    const checked = typeof raw.last_checked_at === 'string' ? new Date(raw.last_checked_at) : undefined;

    return [
      {
        ...(id ? { _id: id } : {}),
        marketplace: raw.marketplace,
        store_name: str(raw.store_name, 120) ?? '',
        is_official_store: bool(raw.is_official_store),
        affiliate_url: url,
        subid_param: subid && /^[a-zA-Z0-9_-]+$/.test(subid) ? subid : undefined,
        variant_sku: variantSku,
        price,
        original_price: original,
        coupon_code: str(raw.coupon_code, 60),
        coupon_note: str(raw.coupon_note, 200),
        free_shipping: bool(raw.free_shipping),
        stock_status: oneOf(raw.stock_status, STOCK_STATUSES, 'in_stock'),
        is_primary: bool(raw.is_primary),
        sort_order: num(raw.sort_order, `${where}.sort_order`, errors) ?? i,
        last_checked_at: checked && !Number.isNaN(checked.getTime()) ? checked : new Date(),
        // 'blacklisted' is system-managed (blacklist sweep) — admins can only toggle active/inactive.
        status: oneOf(raw.status, OFFER_STATUSES.filter((s) => s !== 'blacklisted'), 'active'),
      },
    ];
  });
}

/* ------------------------------------------------------------------ */

export interface ProductInputResult {
  data: Record<string, unknown>;
  errors: string[];
}

/**
 * Normalise a create (partial=false) or update (partial=true) body. On update
 * only keys present in the body are returned, so PUT behaves as a patch.
 */
export function normalizeProductInput(body: unknown, partial: boolean): ProductInputResult {
  const errors: string[] = [];
  const data: Record<string, unknown> = {};
  if (!isObj(body)) return { data, errors: ['Dữ liệu gửi lên không đúng định dạng JSON'] };
  const has = (k: string) => Object.prototype.hasOwnProperty.call(body, k);
  const want = (k: string) => !partial || has(k);

  if (want('name')) {
    const name = str(body.name, 200);
    if (!name) errors.push('Tên sản phẩm là bắt buộc');
    else data.name = name;
  }
  if (want('sku')) {
    const sku = str(body.sku, 64);
    if (!sku) errors.push('Mã SKU là bắt buộc');
    else data.sku = sku;
  }
  if (has('slug')) {
    const slug = str(body.slug, 200);
    if (slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) errors.push('Đường dẫn chỉ được chứa chữ thường không dấu, số và dấu gạch ngang');
    else if (slug) data.slug = slug;
  }

  for (const key of ['brand_id', 'category_id', 'sub_category_id'] as const) {
    if (has(key)) {
      const id = objectId(body[key], key, errors);
      if (id !== undefined) data[key] = id;
    }
  }

  if (has('short_description')) data.short_description = str(body.short_description, 500);
  if (has('description')) data.description = typeof body.description === 'string' ? body.description : undefined;
  for (const key of ['highlights', 'pros', 'cons'] as const) {
    if (has(key)) data[key] = stringList(body[key]);
  }

  if (has('dimensions')) {
    const d = isObj(body.dimensions) ? body.dimensions : {};
    data.dimensions = {
      length: num(d.length, 'dimensions.length', errors, { min: 0 }),
      width: num(d.width, 'dimensions.width', errors, { min: 0 }),
      height: num(d.height, 'dimensions.height', errors, { min: 0 }),
      unit: oneOf(d.unit, DIMENSION_UNITS, 'cm'),
    };
  }
  if (has('weight')) {
    const w = isObj(body.weight) ? body.weight : {};
    data.weight = { value: num(w.value, 'weight.value', errors, { min: 0 }), unit: oneOf(w.unit, WEIGHT_UNITS, 'g') };
  }
  if (has('material')) data.material = str(body.material, 200);
  if (has('origin_country')) data.origin_country = str(body.origin_country, 80);
  if (has('warranty_months')) data.warranty_months = num(body.warranty_months, 'warranty_months', errors, { min: 0, max: 240 });

  if (has('images')) data.images = normalizeImages(body.images, errors);

  // Variants depend on options; offers depend on variant SKUs. When only some of
  // these keys are sent on update, the service merges with the stored doc and
  // calls the normalisers again (see service.updateProduct).
  const options = has('variant_options') ? normalizeVariantOptions(body.variant_options, errors) : undefined;
  if (options) data.variant_options = options;
  const variants = has('variants') ? normalizeVariants(body.variants, options ?? [], errors) : undefined;
  if (variants) data.variants = variants;
  if (has('specs')) data.specs = normalizeSpecs(body.specs, errors);
  if (has('offers')) {
    data.offers = normalizeOffers(body.offers, new Set((variants ?? []).map((x) => x.sku)), errors);
  }

  if (has('price')) data.price = money(body.price, 'price', errors);
  if (has('original_price')) data.original_price = money(body.original_price, 'original_price', errors);

  if (has('trust')) {
    const t = isObj(body.trust) ? body.trust : {};
    data.trust = {
      authentic: bool(t.authentic, true),
      free_shipping: bool(t.free_shipping),
      return_days: num(t.return_days, 'trust.return_days', errors, { min: 0, max: 365 }),
      warranty_text: str(t.warranty_text, 200),
    };
  }

  if (has('editor_score')) data.editor_score = num(body.editor_score, 'editor_score', errors, { min: 0, max: 10 });
  if (has('related_product_ids')) data.related_product_ids = idList(body.related_product_ids, 'related_product_ids', errors).slice(0, 12);
  if (has('article_ids')) data.article_ids = idList(body.article_ids, 'article_ids', errors).slice(0, 20);

  if (has('meta_title')) data.meta_title = str(body.meta_title, 120);
  if (has('meta_description')) data.meta_description = str(body.meta_description, 320);
  if (has('focus_keyword')) data.focus_keyword = str(body.focus_keyword, 120);
  if (has('faq_schema')) {
    data.faq_schema = (Array.isArray(body.faq_schema) ? body.faq_schema : []).slice(0, 15).flatMap((f: unknown) => {
      if (!isObj(f)) return [];
      const question = str(f.question, 300);
      const answer = str(f.answer, 2000);
      return question && answer ? [{ question, answer }] : [];
    });
  }

  if (has('status')) data.status = oneOf(body.status, PRODUCT_STATUSES, 'draft');
  if (has('is_featured')) data.is_featured = bool(body.is_featured);
  if (has('is_deal')) data.is_deal = bool(body.is_deal);

  return { data, errors };
}
