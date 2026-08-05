/** Bildvorschau, die den Blob aus IndexedDB nachlädt. */

import { useEffect, useState } from 'react';
import { ImageOff } from 'lucide-react';
import { getImageUrl } from '../../lib/images';
import { cx } from '../../lib/utils';

/** Lädt die Object-URL zu einer Bild-ID (oder null, wenn es das Bild nicht gibt). */
export function useImageUrl(id: string | undefined, variant: 'thumb' | 'full' = 'thumb') {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!id) {
      setUrl(null);
      return;
    }
    void getImageUrl(id, variant).then((u) => {
      if (active) setUrl(u);
    });
    return () => {
      active = false;
    };
  }, [id, variant]);

  return url;
}

export function Thumb({
  imageId,
  alt = '',
  className,
  fit = 'cover',
  rounded = 'rounded-xl',
}: {
  imageId?: string;
  alt?: string;
  className?: string;
  fit?: 'cover' | 'contain';
  rounded?: string;
}) {
  const url = useImageUrl(imageId, 'thumb');

  if (!imageId || !url) {
    return (
      <div
        className={cx(
          'grid place-items-center bg-cream-200 text-ink-faint',
          rounded,
          className,
        )}
        aria-hidden
      >
        <ImageOff size={20} strokeWidth={1.5} />
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={alt}
      loading="lazy"
      draggable={false}
      className={cx(fit === 'cover' ? 'object-cover' : 'object-contain', rounded, className)}
    />
  );
}
