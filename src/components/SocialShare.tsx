'use client';

import { Check, Copy, Share2 } from 'lucide-react';
import { useState } from 'react';
import styles from './SocialShare.module.css';

interface SocialShareProps {
  title: string;
}

export default function SocialShare({ title }: SocialShareProps) {
  const [copied, setCopied] = useState(false);

  const currentUrl = () => window.location.href;

  const openShareWindow = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer,width=720,height=620');
  };

  const shareOn = (network: 'facebook' | 'x' | 'linkedin') => {
    const url = encodeURIComponent(currentUrl());
    const text = encodeURIComponent(title);
    const targets = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      x: `https://twitter.com/intent/tweet?url=${url}&text=${text}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
    };
    openShareWindow(targets[network]);
  };

  const copyLink = async () => {
    const url = currentUrl();
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const input = document.createElement('textarea');
      input.value = url;
      input.style.position = 'fixed';
      input.style.opacity = '0';
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      input.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const shareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, url: currentUrl() });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
      }
    }
    await copyLink();
  };

  return (
    <section className={styles.share} aria-labelledby="share-heading">
      <p>Share To</p>
      <div className={styles.headingRow}>
        <h2 id="share-heading">Social Media</h2>
        <Share2 aria-hidden="true" size={22} />
      </div>
      <div className={styles.actions}>
        <button type="button" onClick={() => shareOn('facebook')} aria-label="Share on Facebook"><span>f</span> Facebook</button>
        <button type="button" onClick={() => shareOn('x')} aria-label="Share on X"><span>𝕏</span> X</button>
        <button type="button" onClick={() => shareOn('linkedin')} aria-label="Share on LinkedIn"><span>in</span> LinkedIn</button>
        <button type="button" onClick={shareNative}><Share2 size={15} /> Share</button>
        <button type="button" onClick={copyLink}>{copied ? <Check size={15} /> : <Copy size={15} />}{copied ? 'Copied' : 'Copy link'}</button>
      </div>
    </section>
  );
}
