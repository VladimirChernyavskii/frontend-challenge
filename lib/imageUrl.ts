/** Нормализует URL картинки с CDN (избегаем mixed content и protocol-relative URL). */
export function ensureHttps(imageUrl: string): string {
  const t = imageUrl.trim();
  if (t.startsWith("//")) return `https:${t}`;
  if (t.startsWith("http://")) return `https://${t.slice(7)}`;
  return t;
}

/**
 * В development картинки с CDN The Cat API отдаём через same-origin rewrite
 * (см. `next.config.ts`), чтобы обойти нестабильные соединения при прямом запросе к CDN.
 * В production — прямой URL (статический экспорт без сервера Next).
 */
export function imageSrcForBrowser(imageUrl: string): string {
  const u = ensureHttps(imageUrl);
  if (process.env.NODE_ENV !== "development") {
    return u;
  }
  try {
    const parsed = new URL(u);
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
    if (parsed.hostname === "cdn2.thecatapi.com") {
      return `${basePath}/thecat-cdn${parsed.pathname}${parsed.search}`;
    }
    if (parsed.hostname === "cdn.thecatapi.com") {
      return `${basePath}/thecat-cdn-legacy${parsed.pathname}${parsed.search}`;
    }
  } catch {
    /* ignore */
  }
  return u;
}
