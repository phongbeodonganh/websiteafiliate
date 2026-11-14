import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, Clock3, FileText, ShieldCheck } from 'lucide-react';
import EditorialFooter from '@/components/EditorialFooter';
import EditorialHeader from '@/components/EditorialHeader';
import styles from './InstitutionalPage.module.css';

export interface InstitutionalNavItem {
  id: string;
  label: string;
}

interface InstitutionalPageProps {
  eyebrow: string;
  title: string;
  description: string;
  documentCode: string;
  statusLabel: string;
  navItems: InstitutionalNavItem[];
  children: ReactNode;
  updated?: string;
  readingTime?: string;
  asideTitle?: string;
  asideCopy?: string;
}

export function InfoSection({
  id,
  eyebrow,
  title,
  children,
}: {
  id: string;
  eyebrow?: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className={styles.section} id={id} data-motion="rise">
      <div className={styles.sectionHeading}>
        {eyebrow && <p>{eyebrow}</p>}
        <h2>{title}</h2>
      </div>
      <div className={styles.sectionBody}>{children}</div>
    </section>
  );
}

export function InfoCallout({
  title,
  children,
  tone = 'default',
}: {
  title: string;
  children: ReactNode;
  tone?: 'default' | 'accent';
}) {
  return (
    <aside className={`${styles.callout} ${tone === 'accent' ? styles.calloutAccent : ''}`}>
      <ShieldCheck aria-hidden="true" />
      <div>
        <h3>{title}</h3>
        <div>{children}</div>
      </div>
    </aside>
  );
}

export function CheckList({ children }: { children: ReactNode }) {
  return <ul className={styles.checkList}>{children}</ul>;
}

export function CheckItem({ children }: { children: ReactNode }) {
  return (
    <li>
      <CheckCircle2 aria-hidden="true" />
      <span>{children}</span>
    </li>
  );
}

export function InstitutionalPage({
  eyebrow,
  title,
  description,
  documentCode,
  statusLabel,
  navItems,
  children,
  updated,
  readingTime,
  asideTitle = 'Need clarification?',
  asideCopy = 'We believe important information should be easy to understand. Contact our team if anything on this page is unclear.',
}: InstitutionalPageProps) {
  return (
    <div className={styles.page}>
      <EditorialHeader />

      <main>
        <header className={styles.hero}>
          <div className={styles.heroGlow} aria-hidden="true" />
          <div className={styles.heroGrid}>
            <div className={styles.heroCopy} data-motion="rise">
              <nav className={styles.breadcrumb} aria-label="Breadcrumb">
                <Link href="/">Home</Link>
                <span aria-hidden="true">/</span>
                <span>{eyebrow}</span>
              </nav>
              <p className={styles.eyebrow}>{eyebrow}</p>
              <h1>{title}</h1>
              <p className={styles.lede}>{description}</p>
            </div>

            <div className={styles.documentCard} data-motion="fade">
              <div className={styles.documentTopline}>
                <FileText aria-hidden="true" />
                <span>{documentCode}</span>
              </div>
              <div className={styles.documentMark} aria-hidden="true">A</div>
              <div className={styles.documentMeta}>
                <span><i className={styles.liveDot} /> {statusLabel}</span>
                {updated && <span>Updated {updated}</span>}
              </div>
            </div>
          </div>
        </header>

        <div className={styles.contentGrid}>
          <article className={styles.content}>{children}</article>

          <aside className={styles.aside} aria-label="Page navigation">
            <div className={styles.asideInner}>
              <div className={styles.indexCard}>
                <p className={styles.asideEyebrow}>On this page</p>
                <nav>
                  {navItems.map((item, index) => (
                    <a href={`#${item.id}`} key={item.id}>
                      <span>{String(index + 1).padStart(2, '0')}</span>
                      {item.label}
                    </a>
                  ))}
                </nav>
                {readingTime && (
                  <p className={styles.readingTime}>
                    <Clock3 aria-hidden="true" /> {readingTime}
                  </p>
                )}
              </div>

              <div className={styles.helpCard}>
                <p>{asideTitle}</p>
                <span>{asideCopy}</span>
                <Link href="/contact">
                  Contact AIDEALSUK <ArrowRight aria-hidden="true" />
                </Link>
              </div>
            </div>
          </aside>
        </div>

        <section className={styles.closingCta} data-motion="rise">
          <div>
            <p>AIDEALSUK / TRUST DESK</p>
            <h2>Clear standards. Better decisions.</h2>
          </div>
          <div className={styles.closingLinks}>
            <Link href="/affiliate-disclosure">How we earn</Link>
            <Link href="/about">How we work <ArrowRight aria-hidden="true" /></Link>
          </div>
        </section>
      </main>

      <EditorialFooter />
    </div>
  );
}
