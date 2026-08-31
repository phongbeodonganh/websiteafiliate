'use client';

import type { ImgHTMLAttributes, SyntheticEvent } from 'react';

export const ARTICLE_PLACEHOLDER = '/illustration-gallery-icon_53876-27002.avif';

type PublicArticleImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  src?: string | null;
};

export default function PublicArticleImage({
  src,
  alt = '',
  className = '',
  onError,
  ...props
}: PublicArticleImageProps) {
  const handleError = (event: SyntheticEvent<HTMLImageElement>) => {
    onError?.(event);
    const image = event.currentTarget;
    if (!image.src.endsWith(ARTICLE_PLACEHOLDER)) image.src = ARTICLE_PLACEHOLDER;
  };

  return (
    <img
      {...props}
      src={src || ARTICLE_PLACEHOLDER}
      alt={alt}
      className={`public-article-image ${className}`.trim()}
      onError={handleError}
    />
  );
}
