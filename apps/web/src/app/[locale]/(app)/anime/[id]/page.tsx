import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { EpisodeList } from "@/components/title/EpisodeList";
import { nextUp } from "@/components/title/resume";
import { TitleHeader } from "@/components/title/TitleHeader";
import { PosterCard } from "@/components/ui/PosterCard";
import { Row } from "@/components/ui/Row";
import { APP_NAME } from "@/lib/brand";
import { serverApi, unwrap } from "@/lib/server-api";

function parseId(raw: string) {
  const id = Number(raw);
  if (!Number.isInteger(id) || id < 1) notFound();
  return id;
}

// The metadata and the page share one details call per request.
const details = cache(async (id: number) =>
  (await serverApi()).GET("/anime/{anime_id}", { params: { path: { anime_id: id } } }),
);

export async function generateMetadata({ params }: PageProps<"/[locale]/anime/[id]">): Promise<Metadata> {
  const { id } = await params;
  const { data } = await details(parseId(id));
  return { title: data ? `${data.title} · ${APP_NAME}` : APP_NAME };
}

export default async function TitlePage({ params }: PageProps<"/[locale]/anime/[id]">) {
  const { locale, id: rawId } = await params;
  setRequestLocale(locale);
  const id = parseId(rawId);
  const t = await getTranslations("titlePage");
  const api = await serverApi();

  const [anime, progressResult, listResult] = await Promise.all([
    unwrap(details(id), locale),
    api.GET("/me/progress/{anime_id}", { params: { path: { anime_id: id } } }),
    // Without it the picker just starts empty, so a MAL hiccup never blocks the page.
    api.GET("/me/animelist/{anime_id}", { params: { path: { anime_id: id } } }).catch(() => undefined),
  ]);
  const progress = progressResult.data ?? [];
  const listStatus = listResult?.data?.status ?? null;

  // The details call already probed the sources and cached the list, so this is quick. Any
  // failure just leaves the title as tracking only.
  const source = anime.available_sources?.[0];
  const episodes = source
    ? ((
        await api
          .GET("/watch/{source}/{anime_id}/episodes", { params: { path: { source, anime_id: id } } })
          .catch(() => undefined)
      )?.data?.episodes ?? [])
    : [];
  const sorted = [...episodes].sort((a, b) => a - b);
  const next = nextUp(progress, sorted);
  const watch = source && next ? { href: `/watch/${source}/${id}/${next.episode}`, next } : null;

  return (
    <>
      <TitleHeader anime={anime} watch={watch} listStatus={listStatus} />
      <div className="flex flex-col gap-10 py-6">
        {watch && source && (
          <EpisodeList source={source} animeId={id} episodes={sorted} progress={progress} current={next?.episode} />
        )}
        {!!anime.related_anime?.length && (
          <Row title={t("related")}>
            {anime.related_anime?.map((r) => (
              <PosterCard
                key={r.anime.id}
                href={`/anime/${r.anime.id}`}
                title={r.anime.title}
                image={r.anime.main_picture?.medium}
                caption={
                  t.has(`relation.${r.relation_type}`) ? t(`relation.${r.relation_type}`) : r.relation_type_formatted
                }
                seed={r.anime.id}
              />
            ))}
          </Row>
        )}
        {!!anime.recommendations?.length && (
          <Row title={t("recommended")}>
            {anime.recommendations?.map((r) => (
              <PosterCard
                key={r.anime.id}
                href={`/anime/${r.anime.id}`}
                title={r.anime.title}
                image={r.anime.main_picture?.medium}
                seed={r.anime.id}
              />
            ))}
          </Row>
        )}
      </div>
    </>
  );
}
