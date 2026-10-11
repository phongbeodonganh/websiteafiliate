"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";

export default function CouponAction({ code, href, className = "" }: { code?: string; href: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  async function activateDeal() {
    const opened = window.open(href, "_blank", "noopener,noreferrer");
    if (code) {
      try {
        await navigator.clipboard.writeText(code);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2400);
      } catch {
        setCopied(false);
      }
    }
    if (!opened) window.location.assign(href);
  }

  return (
    <button type="button" className={className} onClick={activateDeal} aria-label={code ? `Copy code ${code} and open store` : "Open deal in a new tab"}>
      {copied ? <Check aria-hidden="true" /> : code ? <Copy aria-hidden="true" /> : <ExternalLink aria-hidden="true" />}
      <span>{copied ? "Code copied" : code ? "Copy code & get deal" : "Get deal"}</span>
    </button>
  );
}
