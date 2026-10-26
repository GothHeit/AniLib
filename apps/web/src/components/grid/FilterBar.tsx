"use client";

import { useTranslations } from "next-intl";

import { useRouter } from "@/i18n/navigation";
import { genreName } from "@/lib/genres";
import { SEASONS, type BrowseFilters } from "@/lib/browse";

type Genre = { id: number; name: string };

const select =
  "w-full rounded-ui border border-line bg-surface px-3 py-2 text-sm focus:border-accent disabled:opacity-50";

/** Genre, year and season selects. Every change rewrites the URL, so a filtered view is a link. */
export function FilterBar({
  genres,
  filters,
  years,
}: {
  genres: Genre[];
  filters: BrowseFilters;
  years: number[];
}) {
  const t = useTranslations("browse");
  const tGenres = useTranslations("genres");
  const router = useRouter();

  function change(next: Partial<BrowseFilters>) {
    const merged = { ...filters, ...next };
    if (!merged.year) merged.season = undefined; // the API needs a year for a season
    const query: Record<string, string> = {};
    if (merged.genre) query.genre = String(merged.genre);
    if (merged.year) query.year = String(merged.year);
    if (merged.season) query.season = merged.season;
    router.replace({ pathname: "/browse", query });
  }

  const label = "block text-xs font-medium text-muted";
  const any = <option value="">{t("any")}</option>;

  return (
    <form
      role="search"
      aria-label={t("filters")}
      onSubmit={(e) => e.preventDefault()}
      className="grid grid-cols-2 gap-3 sm:grid-cols-4"
    >
      <label className="col-span-2 sm:col-span-1">
        <span className={label}>{t("genre")}</span>
        <select
          className={select}
          value={filters.genre ?? ""}
          onChange={(e) => change({ genre: e.target.value ? Number(e.target.value) : undefined })}
        >
          {any}
          {genres.map((g) => (
            <option key={g.id} value={g.id}>
              {genreName(tGenres, g)}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span className={label}>{t("year")}</span>
        <select
          className={select}
          value={filters.year ?? ""}
          onChange={(e) => change({ year: e.target.value ? Number(e.target.value) : undefined })}
        >
          {any}
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span className={label}>{t("season")}</span>
        <select
          className={select}
          value={filters.season ?? ""}
          disabled={!filters.year}
          title={filters.year ? undefined : t("seasonNeedsYear")}
          onChange={(e) => change({ season: (e.target.value || undefined) as BrowseFilters["season"] })}
        >
          {any}
          {SEASONS.map((s) => (
            <option key={s} value={s}>
              {t(`seasons.${s}`)}
            </option>
          ))}
        </select>
      </label>
      <div className="col-span-2 flex items-end sm:col-span-1">
        <button
          type="button"
          onClick={() => router.replace("/browse")}
          className="rounded-ui px-3 py-2 text-sm text-muted hover:bg-surface hover:text-fg"
        >
          {t("clear")}
        </button>
      </div>
    </form>
  );
}
