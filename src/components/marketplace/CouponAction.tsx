"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";

export default function CouponAction({ code, href, className = "" }: { code?: string; href: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);

  async function activateDeal() {
    // noopener can return null even when the tab opens successfully.
    window.open(href, "_blank", "noopener,noreferrer");
    if (code) {
      try {
        await navigator.clipboard.writeText(code);
        setCopied(true);
        setCopyFailed(false);
        window.setTimeout(() => setCopied(false), 2400);
      } catch {
        setCopied(false);
        setCopyFailed(true);
      }
    }
  }

  return (
    <button type="button" className={className} onClick={activateDeal} aria-label={code ? `Copy code ${code} and open store` : "Open deal in a new tab"}>
      {copied ? <Check aria-hidden="true" /> : code ? <Copy aria-hidden="true" /> : <ExternalLink aria-hidden="true" />}
      <span aria-live="polite">{copied ? "Code copied" : copyFailed ? `Copy manually: ${code}` : code ? "Copy code & get deal" : "Get deal"}</span>
    </button>
  );
}
