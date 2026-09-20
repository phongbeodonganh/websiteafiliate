import type { Metadata } from 'next';
import Link from 'next/link';
import {
  CheckItem,
  CheckList,
  InfoCallout,
  InfoSection,
  InstitutionalPage,
} from '@/components/InstitutionalPage';
import { BRAND_EMAIL } from '@/lib/brand';
import { createPageMetadata } from '@/lib/seo';

export const metadata: Metadata = createPageMetadata({
  title: 'Affiliate Disclosure',
  description: 'How affiliate links and commercial relationships support AIDEALSUK, and how we protect editorial independence.',
  path: '/affiliate-disclosure',
});

const UPDATED = '4 September 2026';
const navItems = [
  { id: 'plain-language', label: 'The short version' },
  { id: 'affiliate-links', label: 'How affiliate links work' },
  { id: 'identification', label: 'How we identify them' },
  { id: 'independence', label: 'Editorial independence' },
  { id: 'selection', label: 'How offers are selected' },
  { id: 'prices', label: 'Prices, claims & availability' },
  { id: 'tracking', label: 'Tracking & privacy' },
  { id: 'responsibility', label: 'Your purchasing decision' },
  { id: 'contact', label: 'Questions or concerns' },
];

export default function AffiliateDisclosurePage() {
  return (
    <InstitutionalPage
      eyebrow="Affiliate Disclosure"
      title="How AIDEALSUK earns."
      description="Commercial transparency is part of useful journalism. This page explains when we may receive compensation and the boundaries that protect our editorial work."
      documentCode="DISCLOSURE / 001"
      statusLabel="Disclosure active"
      updated={UPDATED}
      navItems={navItems}
      readingTime="6 minute read"
      asideTitle="See a missing disclosure?"
      asideCopy="Send us the page URL and placement so our editorial team can review it promptly."
    >
      <InfoSection id="plain-language" eyebrow="01 / Summary" title="The short version">
        <InfoCallout title="Some links earn us a commission" tone="accent">
          <p>If you click certain links on AIDEALSUK and complete a qualifying purchase or action, we may receive compensation from the provider. This normally does not add to the price you pay.</p>
        </InfoCallout>
        <p>Affiliate revenue helps fund research, publishing, infrastructure, and maintenance. It does not entitle a partner to a positive review, prevent criticism, or guarantee inclusion.</p>
      </InfoSection>

      <InfoSection id="affiliate-links" eyebrow="02 / Mechanics" title="How affiliate links work">
        <p>An affiliate link contains information that can attribute a visit or transaction to AIDEALSUK. When you follow one, our website may record the relevant article or placement and the selected partner offer before redirecting you to the provider.</p>
        <p>The provider may then use a referral cookie or similar identifier for a stated period. If your activity qualifies under that programme’s rules, the provider may pay us a fixed amount, a percentage, a recurring commission, or another agreed benefit.</p>
      </InfoSection>

      <InfoSection id="identification" eyebrow="03 / Labels" title="How we identify commercial links">
        <p>Affiliate relationships may be identified through labels such as “Affiliate”, “Partner”, “Sponsored”, “Deal”, disclosure text near a recommendation, or a site-wide disclosure linking to this page.</p>
        <CheckList>
          <CheckItem>Links intended for affiliate attribution use appropriate sponsored link attributes where applicable.</CheckItem>
          <CheckItem>Article-level recommendations may include a disclosure near the relevant call to action.</CheckItem>
          <CheckItem>Our footer carries a persistent affiliate notice across public pages.</CheckItem>
        </CheckList>
        <p>A reference to a product is not necessarily paid. Many products are covered without an active affiliate relationship.</p>
      </InfoSection>

      <InfoSection id="independence" eyebrow="04 / Boundary" title="Editorial independence">
        <p>Our aim is to help readers judge suitability, not to maximise clicks at any cost. Partners cannot purchase our editorial conclusion.</p>
        <CheckList>
          <CheckItem>Compensation does not guarantee coverage or a favourable rating.</CheckItem>
          <CheckItem>Known limitations and material drawbacks should remain visible.</CheckItem>
          <CheckItem>Where a commercial relationship is relevant, it should be disclosed clearly.</CheckItem>
          <CheckItem>We may remove or block offers that become unsafe, misleading, unavailable, or inconsistent with our standards.</CheckItem>
        </CheckList>
        <p>Learn more about our wider process on the <Link href="/about">About Us</Link> page.</p>
      </InfoSection>

      <InfoSection id="selection" eyebrow="05 / Curation" title="How offers are selected">
        <p>We consider the product’s relevance to our audience, apparent usefulness, product quality, pricing clarity, reputation, availability, and the credibility of its claims. Commercial terms may affect whether an affiliate relationship is practical, but should not replace editorial judgement about reader fit.</p>
        <p>“Top pick”, “recommended”, or similar editorial language represents an assessment at the time of publication. It is not a guarantee that the product is appropriate for every reader.</p>
      </InfoSection>

      <InfoSection id="prices" eyebrow="06 / Verification" title="Prices, claims & availability">
        <p>Providers control their prices, trials, discounts, refund rules, commission programmes, and availability. These details can change without notice. AIDEALSUK may update content periodically, but cannot guarantee that every third-party term shown is current at the moment you read it.</p>
        <InfoCallout title="Check the provider’s final terms">
          <p>Before purchasing, confirm the price, billing frequency, renewal terms, taxes, cancellation process, data practices, and refund policy on the provider’s website.</p>
        </InfoCallout>
      </InfoSection>

      <InfoSection id="tracking" eyebrow="07 / Data" title="Tracking & privacy">
        <p>Our affiliate redirect may record the selected offer, the related article where available, the time of the click, and an IP address for attribution, performance measurement, security, and fraud prevention. The partner may separately process referral and transaction data under its own policy.</p>
        <p>We do not receive your full payment card details from affiliate partners merely because a commission is attributed. For more information, read our <Link href="/privacy-policy">Privacy Policy</Link>.</p>
      </InfoSection>

      <InfoSection id="responsibility" eyebrow="08 / Choice" title="Your purchasing decision">
        <p>Our content is general information, not a personal recommendation or professional advice. Your requirements, budget, risk tolerance, location, and intended use may differ from those considered in an article.</p>
        <p>You are responsible for evaluating the provider and its terms before committing. Any purchase, subscription, contract, support request, cancellation, or dispute takes place between you and the third-party provider.</p>
      </InfoSection>

      <InfoSection id="contact" eyebrow="09 / Accountability" title="Questions or concerns">
        <p>If a disclosure appears unclear or missing, contact <a href={`mailto:${BRAND_EMAIL}?subject=Affiliate%20disclosure%20question`}>{BRAND_EMAIL}</a> with the page URL and a description of the placement.</p>
        <p>This disclosure should be read together with our <Link href="/terms">Terms &amp; Conditions</Link> and <Link href="/privacy-policy">Privacy Policy</Link>.</p>
      </InfoSection>
    </InstitutionalPage>
  );
}
