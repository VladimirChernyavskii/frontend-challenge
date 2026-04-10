import { ensureHttps } from "./imageUrl";

export class CatApiError extends Error {
  readonly status: number;
  /** миллисекунды ожидания, если сервер прислал Retry-After */
  readonly retryAfterMs?: number;

  constructor(message: string, status: number, retryAfterMs?: number) {
    super(message);
    this.name = "CatApiError";
    this.status = status;
    this.retryAfterMs = retryAfterMs;
  }
}

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
  if (key) {
    url.searchParams.set("api_key", key);
  }

  const res = await fetch(url.toString(), {
    headers: key ? { "x-api-key": key } : {},
  });

  if (!res.ok) {
    let retryAfterMs: number | undefined;
    if (res.status === 429) {
      const ra = res.headers.get("Retry-After");
      if (ra) {
        const sec = parseInt(ra, 10);
        if (!Number.isNaN(sec) && sec >= 0) {
          retryAfterMs = sec * 1000;
        }
      }
    }
    throw new CatApiError(
      `Не удалось загрузить котиков (${res.status})`,
      res.status,
      retryAfterMs
    );
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
