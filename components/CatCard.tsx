"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FavoriteCat } from "@/lib/favorites";
import { imageSrcForBrowser } from "@/lib/imageUrl";
import styles from "./CatCard.module.css";

type CatCardProps = {
  id: string;
  url: string;
  alt?: string;
  isFavorite: boolean;
  onToggleFavorite: (cat: FavoriteCat) => void;
};

export function CatCard({
  id,
  url,
  alt = "Котик",
  isFavorite,
  onToggleFavorite,
}: CatCardProps) {
  const displayBase = useMemo(() => imageSrcForBrowser(url), [url]);
  const [src, setSrc] = useState(displayBase);
  const [broken, setBroken] = useState(false);
  const retryCount = useRef(0);

  const handleImgError = useCallback(() => {
    if (retryCount.current < 2) {
      retryCount.current += 1;
      const sep = displayBase.includes("?") ? "&" : "?";
      setSrc(`${displayBase}${sep}retry=${Date.now()}`);
      return;
    }
    setBroken(true);
  }, [displayBase]);

  useEffect(() => {
    setSrc(displayBase);
    setBroken(false);
    retryCount.current = 0;
  }, [displayBase]);

  return (
    <article className={styles.card}>
      {broken ? (
        <div className={styles.fallback} role="img" aria-label={alt}>
          Не удалось загрузить
        </div>
      ) : (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- внешние URL The Cat API */}
          <img
            className={styles.image}
            src={src}
            alt={alt}
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={handleImgError}
          />
        </>
      )}
      <button
        type="button"
        className={`${styles.heartWrap} ${isFavorite ? styles.favoriteBtn : ""} ${isFavorite ? styles.heartWrapVisible : ""}`}
        aria-label={isFavorite ? "Убрать из любимых" : "Добавить в любимые"}
        aria-pressed={isFavorite}
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavorite({ id, url });
        }}
      >
        <svg
          className={styles.icon}
          viewBox="0 0 24 24"
          aria-hidden
          focusable="false"
        >
          <path
            className={styles.path}
            d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
          />
        </svg>
      </button>
    </article>
  );
}
