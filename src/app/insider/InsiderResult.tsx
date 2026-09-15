import Link from 'next/link';
import styles from './result.module.css';

type InsiderResultProps = {
  tone: 'success' | 'failed';
  eyebrow: string;
  title: string;
  description: string;
  detail: string;
  primaryHref: string;
  primaryLabel: string;
};

export default function InsiderResult({
  tone,
  eyebrow,
  title,
  description,
  detail,
  primaryHref,
  primaryLabel,
}: InsiderResultProps) {
  const isSuccess = tone === 'success';

  return (
    <main className={`${styles.page} ${styles[tone]}`}>
      <div className={styles.grid} aria-hidden="true" />
      <section className={styles.shell} aria-labelledby="insider-result-title">
        <header className={styles.masthead}>
          <Link className={styles.brand} href="/" aria-label="AIDEALSUK home">
            AIDEALSUK
          </Link>
          <span className={styles.edition}>Insider Dispatch</span>
        </header>

        <div className={styles.content}>
          <div className={styles.statusMark} aria-hidden="true">
            {isSuccess ? (
              <svg viewBox="0 0 24 24" fill="none">
                <path d="m5 12.5 4.2 4.2L19 7" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M12 7.5v5.25M12 16.5h.01" />
                <circle cx="12" cy="12" r="9" />
              </svg>
            )}
          </div>

          <div className={styles.copy}>
            <p className={styles.eyebrow}>{eyebrow}</p>
            <h1 id="insider-result-title">{title}</h1>
            <p className={styles.description}>{description}</p>
          </div>

          <div className={styles.receipt}>
            <span>Status</span>
            <strong>{isSuccess ? 'Verified' : 'Action required'}</strong>
            <span>Delivery</span>
            <strong>{isSuccess ? 'Daily · 00:00 GMT+12' : 'Not scheduled'}</strong>
            <span>Note</span>
            <strong>{detail}</strong>
          </div>

          <div className={styles.actions}>
            <Link className={`${styles.button} ${styles.primary}`} href={primaryHref}>
              {primaryLabel}
              <span aria-hidden="true">→</span>
            </Link>
            <Link className={`${styles.button} ${styles.secondary}`} href="/">
              Back to AIDEALSUK
            </Link>
          </div>
        </div>

        <footer className={styles.footer}>
          <span>AIDEALSUK / INSIDER</span>
          <span>{isSuccess ? 'ACCESS CONFIRMED' : 'LINK NOT CONFIRMED'}</span>
        </footer>
      </section>
    </main>
  );
}
