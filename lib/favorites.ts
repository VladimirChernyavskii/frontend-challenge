import type { CatImage } from "./catapi";

export type FavoriteCat = Pick<CatImage, "id" | "url">;

const STORAGE_KEY = "cat-pinterest-favorites";

function readRaw(): FavoriteCat[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is FavoriteCat =>
        typeof item === "object" &&
        item !== null &&
        "id" in item &&
        "url" in item &&
        typeof (item as FavoriteCat).id === "string" &&
        typeof (item as FavoriteCat).url === "string"
    );
  } catch {
    return [];
  }
}

function write(list: FavoriteCat[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function loadFavorites(): FavoriteCat[] {
  return readRaw();
}

export function isFavoriteId(id: string): boolean {
  return readRaw().some((c) => c.id === id);
}

/** Returns true if cat is favorite after toggle. */
export function toggleFavorite(cat: FavoriteCat): boolean {
  const list = readRaw();
  const i = list.findIndex((c) => c.id === cat.id);
  if (i >= 0) {
    list.splice(i, 1);
    write(list);
    return false;
  }
  list.push(cat);
  write(list);
  return true;
}
