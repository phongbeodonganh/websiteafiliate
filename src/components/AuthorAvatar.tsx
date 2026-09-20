'use client';

import { useState } from 'react';
import PublicArticleImage, { ARTICLE_PLACEHOLDER } from './PublicArticleImage';

interface AuthorAvatarProps {
  className: string;
  name: string;
  src?: string;
}

export default function AuthorAvatar({ className, name, src }: AuthorAvatarProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const initial = name.trim().charAt(0).toUpperCase() || 'A';
  const isImageSource = Boolean(src && (src.startsWith('/') || /^https?:\/\//i.test(src)));
  const showImage = Boolean(isImageSource && src && !src.endsWith(ARTICLE_PLACEHOLDER) && failedSrc !== src);

  return (
    <div className={className} aria-hidden="true">
      {showImage
        ? <PublicArticleImage src={src} alt="" loading="lazy" onError={() => setFailedSrc(src || null)} />
        : <span>{initial}</span>}
    </div>
  );
}
