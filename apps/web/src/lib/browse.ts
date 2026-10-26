export const SEASONS = ["winter", "spring", "summer", "fall"] as const;
export type Season = (typeof SEASONS)[number];

export type BrowseFilters = { genre?: number; year?: number; season?: Season };

/** The API rejects pages past this. */
export const MAX_PAGE = 50;

type Params = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

function int(v: string | string[] | undefined, min: number, max: number) {
  const s = first(v);
  const n = s && /^\d+$/.test(s) ? Number(s) : NaN;
  return n >= min && n <= max ? n : undefined;
}

/** Reads the URL, dropping anything the API would reject. A season only counts with a year. */
export function parseBrowse(params: Params, knownGenres: Set<number>) {
  const genre = int(params.genre, 1, 1_000_000);
  const year = int(params.year, 1960, 2100);
  const season = SEASONS.find((s) => s === first(params.season));
  const filters: BrowseFilters = {
    genre: genre && knownGenres.has(genre) ? genre : undefined,
    year,
    season: year ? season : undefined,
  };
  return { filters, page: int(params.page, 1, MAX_PAGE) ?? 1 };
}

/** Next year's titles are announced early, so the list starts one year ahead. */
export function yearOptions(now = new Date()) {
  const top = now.getFullYear() + 1;
  return Array.from({ length: top - 1960 + 1 }, (_, i) => top - i);
}
