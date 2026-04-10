/**
 * Next.js `basePath` и публичные ассеты ожидают путь `/repo`, не полный URL GitHub Pages.
 */
export function normalizeBasePath(raw: string | undefined): string {
  const t = (raw ?? "").trim();
  if (!t) return "";
  try {
    if (/^https?:\/\//i.test(t)) {
      const path = new URL(t).pathname.replace(/\/$/, "");
      return path || "";
    }
  } catch {
    /* ignore */
  }
  let path = t.startsWith("/") ? t : `/${t}`;
  path = path.replace(/\/$/, "");
  return path === "/" ? "" : path;
}
