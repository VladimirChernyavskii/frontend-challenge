import { ensureHttps } from "./imageUrl";

export type CatImage = {
  id: string;
  url: string;
  width: number;
  height: number;
};

const API_BASE = "https://api.thecatapi.com/v1";

export async function fetchCats(
  page: number,
  limit = 15
): Promise<CatImage[]> {
  const key = process.env.NEXT_PUBLIC_CATAPI_KEY;
  const url = new URL(`${API_BASE}/images/search`);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("page", String(page));

  const res = await fetch(url.toString(), {
    headers: key ? { "x-api-key": key } : {},
  });

  if (!res.ok) {
    throw new Error(`Не удалось загрузить котиков (${res.status})`);
  }

  const data: unknown = await res.json();
  if (!Array.isArray(data)) {
    return [];
  }

  const rows = data.filter(
    (item): item is CatImage =>
      typeof item === "object" &&
      item !== null &&
      "id" in item &&
      "url" in item &&
      typeof (item as CatImage).id === "string" &&
      typeof (item as CatImage).url === "string"
  );

  return rows.map((item) => ({
    ...item,
    url: ensureHttps(item.url),
  }));
}
