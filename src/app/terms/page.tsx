import type { Metadata } from 'next';
import Link from 'next/link';
import {
  InfoCallout,
  InfoSection,
  InstitutionalPage,
} from '@/components/InstitutionalPage';
import { BRAND_EMAIL } from '@/lib/brand';
import { createPageMetadata } from '@/lib/seo';

export const metadata: Metadata = createPageMetadata({
  title: 'Terms & Conditions',
  description: 'The terms that govern access to and use of the AIDEALSUK website, content, newsletter, and partner links.',
  path: '/terms',
});

const UPDATED = '4 September 2026';
const navItems = [
  { id: 'agreement', label: 'Agreement to these terms' },
  { id: 'service', label: 'The service' },
  { id: 'information', label: 'Information, not advice' },
  { id: 'acceptable-use', label: 'Acceptable use' },
  { id: 'intellectual-property', label: 'Intellectual property' },
  { id: 'third-parties', label: 'Third-party links & offers' },
  { id: 'newsletter', label: 'Newsletter' },
  { id: 'disclaimers', label: 'Disclaimers' },
  { id: 'liability', label: 'Limitation of liability' },
  { id: 'indemnity', label: 'Your responsibility' },
  { id: 'changes', label: 'Changes & availability' },
  { id: 'general', label: 'General terms & contact' },
];

export default function TermsPage() {
  return (
    <InstitutionalPage
      eyebrow="Terms & Conditions"
      title="The terms behind the experience."
      description="These terms set the ground rules for using AIDEALSUK, including our editorial content, newsletter, and links to third-party products."
      documentCode="TERMS / 001"
      statusLabel="Current terms"
      updated={UPDATED}
      navItems={navItems}
      readingTime="10 minute read"
      asideTitle="A plain-language agreement"
      asideCopy="These terms apply to your use of the public AIDEALSUK website. Contact us if a provision is unclear."
    >
      <InfoSection id="agreement" eyebrow="01 / Agreement" title="Agreement to these terms">
        <p>By accessing or using aidealsuk.com, you agree to these Terms &amp; Conditions and acknowledge our <Link href="/privacy-policy">Privacy Policy</Link> and <Link href="/affiliate-disclosure">Affiliate Disclosure</Link>. If you do not agree, do not use the website.</p>
        <p>You must be legally capable of entering into this agreement. If you use the website for an organisation, you confirm that you have authority to bind that organisation to these terms.</p>
      </InfoSection>

      <InfoSection id="service" eyebrow="02 / Scope" title="The service">
        <p>AIDEALSUK publishes news, reviews, comparisons, educational material, newsletters, and information about third-party AI tools and partner offers. Features and coverage may change over time.</p>
        <p>We may correct, update, reorganise, suspend, or remove content at our discretion. We do not promise that every page, feature, price, offer, or external link will remain continuously available.</p>
      </InfoSection>

      <InfoSection id="information" eyebrow="03 / Decisions" title="Information, not advice">
        <p>Content is provided for general informational and educational purposes. It is not legal, financial, investment, tax, cybersecurity, medical, or other professional advice and should not be treated as a substitute for advice tailored to your situation.</p>
        <InfoCallout title="Verify before you act" tone="accent">
          <p>Products, prices, terms, availability, risks, and laws can change. Confirm material details directly with the relevant provider and use independent professional advice where appropriate.</p>
        </InfoCallout>
      </InfoSection>

      <InfoSection id="acceptable-use" eyebrow="04 / Conduct" title="Acceptable use">
        <p>You may use the public website for lawful personal or internal business research. You must not:</p>
        <ul>
          <li>Break applicable law, infringe another person’s rights, or use the website to facilitate harm.</li>
          <li>Attempt to bypass security, probe vulnerabilities without written permission, introduce malicious code, or interfere with site operation.</li>
          <li>Use automated systems to scrape, reproduce, train on, or commercially exploit substantial parts of the website where prohibited by law or without permission.</li>
          <li>Misrepresent affiliation with AIDEALSUK, remove disclosures or attribution, or use our brand in a misleading way.</li>
          <li>Submit spam, deceptive partnership requests, unlawful material, or confidential information you are not authorised to share.</li>
        </ul>
      </InfoSection>

      <InfoSection id="intellectual-property" eyebrow="05 / Ownership" title="Intellectual property">
        <p>The website’s original text, design, branding, graphics, selection, arrangement, and software are owned by AIDEALSUK or used under licence and are protected by applicable intellectual-property laws.</p>
        <p>You may link to public pages and quote limited excerpts for commentary, criticism, or reporting where legally permitted and properly attributed. You may not reproduce full articles, systematically republish content, sell copies, or imply endorsement without prior written permission.</p>
        <p>Third-party product names, logos, and trademarks belong to their respective owners. Reference to them does not imply sponsorship or endorsement unless expressly stated.</p>
      </InfoSection>

      <InfoSection id="third-parties" eyebrow="06 / External services" title="Third-party links & offers">
        <p>AIDEALSUK links to websites and products operated by third parties. We do not control their content, availability, security, pricing, checkout, contracts, privacy practices, or customer support. Your interaction or transaction is with that provider and is governed by its terms.</p>
        <p>Some links are affiliate links. We may earn a commission from a qualifying action without increasing the price you pay. Commercial relationships are explained in our <Link href="/affiliate-disclosure">Affiliate Disclosure</Link>.</p>
      </InfoSection>

      <InfoSection id="newsletter" eyebrow="07 / Email" title="Newsletter">
        <p>When you subscribe, you authorise us to send the requested editorial briefings and selected partner offers to the email address provided. You can withdraw that permission by using an unsubscribe option made available in a message or by contacting <a href={`mailto:${BRAND_EMAIL}?subject=Unsubscribe%20request`}>{BRAND_EMAIL}</a>.</p>
        <p>You are responsible for entering an address you control. Delivery may be delayed or prevented by service availability, filtering, or incorrect contact information.</p>
      </InfoSection>

      <InfoSection id="disclaimers" eyebrow="08 / Warranty" title="Disclaimers">
        <p>To the fullest extent permitted by law, the website and its content are provided “as is” and “as available”. We disclaim implied warranties including merchantability, fitness for a particular purpose, non-infringement, and uninterrupted or error-free operation.</p>
        <p>We use reasonable editorial care, but do not warrant that content is complete, current, accurate in every respect, or suitable for your particular purpose. Opinions and assessments may differ from your experience.</p>
      </InfoSection>

      <InfoSection id="liability" eyebrow="09 / Risk" title="Limitation of liability">
        <p>To the fullest extent permitted by law, AIDEALSUK and its contributors will not be liable for indirect, incidental, special, consequential, exemplary, or punitive loss; lost profits, revenue, opportunity, goodwill, or data; or loss arising from reliance on content, use of third-party services, or inability to access the website.</p>
        <p>Nothing in these terms excludes or limits liability that cannot lawfully be excluded or limited. Consumer rights that apply to you remain unaffected.</p>
      </InfoSection>

      <InfoSection id="indemnity" eyebrow="10 / Responsibility" title="Your responsibility">
        <p>To the extent permitted by law, you are responsible for losses, claims, or reasonable costs arising from your unlawful use of the website, your infringement of third-party rights, or your material breach of these terms.</p>
      </InfoSection>

      <InfoSection id="changes" eyebrow="11 / Operation" title="Changes & availability">
        <p>We may revise these terms when the service, our business, or applicable requirements change. The updated date identifies the version in force. Continued use after revised terms take effect constitutes acceptance where permitted by law.</p>
        <p>We may restrict or terminate access where reasonably necessary to protect the service, users, third parties, or legal rights.</p>
      </InfoSection>

      <InfoSection id="general" eyebrow="12 / General" title="General terms & contact">
        <p>If any provision is found unenforceable, the remaining provisions continue in effect. A delay in enforcing a right is not a waiver. You may not transfer your rights under these terms without our consent; we may transfer ours as part of a reorganisation or transfer of the service.</p>
        <p>Mandatory consumer protections and any law that cannot contractually be displaced continue to apply. Otherwise, disputes should first be raised with us in good faith so we have an opportunity to resolve them.</p>
        <p>Questions about these terms can be sent to <a href={`mailto:${BRAND_EMAIL}?subject=Terms%20enquiry`}>{BRAND_EMAIL}</a>.</p>
      </InfoSection>
    </InstitutionalPage>
  );
}
