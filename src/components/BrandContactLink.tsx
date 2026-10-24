import Link from 'next/link';
import { BRAND_EMAIL } from '@/lib/brand';

export default function BrandContactLink() {
  return BRAND_EMAIL
    ? <a href={`mailto:${BRAND_EMAIL}`}>{BRAND_EMAIL}</a>
    : <Link href="/contact#channels">our contact page</Link>;
}
