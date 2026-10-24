"use client";

import { useState } from "react";
import styles from "./homepage-discovery.module.css";

export default function DealStoreImage({ src, alt, name, compact = false, eager = false }: {
  src: string; alt: string; name: string; compact?: boolean; eager?: boolean;
}) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const initials = name.trim().split(/\s+/).slice(0, 2).map((word) => word[0]).join("").toUpperCase() || "TH";
  return <span className={`${styles.dealStoreImage} ${compact ? styles.dealStoreImageCompact : ""}`}>
    {src && failedSource !== src ? (
      // Store images share the CMS upload/CDN sources used by the store directory.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={alt || `${name} store`} width={192} height={144}
        loading={eager ? "eager" : "lazy"} decoding="async" onError={() => setFailedSource(src)} />
    ) : <span className={styles.dealStoreInitials} aria-hidden="true">{initials}</span>}
  </span>;
}
