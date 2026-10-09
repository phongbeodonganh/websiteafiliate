/** Single source of truth for the public GoodPick brand. */
export const BRAND_NAME = 'GoodPick';

/** Tagline displayed in trust, legal, and editorial surfaces. */
export const BRAND_TAGLINE =
  'Chọn đúng sản phẩm, mua đúng giá — với đánh giá độc lập và thông tin ưu đãi được kiểm tra.';

export const BRAND_COPYRIGHT = (year = new Date().getFullYear()) =>
  `© ${year} ${BRAND_NAME}. Bảo lưu mọi quyền.`;

/** Canonical domain used when database settings are unavailable. */
export const BRAND_DOMAIN = process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'https://cecana.com.vn';

/** Public inbox used by trust, legal, and editorial pages. */
export const BRAND_EMAIL = 'hello@cecana.com.vn';
