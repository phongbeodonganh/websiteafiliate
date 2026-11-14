import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight, Handshake, Mail, MessageSquareText, Newspaper, ShieldAlert } from 'lucide-react';
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
  title: 'Contact',
  description: 'Contact the AIDEALSUK editorial, corrections, partnership, or privacy team.',
  path: '/contact',
});

const navItems = [
  { id: 'channels', label: 'Choose a channel' },
  { id: 'details', label: 'What to include' },
  { id: 'response', label: 'Response expectations' },
  { id: 'privacy', label: 'Privacy & safety' },
  { id: 'social', label: 'Social channels' },
];

const emailHref = (subject: string) => `mailto:${BRAND_EMAIL}?subject=${encodeURIComponent(subject)}`;

export default function ContactPage() {
  return (
    <InstitutionalPage
      eyebrow="Contact"
      title="Start with the right desk."
      description="Questions, corrections, and thoughtful partnership ideas are welcome. Choose the closest topic so we can understand your message quickly."
      documentCode="CONTACT / OPEN"
      statusLabel="Inbox monitored"
      navItems={navItems}
      readingTime="Replies typically within 2–3 business days"
      asideTitle="One public inbox"
      asideCopy={`All enquiries begin at ${BRAND_EMAIL}. A clear subject line helps us route your message.`}
    >
      <InfoSection id="channels" eyebrow="Get in touch" title="Choose a channel">
        <div className={styles.channelGrid}>
          <div className={styles.channelCard}>
            <MessageSquareText aria-hidden="true" />
            <h3>General enquiries</h3>
            <p>Questions about AIDEALSUK, our coverage, or how the website works.</p>
            <a href={emailHref('General enquiry')}>Email the team <ArrowUpRight aria-hidden="true" /></a>
          </div>
          <div className={styles.channelCard}>
            <Newspaper aria-hidden="true" />
            <h3>Editorial & corrections</h3>
            <p>Factual corrections, source material, story tips, or product update notices.</p>
            <a href={emailHref('Editorial enquiry or correction')}>Contact editorial <ArrowUpRight aria-hidden="true" /></a>
          </div>
          <div className={styles.channelCard}>
            <Handshake aria-hidden="true" />
            <h3>Partnerships</h3>
            <p>Relevant affiliate programmes, product access, and transparent commercial proposals.</p>
            <a href={emailHref('Partnership enquiry')}>Discuss a partnership <ArrowUpRight aria-hidden="true" /></a>
          </div>
          <div className={styles.channelCard}>
            <ShieldAlert aria-hidden="true" />
            <h3>Privacy & legal</h3>
            <p>Data requests, disclosure concerns, rights notices, or legal correspondence.</p>
            <a href={emailHref('Privacy or legal request')}>Contact the trust desk <ArrowUpRight aria-hidden="true" /></a>
          </div>
        </div>

        <InfoCallout title="Primary contact" tone="accent">
          <p>Email <a href={`mailto:${BRAND_EMAIL}`}>{BRAND_EMAIL}</a>. Please do not send passwords, payment card information, API keys, or other secrets.</p>
        </InfoCallout>
      </InfoSection>

      <InfoSection id="details" eyebrow="Help us help" title="What to include">
        <CheckList>
          <CheckItem>A concise subject line describing the request.</CheckItem>
          <CheckItem>The relevant AIDEALSUK page URL, where applicable.</CheckItem>
          <CheckItem>Supporting evidence for a correction or product claim.</CheckItem>
          <CheckItem>Your preferred name and the best email address for a reply.</CheckItem>
        </CheckList>
        <p>For partnership proposals, include the product website, the reader problem it solves, pricing, geographical availability, and the commercial relationship being proposed.</p>
      </InfoSection>

      <InfoSection id="response" eyebrow="Timing" title="Response expectations">
        <p>
          We aim to review genuine enquiries within two to three business days. Complex corrections, rights requests, and legal matters may require additional verification. Sending repeated copies can delay review.
        </p>
        <dl className={styles.detailGrid}>
          <div><dt>Inbox</dt><dd>{BRAND_EMAIL}</dd></div>
          <div><dt>Working language</dt><dd>English</dd></div>
          <div><dt>Editorial corrections</dt><dd>Evidence reviewed</dd></div>
          <div><dt>Unsolicited attachments</dt><dd>Please link instead</dd></div>
        </dl>
        <p>We cannot guarantee a reply to mass pitches, irrelevant promotions, requests for guaranteed positive coverage, or messages that appear unsafe.</p>
      </InfoSection>

      <InfoSection id="privacy" eyebrow="Safe contact" title="Privacy & safety">
        <p>
          Information you send is used to understand and respond to your enquiry, keep an appropriate business record, and protect our systems. Please share only what is necessary. Details about data rights and retention are available in our <Link href="/privacy-policy">Privacy Policy</Link>.
        </p>
        <InfoCallout title="No paid verdicts">
          <p>Product access or a commercial proposal does not guarantee coverage, placement, or a favourable review.</p>
        </InfoCallout>
      </InfoSection>

      <InfoSection id="social" eyebrow="Follow" title="Social channels">
        <p>For published stories and public updates, you can also find AIDEALSUK on these channels. Account-specific or private matters should still be sent by email.</p>
        <div className={styles.channelGrid}>
          <div className={styles.channelCard}>
            <Mail aria-hidden="true" />
            <h3>Telegram</h3>
            <p>News and community updates from the AIDEALSUK desk.</p>
            <a href="https://t.me/aidealsuk" target="_blank" rel="noopener noreferrer">Open Telegram <ArrowUpRight aria-hidden="true" /></a>
          </div>
          <div className={styles.channelCard}>
            <Mail aria-hidden="true" />
            <h3>X / Twitter</h3>
            <p>New articles, concise takeaways, and editorial updates.</p>
            <a href="https://x.com/aidealsuk" target="_blank" rel="noopener noreferrer">Open X <ArrowUpRight aria-hidden="true" /></a>
          </div>
        </div>
      </InfoSection>
    </InstitutionalPage>
  );
}
