import type { Metadata } from 'next';
import Link from 'next/link';
import { BadgeDollarSign, Compass, RefreshCw, SearchCheck, UsersRound } from 'lucide-react';
import {
  CheckItem,
  CheckList,
  InfoCallout,
  InfoSection,
  InstitutionalPage,
} from '@/components/InstitutionalPage';
import styles from '@/components/InstitutionalPage.module.css';
import { BRAND_EMAIL } from '@/lib/brand';
import { createPageMetadata } from '@/lib/seo';

export const metadata: Metadata = createPageMetadata({
  title: 'About Us',
  description: 'Meet AIDEALSUK and learn how we research, review, and explain AI tools, technology, and partner offers.',
  path: '/about',
});

const navItems = [
  { id: 'mission', label: 'Our mission' },
  { id: 'work', label: 'What we publish' },
  { id: 'standards', label: 'Editorial standards' },
  { id: 'independence', label: 'How we stay independent' },
  { id: 'audience', label: 'Who we serve' },
  { id: 'corrections', label: 'Corrections & feedback' },
];

export default function AboutPage() {
  return (
    <InstitutionalPage
      eyebrow="About AIDEALSUK"
      title="Clarity for the age of AI."
      description="AIDEALSUK is an independent editorial destination for people choosing AI tools, following technology shifts, and looking for genuinely useful partner offers."
      documentCode="EDITORIAL / 001"
      statusLabel="Independent publication"
      navItems={navItems}
      readingTime="4 minute read"
      asideTitle="Have a story or correction?"
      asideCopy="We welcome evidence, first-hand product insight, and precise corrections from readers and companies."
    >
      <InfoSection id="mission" eyebrow="Purpose" title="Our mission">
        <p>
          New AI products arrive faster than most people can evaluate them. Our job is to reduce that noise. We turn product claims, feature lists, pricing, and real-world use cases into clear reporting that helps readers decide what deserves their time and money.
        </p>
        <InfoCallout title="Our editorial promise" tone="accent">
          <p>Every article should leave the reader better equipped to make a decision—not simply more excited about a product.</p>
        </InfoCallout>
      </InfoSection>

      <InfoSection id="work" eyebrow="Coverage" title="What we publish">
        <div className={styles.valueGrid}>
          <div className={styles.valueCard}>
            <SearchCheck aria-hidden="true" />
            <h3>AI tool reviews</h3>
            <p>Focused assessments of features, pricing, limitations, and best-fit users.</p>
          </div>
          <div className={styles.valueCard}>
            <Compass aria-hidden="true" />
            <h3>Technology intelligence</h3>
            <p>News and analysis translated into practical implications for builders and operators.</p>
          </div>
          <div className={styles.valueCard}>
            <RefreshCw aria-hidden="true" />
            <h3>Workflow guidance</h3>
            <p>Actionable ideas for applying AI without losing sight of quality, privacy, or cost.</p>
          </div>
          <div className={styles.valueCard}>
            <BadgeDollarSign aria-hidden="true" />
            <h3>Selected deals</h3>
            <p>Clearly labelled partner offers that may provide readers with additional value.</p>
          </div>
        </div>
      </InfoSection>

      <InfoSection id="standards" eyebrow="Method" title="Editorial standards">
        <p>We aim for useful specificity, transparent sourcing, and a clear distinction between verified facts, editorial judgement, and vendor claims.</p>
        <CheckList>
          <CheckItem>We assess tools against the job they claim to do and identify meaningful trade-offs.</CheckItem>
          <CheckItem>Pricing and product details are checked at publication, but readers should confirm current terms with the provider.</CheckItem>
          <CheckItem>We avoid presenting promotional language as independent fact.</CheckItem>
          <CheckItem>Material updates and corrections are made when reliable new information becomes available.</CheckItem>
        </CheckList>
      </InfoSection>

      <InfoSection id="independence" eyebrow="Trust" title="How we stay independent">
        <p>
          Some pages contain affiliate links. If a reader follows one and completes a qualifying action, AIDEALSUK may receive a commission at no additional cost to that reader. This supports our publishing work, but it does not purchase a positive verdict or guarantee coverage.
        </p>
        <p>
          Commercial relationships are identified, and our approach is explained in the <Link href="/affiliate-disclosure">Affiliate Disclosure</Link>.
        </p>
        <InfoCallout title="Separation matters">
          <p>Editorial conclusions are based on usefulness, evidence, and reader fit. Commission terms may be reported as facts, but they do not define our assessment.</p>
        </InfoCallout>
      </InfoSection>

      <InfoSection id="audience" eyebrow="Community" title="Who we serve">
        <p>AIDEALSUK is built for curious, commercially aware readers who want substance before they commit:</p>
        <CheckList>
          <CheckItem>Founders and small teams evaluating software purchases.</CheckItem>
          <CheckItem>Creators, marketers, and developers building AI-assisted workflows.</CheckItem>
          <CheckItem>Professionals following how automation changes work and business.</CheckItem>
          <CheckItem>Readers comparing partner programmes and time-sensitive offers.</CheckItem>
        </CheckList>
        <div className={styles.valueCard}>
          <UsersRound aria-hidden="true" />
          <h3>Reader-first by design</h3>
          <p>We write for the person making the decision—not for the product press release.</p>
        </div>
      </InfoSection>

      <InfoSection id="corrections" eyebrow="Accountability" title="Corrections & feedback">
        <p>
          Accuracy is a continuing process. If you believe an article contains a factual error, an outdated price, or a missing disclosure, email <a href={`mailto:${BRAND_EMAIL}?subject=Editorial%20correction`}>{BRAND_EMAIL}</a> with the article URL, the issue, and any supporting source. We review specific, evidence-based requests and update content where appropriate.
        </p>
        <p>
          For general questions, pitches, or partnership enquiries, visit our <Link href="/contact">Contact page</Link>.
        </p>
      </InfoSection>
    </InstitutionalPage>
  );
}
