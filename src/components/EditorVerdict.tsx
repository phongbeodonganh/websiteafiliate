import React from 'react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';

interface EditorVerdictProps {
  articleId: string;
  toolName: string;
  verdict?: string;
  pros?: string[];
  cons?: string[];
  affiliateLinkId: string;
  commission?: string;
}

/**
 * "Editor's Verdict" inline recommendation card.
 *
 * Designed to sit *inside* the article reading flow, using the same
 * typographic language as the editorial content.  The teal left-border
 * and "EDITOR'S VERDICT" label are the only visual cues that this is
 * a recommendation — no flashy colors, no fake star ratings.
 */
export default function EditorVerdict({
  articleId,
  toolName,
  verdict,
  pros = [],
  cons = [],
  affiliateLinkId,
  commission,
}: EditorVerdictProps) {
  const trackingUrl = `/api/v1/public/tracking/redirect?article_id=${articleId}&affiliate_link_id=${affiliateLinkId}`;

  return (
    <aside className="editor-verdict" data-motion="rise" aria-label={`Editorial recommendation for ${toolName}`}>
      <p className="editor-verdict-label">
        <CheckCircle2 size={13} /> Editor&apos;s Verdict
      </p>

      <h4>{toolName}</h4>

      {verdict && (
        <p className="editor-verdict-oneliner">&ldquo;{verdict}&rdquo;</p>
      )}

      {(pros.length > 0 || cons.length > 0) && (
        <div className="editor-verdict-pros-cons">
          {pros.length > 0 && (
            <ul className="editor-verdict-pros">
              {pros.map((pro, i) => (
                <li key={`pro-${i}`}>{pro}</li>
              ))}
            </ul>
          )}
          {cons.length > 0 && (
            <ul className="editor-verdict-cons">
              {cons.map((con, i) => (
                <li key={`con-${i}`}>{con}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {commission && (
        <p style={{ fontSize: 12, color: 'var(--editorial-muted)', margin: '0 0 14px' }}>
          Commission: <strong style={{ color: 'var(--editorial-ink)' }}>{commission}</strong>
        </p>
      )}

      <a
        href={trackingUrl}
        target="_blank"
        rel="nofollow sponsored"
        className="verdict-cta"
      >
        Try {toolName} <ArrowRight size={14} className="cta-arrow" />
      </a>
    </aside>
  );
}
