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
  title: 'Privacy Policy',
  description: 'How AIDEALSUK collects, uses, protects, and shares information when you use our website and newsletter.',
  path: '/privacy-policy',
});

const UPDATED = '4 September 2026';
const navItems = [
  { id: 'scope', label: 'Scope & controller' },
  { id: 'collection', label: 'Information we collect' },
  { id: 'use', label: 'How we use information' },
  { id: 'legal-bases', label: 'Legal bases' },
  { id: 'sharing', label: 'How information is shared' },
  { id: 'cookies', label: 'Cookies & external links' },
  { id: 'retention', label: 'Retention & security' },
  { id: 'rights', label: 'Your privacy rights' },
  { id: 'international', label: 'International processing' },
  { id: 'children', label: 'Children' },
  { id: 'changes', label: 'Changes & contact' },
];

export default function PrivacyPolicyPage() {
  return (
    <InstitutionalPage
      eyebrow="Privacy Policy"
      title="Your data, explained plainly."
      description="This policy describes what AIDEALSUK collects, why we use it, when it may be shared, and the choices available to you."
      documentCode="PRIVACY / 001"
      statusLabel="Current policy"
      updated={UPDATED}
      navItems={navItems}
      readingTime="9 minute read"
      asideTitle="Privacy request?"
      asideCopy={`Email ${BRAND_EMAIL} with “Privacy request” in the subject line.`}
    >
      <InfoSection id="scope" eyebrow="01 / Scope" title="Scope & controller">
        <p>This Privacy Policy applies when you browse aidealsuk.com, subscribe to the AIDEALSUK Insider newsletter, contact us, or follow an affiliate link served through our website.</p>
        <p>AIDEALSUK is responsible for deciding how information collected through these services is used. References to “AIDEALSUK”, “we”, “us”, or “our” in this policy refer to the operator of this website.</p>
        <InfoCallout title="Questions about this policy" tone="accent">
          <p>Contact <a href={`mailto:${BRAND_EMAIL}?subject=Privacy%20request`}>{BRAND_EMAIL}</a>. Please do not send identity documents unless we specifically request them for verification.</p>
        </InfoCallout>
      </InfoSection>

      <InfoSection id="collection" eyebrow="02 / Collection" title="Information we collect">
        <h3>Information you provide</h3>
        <ul>
          <li><strong>Newsletter details:</strong> your email address, subscription date, and delivery status when you join AIDEALSUK Insider.</li>
          <li><strong>Communications:</strong> your email address, name if supplied, message, and any information you choose to include when contacting us.</li>
        </ul>
        <h3>Information collected through use</h3>
        <ul>
          <li><strong>Affiliate interaction data:</strong> the article or placement associated with a partner-link click, the partner offer selected, time of interaction, and IP address.</li>
          <li><strong>Technical records:</strong> standard server and security logs may include IP address, request time, browser or device information, requested URL, and diagnostic information.</li>
        </ul>
        <p>We do not ask public-site visitors to create an account, and we do not collect payment card information through the public website.</p>
      </InfoSection>

      <InfoSection id="use" eyebrow="03 / Purpose" title="How we use information">
        <CheckList>
          <CheckItem>Deliver the newsletter or confirmation you requested and manage the subscriber list.</CheckItem>
          <CheckItem>Answer enquiries, review corrections, and administer partnerships.</CheckItem>
          <CheckItem>Measure aggregate interest in articles and partner offers.</CheckItem>
          <CheckItem>Detect misuse, block unsafe destinations, secure the website, and diagnose errors.</CheckItem>
          <CheckItem>Maintain business, compliance, and dispute-resolution records where necessary.</CheckItem>
        </CheckList>
        <p>We do not sell personal information. We do not use newsletter addresses to make automated decisions that produce legal or similarly significant effects.</p>
      </InfoSection>

      <InfoSection id="legal-bases" eyebrow="04 / Basis" title="Legal bases">
        <p>Where data-protection law requires a legal basis, we generally rely on:</p>
        <ul>
          <li><strong>Consent</strong> to send newsletter communications that you requested. You may withdraw consent at any time.</li>
          <li><strong>Legitimate interests</strong> in operating and securing the website, responding to messages, understanding content and offer performance, preventing fraud, and improving our publishing service—balanced against your rights.</li>
          <li><strong>Performance of a contract or pre-contract steps</strong> when dealing with a partnership or another agreement you request.</li>
          <li><strong>Legal obligations and legal claims</strong> where records must be kept or used to comply with law or protect legal rights.</li>
        </ul>
      </InfoSection>

      <InfoSection id="sharing" eyebrow="05 / Recipients" title="How information is shared">
        <p>We disclose information only as reasonably necessary to run the service, respond to lawful requests, or protect rights. Recipients may include:</p>
        <ul>
          <li>Hosting, database, storage, security, and infrastructure providers.</li>
          <li>Email-delivery providers used to send requested communications.</li>
          <li>Professional advisers, regulators, courts, or law-enforcement bodies where disclosure is required or appropriate.</li>
          <li>A successor or transaction participant if the website or its business is reorganised, sold, or transferred, subject to appropriate safeguards.</li>
        </ul>
        <p>Affiliate partners do not receive your newsletter email from us merely because you click a partner link. Once you visit a third-party website, that provider collects information under its own privacy terms.</p>
      </InfoSection>

      <InfoSection id="cookies" eyebrow="06 / Browser data" title="Cookies & external links">
        <p>The public AIDEALSUK website does not currently use non-essential advertising cookies. Essential technical storage may be used where necessary for security or site operation.</p>
        <p>Affiliate destinations and other third-party websites may set their own cookies, pixels, or similar technologies after you leave AIDEALSUK. Those technologies are controlled by the third party, not by us. Review the destination’s privacy and cookie information before providing data or changing your browser settings.</p>
        <InfoCallout title="Affiliate tracking">
          <p>Our redirect records the selected offer and related page so we can attribute aggregate performance. The destination may use its own referral cookie to recognise a qualifying transaction.</p>
        </InfoCallout>
      </InfoSection>

      <InfoSection id="retention" eyebrow="07 / Lifecycle" title="Retention & security">
        <p>We retain information only for as long as reasonably necessary for the purpose collected, including legal, accounting, security, and dispute-resolution needs. Newsletter records are generally kept while you remain subscribed; communications and technical logs are retained according to operational need.</p>
        <p>We use organisational and technical safeguards intended to protect information against unauthorised access, alteration, loss, or disclosure. No internet transmission or storage method is completely secure, so absolute security cannot be guaranteed.</p>
      </InfoSection>

      <InfoSection id="rights" eyebrow="08 / Control" title="Your privacy rights">
        <p>Depending on where you live, you may have rights to:</p>
        <CheckList>
          <CheckItem>Request access to or a copy of personal information we hold about you.</CheckItem>
          <CheckItem>Ask us to correct, delete, or restrict the use of your information.</CheckItem>
          <CheckItem>Object to certain processing or request data portability.</CheckItem>
          <CheckItem>Withdraw consent without affecting processing already carried out.</CheckItem>
          <CheckItem>Complain to the data-protection authority in your jurisdiction.</CheckItem>
        </CheckList>
        <p>To make a request, email <a href={`mailto:${BRAND_EMAIL}?subject=Privacy%20rights%20request`}>{BRAND_EMAIL}</a>. We may need to verify your request and may retain limited information where legally permitted or required.</p>
      </InfoSection>

      <InfoSection id="international" eyebrow="09 / Location" title="International processing">
        <p>Our providers and readers may be located in different countries. Information may therefore be processed outside the country where you live. Where required, we use contractual or other recognised safeguards intended to protect transferred information.</p>
      </InfoSection>

      <InfoSection id="children" eyebrow="10 / Age" title="Children">
        <p>AIDEALSUK is intended for a general audience and is not directed to children under 16. We do not knowingly collect personal information from children. If you believe a child has provided information to us, contact us so we can investigate and take appropriate action.</p>
      </InfoSection>

      <InfoSection id="changes" eyebrow="11 / Updates" title="Changes & contact">
        <p>We may update this policy to reflect changes in our services, providers, or legal obligations. The “Updated” date identifies the current version. Material changes may also be highlighted on the website where appropriate.</p>
        <p>Privacy questions and rights requests can be sent to <a href={`mailto:${BRAND_EMAIL}?subject=Privacy%20request`}>{BRAND_EMAIL}</a>. You can also review our <Link href="/terms">Terms &amp; Conditions</Link> and <Link href="/affiliate-disclosure">Affiliate Disclosure</Link>.</p>
      </InfoSection>
    </InstitutionalPage>
  );
}
