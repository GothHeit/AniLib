import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

import { redirect } from "@/i18n/navigation";
import { serverApi } from "@/lib/server-api";
import { pickEpisode } from "@/lib/watch-target";

/**
 * Opens an episode without knowing its source, e.g. from a Continue watching card: picks the
 * first source that has the title, clamps the episode to what it lists and redirects to the
 * player. Falls back to the title page when nothing can play it.
 */
export default async function WatchAnyPage({ params }: PageProps<"/[locale]/continue/[id]/[episode]">) {
  const { locale, id: rawId, episode: rawEpisode } = await params;
  setRequestLocale(locale);
  const id = Number(rawId);
  const wanted = Number(rawEpisode);
  if (!Number.isInteger(id) || id < 1 || !Number.isInteger(wanted) || wanted < 0) notFound();

  const api = await serverApi();
  const sources = (
    await api.GET("/anime/{anime_id}/sources", { params: { path: { anime_id: id } } }).catch(() => undefined)
  )?.data?.sources;
  const source = sources?.[0];
  if (!source) return redirect({ href: `/anime/${id}`, locale });

  const episodes = (
    await api
      .GET("/watch/{source}/{anime_id}/episodes", { params: { path: { source, anime_id: id } } })
      .catch(() => undefined)
  )?.data?.episodes;
  const episode = pickEpisode(episodes ?? [], wanted);
  if (episode === null) return redirect({ href: `/anime/${id}`, locale });
  return redirect({ href: `/watch/${source}/${id}/${episode}`, locale });
}
