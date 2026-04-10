"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { CatImage } from "@/lib/catapi";
import { CatApiError, fetchCats } from "@/lib/catapi";
import {
  loadFavorites,
  toggleFavorite as persistToggleFavorite,
  type FavoriteCat,
} from "@/lib/favorites";
import { CatCard } from "./CatCard";
import { Header, type TabId } from "./Header";
import styles from "./HomeContent.module.css";

const PAGE_SIZE = 15;
/** Минимальный интервал между завершением одного запроса и началом следующего */
const MIN_GAP_MS = 800;
/** Задержка перед подгрузкой по sentinel (меньше лишних запросов подряд) */
const INTERSECTION_DEBOUNCE_MS = 400;
/** Если нет Retry-After при 429 — ждём перед повтором */
const RETRY_429_BASE_MS = 2500;
/** Сколько раз пробовать при 429 подряд (первая попытка + повторы) */
const MAX_FETCH_ATTEMPTS = 3;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
  const nextPageRef = useRef(0);
  const fetchBusyRef = useRef(false);
  const lastFetchFinishedRef = useRef(0);

  useEffect(() => {
    nextPageRef.current = nextPage;
  }, [nextPage]);

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

  const loadPage = useCallback(async (page: number, append: boolean) => {
    if (fetchBusyRef.current) return;
    fetchBusyRef.current = true;

    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    const gap = Math.max(
      0,
      MIN_GAP_MS - (Date.now() - lastFetchFinishedRef.current)
    );
    if (gap > 0) {
      await sleep(gap);
    }

    const fetchWith429Retries = async (): Promise<CatImage[]> => {
      let lastError: unknown;
      for (let attempt = 0; attempt < MAX_FETCH_ATTEMPTS; attempt++) {
        try {
          return await fetchCats(page, PAGE_SIZE);
        } catch (e) {
          lastError = e;
          if (
            e instanceof CatApiError &&
            e.status === 429 &&
            attempt < MAX_FETCH_ATTEMPTS - 1
          ) {
            const delay =
              e.retryAfterMs ?? RETRY_429_BASE_MS * (attempt + 1);
            await sleep(delay);
            continue;
          }
          throw e;
        }
      }
      throw lastError;
    };

    try {
      const batch = await fetchWith429Retries();
      setError(null);

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
      lastFetchFinishedRef.current = Date.now();
      fetchBusyRef.current = false;
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

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

    let debounceId: ReturnType<typeof setTimeout> | undefined;

    const obs = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (!entry?.isIntersecting) return;
        clearTimeout(debounceId);
        debounceId = setTimeout(() => {
          void loadPage(nextPageRef.current, true);
        }, INTERSECTION_DEBOUNCE_MS);
      },
      { root: null, rootMargin: "200px", threshold: 0 }
    );
    obs.observe(node);
    return () => {
      clearTimeout(debounceId);
      obs.disconnect();
    };
  }, [tab, hasMore, loadingMore, loading, loadPage]);

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
