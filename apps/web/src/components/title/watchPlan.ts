import { cache } from "react";

import { serverApi } from "@/lib/server-api";

import { nextUp, type NextUp, type Progress } from "./resume";

export type WatchPlan = {
  source: string;
  episodes: number[];
  progress: Progress[];
  /** Episode number -> still image from the source (proxied, relative to the API). */
  thumbnails: Record<string, string>;
  next: NextUp;
  href: string;
};

/**
 * What the title page can offer to play: the first source that has the title, its episodes and
 * the user's progress. Resolved apart from the details so the page shows up without waiting on
 * a scraper; every part of the page that needs it shares one lookup per request. Null when the
 * title can only be tracked, including when any of the calls fail.
 */
export const watchPlan = cache(async (id: number): Promise<WatchPlan | null> => {
  const api = await serverApi();
  const sources = (
    await api.GET("/anime/{anime_id}/sources", { params: { path: { anime_id: id } } }).catch(() => undefined)
  )?.data?.sources;
  const source = sources?.[0];
  if (!source) return null;

  const [episodesResult, progressResult] = await Promise.all([
    api
      .GET("/watch/{source}/{anime_id}/episodes", { params: { path: { source, anime_id: id } } })
      .catch(() => undefined),
    api.GET("/me/progress/{anime_id}", { params: { path: { anime_id: id } } }).catch(() => undefined),
  ]);
  const episodes = [...(episodesResult?.data?.episodes ?? [])].sort((a, b) => a - b);
  const progress = progressResult?.data ?? [];
  const next = nextUp(progress, episodes);
  if (!next) return null;
  const thumbnails = episodesResult?.data?.thumbnails ?? {};
  return { source, episodes, progress, thumbnails, next, href: `/watch/${source}/${id}/${next.episode}` };
});
