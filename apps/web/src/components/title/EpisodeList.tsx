"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { gradientFor } from "@/components/ui/PosterCard";
import { Link } from "@/i18n/navigation";

import { progressRatio, type Progress } from "./resume";

// Long shows are split into pages so the list stays quick to scan.
export const PAGE_SIZE = 100;

export function pageOf(episodes: number[], episode: number) {
  return Math.max(0, Math.floor(Math.max(episodes.indexOf(episode), 0) / PAGE_SIZE));
}

type Props = {
  source: string;
  animeId: number;
  episodes: number[];
  progress: Progress[];
  /** Page shown first: the one holding the episode the primary button opens. */
  current?: number;
  /** Episode number -> still image from the source (proxied, relative to the API). */
  thumbnails?: Record<string, string>;
  /** Title art shown on episodes the source has no image for. */
  fallbackImage?: string;
};

export function EpisodeList({ source, animeId, episodes, progress, current, thumbnails, fallbackImage }: Props) {
  const t = useTranslations("titlePage");
  const [page, setPage] = useState(current === undefined ? 0 : pageOf(episodes, current));
  const pages = Math.ceil(episodes.length / PAGE_SIZE);
  const shown = episodes.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const byEpisode = new Map(progress.map((p) => [p.episode, p]));

  return (
    <section aria-labelledby="episodes-heading" className="px-4 sm:px-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 id="episodes-heading" className="text-lg font-bold">
          {t("episodeList")}
        </h2>
        {pages > 1 && (
          <label className="text-sm text-muted">
            <span className="sr-only">{t("range")}</span>
            <select
              value={page}
              onChange={(e) => setPage(Number(e.target.value))}
              className="rounded-ui border border-line bg-surface px-3 py-1.5 text-fg"
            >
              {Array.from({ length: pages }, (_, i) => {
                const slice = episodes.slice(i * PAGE_SIZE, (i + 1) * PAGE_SIZE);
                return (
                  <option key={i} value={i}>
                    {slice[0]}–{slice[slice.length - 1]}
                  </option>
                );
              })}
            </select>
          </label>
        )}
      </div>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {shown.map((ep) => {
          const p = byEpisode.get(ep);
          const ratio = progressRatio(p);
          const pct = ratio === undefined ? undefined : Math.round(ratio * 100);
          const still = thumbnails?.[ep];
          const image = still ? `/api/proxy${still}` : fallbackImage;
          return (
            <li key={ep}>
              <Link href={`/watch/${source}/${animeId}/${ep}`} className="group block">
                <div
                  className={`relative flex aspect-video items-center justify-center overflow-hidden rounded-ui border border-line transition-transform group-hover:scale-[1.03] group-focus-visible:scale-[1.03] ${gradientFor(animeId + ep)}`}
                >
                  {image && (
                    // eslint-disable-next-line @next/next/no-img-element -- stills come from the source or the catalog
                    <img
                      src={image}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className={`absolute inset-0 h-full w-full object-cover ${still ? "" : "scale-110 opacity-40 blur-[2px]"}`}
                    />
                  )}
                  <span aria-hidden="true" className="relative font-display text-xl font-bold text-fg/90 drop-shadow">
                    {t("episodeShort", { episode: ep })}
                  </span>
                  {pct !== undefined && (
                    <div
                      role="progressbar"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={pct}
                      aria-label={t("episode", { episode: ep })}
                      className="absolute inset-x-0 bottom-0 h-1 bg-black/50"
                    >
                      <div className={`h-full ${p?.completed ? "bg-success" : "bg-accent"}`} style={{ width: `${pct}%` }} />
                    </div>
                  )}
                </div>
                <p className="mt-2 text-sm font-medium">
                  {t("episode", { episode: ep })}
                  {p?.completed && <span className="ml-2 text-xs text-success">{t("watched")}</span>}
                </p>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
