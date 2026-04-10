"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { CatImage } from "@/lib/catapi";
import { fetchCats } from "@/lib/catapi";
import {
  loadFavorites,
  toggleFavorite as persistToggleFavorite,
  type FavoriteCat,
} from "@/lib/favorites";
import { CatCard } from "./CatCard";
import { Header, type TabId } from "./Header";
import styles from "./HomeContent.module.css";

const PAGE_SIZE = 15;

export function HomeContent() {
  const [tab, setTab] = useState<TabId>("all");
  const [cats, setCats] = useState<CatImage[]>([]);
  const [nextPage, setNextPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [favorites, setFavorites] = useState<FavoriteCat[]>([]);

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const initialAllLoadStarted = useRef(false);

  const favoriteIds = useMemo(
    () => new Set(favorites.map((f) => f.id)),
    [favorites]
  );

  useEffect(() => {
    setFavorites(loadFavorites());
  }, []);

  const refreshFavorites = useCallback(() => {
    setFavorites(loadFavorites());
  }, []);

  const loadPage = useCallback(
    async (page: number, append: boolean) => {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError(null);
      try {
        const batch = await fetchCats(page, PAGE_SIZE);
        // API может вернуть меньше запрошенного лимита (например 10 вместо 15 на free tier).
        // Считаем, что есть следующая страница, пока приходит непустой ответ; заканчиваем на пустом батче.
        if (batch.length === 0) {
          setHasMore(false);
        } else {
          setHasMore(true);
          setNextPage(page + 1);
        }
        if (append) {
          setCats((prev) => {
            const seen = new Set(prev.map((c) => c.id));
            const merged = [...prev];
            for (const c of batch) {
              if (!seen.has(c.id)) {
                seen.add(c.id);
                merged.push(c);
              }
            }
            return merged;
          });
        } else {
          setCats(batch);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Ошибка загрузки");
        if (!append) {
          setCats([]);
        }
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    []
  );

  useEffect(() => {
    if (tab !== "all") return;
    if (initialAllLoadStarted.current) return;
    initialAllLoadStarted.current = true;
    void loadPage(0, false);
  }, [tab, loadPage]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || tab !== "all") return;
    if (!hasMore || loadingMore || loading) return;

    const obs = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (!entry?.isIntersecting) return;
        void loadPage(nextPage, true);
      },
      { root: null, rootMargin: "200px", threshold: 0 }
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [tab, hasMore, loadingMore, loading, nextPage, loadPage]);

  const handleToggleFavorite = useCallback((cat: FavoriteCat) => {
    persistToggleFavorite(cat);
    refreshFavorites();
  }, [refreshFavorites]);

  const handleTab = useCallback((t: TabId) => {
    setTab(t);
  }, []);

  const listForGrid: FavoriteCat[] =
    tab === "all"
      ? cats.map((c) => ({ id: c.id, url: c.url }))
      : favorites;

  return (
    <>
      <Header active={tab} onChange={handleTab} />
      <main className={styles.main}>
        {error && tab === "all" && (
          <div className={styles.message}>
            <p className={styles.error}>{error}</p>
            <button
              type="button"
              className={styles.retry}
              onClick={() => {
                setError(null);
                void loadPage(0, false);
              }}
            >
              Повторить
            </button>
          </div>
        )}
        {tab === "all" && loading && cats.length === 0 && !error && (
          <p className={styles.message}>Загружаем котиков…</p>
        )}
        {tab === "favorites" && favorites.length === 0 && (
          <p className={styles.message}>Пока нет любимых котиков</p>
        )}
        {(tab === "all" ? cats.length > 0 : favorites.length > 0) && (
          <div className={styles.grid}>
            {listForGrid.map((c) => (
              <CatCard
                key={c.id}
                id={c.id}
                url={c.url}
                isFavorite={favoriteIds.has(c.id)}
                onToggleFavorite={handleToggleFavorite}
              />
            ))}
          </div>
        )}
        {tab === "all" && (
          <>
            <div ref={sentinelRef} className={styles.sentinel} aria-hidden />
            {loadingMore && (
              <p className={styles.loadingFooter}>
                … загружаем еще котиков …
              </p>
            )}
          </>
        )}
      </main>
    </>
  );
}
