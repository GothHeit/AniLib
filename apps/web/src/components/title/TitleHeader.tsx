import type { components } from "@app/api-client";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { gradientFor } from "@/components/ui/PosterCard";
import { genreName } from "@/lib/genres";

import { AddToList, type ListState } from "./AddToList";

type Details = components["schemas"]["AnimeDetailsOut"];

type Props = {
  anime: Details;
  /** Streamed in once the sources are known: the "watch here" badge, the play button and the hint. */
  badge: ReactNode;
  play: ReactNode;
  hint: ReactNode;
  list: ListState;
};

export async function TitleHeader({ anime, badge, play, hint, list }: Props) {
  const t = await getTranslations("titlePage");
  const tGenres = await getTranslations("genres");
  const label = (group: string, key: string | null | undefined, values?: Record<string, string | number>) =>
    key && t.has(`${group}.${key}`) ? t(`${group}.${key}`, values) : key;

  const facts = [
    anime.mean != null && t("score", { score: anime.mean.toFixed(2) }),
    anime.start_season &&
      label("season", anime.start_season.season, { year: anime.start_season.year }),
    label("mediaType", anime.media_type),
    anime.num_episodes ? t("episodes", { count: anime.num_episodes }) : null,
    label("airing", anime.status),
  ].filter(Boolean) as string[];
  const english = anime.alternative_titles?.en;
  const poster = anime.main_picture?.large ?? anime.main_picture?.medium;

  return (
    <section className="bg-backdrop px-4 pb-10 pt-24 sm:px-8 sm:pt-28">
      <div className="flex flex-col gap-6 sm:flex-row sm:gap-8">
        <div
          className={`relative aspect-[2/3] w-40 shrink-0 overflow-hidden rounded-ui border border-line sm:w-56 ${gradientFor(anime.id)}`}
        >
          {poster && (
            // eslint-disable-next-line @next/next/no-img-element -- posters come from remote catalogs
            <img
              src={poster}
              width={224}
              height={336}
              decoding="async"
              alt={t("posterAlt", { title: anime.title })}
              className="absolute inset-0 h-full w-full object-cover"
            />
          )}
        </div>
        <div className="max-w-3xl">
          {badge}
          <h1 className="mt-3 text-3xl font-bold sm:text-4xl">{anime.title}</h1>
          {english && english !== anime.title && <p className="mt-1 text-muted">{english}</p>}
          {facts.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm font-medium">
              {facts.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          )}
          <div className="mt-6 flex flex-wrap gap-3">
            {play}
            <AddToList animeId={anime.id} state={list} />
          </div>
          {hint}

          <h2 className="sr-only">{t("synopsis")}</h2>
          <p className="mt-6 whitespace-pre-line text-muted">{anime.synopsis || t("noSynopsis")}</p>
          <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
            {!!anime.studios?.length && (
              <>
                <dt className="text-muted">{t("studios")}</dt>
                <dd>{anime.studios?.map((s) => s.name).join(", ")}</dd>
              </>
            )}
            {!!anime.genres?.length && (
              <>
                <dt className="text-muted">{t("genres")}</dt>
                <dd className="flex flex-wrap gap-2">
                  {anime.genres?.map((g) => (
                    <span key={g.id} className="rounded-ui border border-line px-2 py-0.5 text-xs">
                      {genreName(tGenres, g)}
                    </span>
                  ))}
                </dd>
              </>
            )}
          </dl>
        </div>
      </div>
    </section>
  );
}
