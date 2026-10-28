import { cache } from "react";

import { pickStream } from "@/lib/pick-stream";
import { serverApi } from "@/lib/server-api";
import { watchHref, type Lang } from "@/lib/watch-target";

import { nextUp, type NextUp, type Progress } from "./resume";

export type WatchPlan = {
  source: string;
  lang: Lang;
  episodes: number[];
  progress: Progress[];
  /** Episode number -> still image from the source (proxied, relative to the API). */
  thumbnails: Record<string, string>;
  next: NextUp;
  href: string;
};

/**
 * What the title page can offer to play: the source the user picked for this title in the player,
 * else the first source that has it (see pickStream), with its episodes and the user's progress.
 * Resolved apart from the details so the page shows up without waiting on a scraper; every part
 * of the page that needs it shares one lookup per request. Null when the title can only be
 * tracked, including when any of the calls fail.
 */
export const watchPlan = cache(async (id: number): Promise<WatchPlan | null> => {
  const api = await serverApi();
  const found = (
    await api.GET("/anime/{anime_id}/sources", { params: { path: { anime_id: id } } }).catch(() => undefined)
  )?.data;

  const [picked, progressResult] = await Promise.all([
    pickStream(found, async ({ source, lang }) =>
      (
        await api.GET("/watch/{source}/{anime_id}/episodes", {
          params: { path: { source, anime_id: id }, query: { lang } },
        })
      ).data,
    ),
    api.GET("/me/progress/{anime_id}", { params: { path: { anime_id: id } } }).catch(() => undefined),
  ]);
  if (!picked) return null;
  const { source, lang } = picked.choice;
  const episodes = [...picked.listed.episodes].sort((a, b) => a - b);
  const progress = progressResult?.data ?? [];
  const next = nextUp(progress, episodes);
  if (!next) return null;
  const thumbnails = picked.listed.thumbnails ?? {};
  return { source, lang, episodes, progress, thumbnails, next, href: watchHref(source, id, next.episode, lang) };
});
