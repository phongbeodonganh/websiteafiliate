import { BRAND_LOGO, BRAND_NAME } from '@/lib/brand';
import styles from './brand-logo.module.css';

/** The same outlined wordmark is used for every home link, with a cream backing for dark surfaces. */
export default function BrandLogo({ compact = false, background = 'cream' }: { compact?: boolean; background?: 'cream' | 'white' }) {
  return <span className={`${styles.wordmark} ${compact ? styles.compact : ''} ${background === 'white' ? styles.white : ''}`}>
    {/* SVG lettering is outlined so the logo is independent of web fonts. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={BRAND_LOGO} alt={BRAND_NAME} width={1070} height={224} decoding="async" />
  </span>;
}
