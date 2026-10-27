import { getTranslations } from "next-intl/server";

import { PosterCard } from "@/components/ui/PosterCard";
import { Row } from "@/components/ui/Row";
import { ContinueCard } from "./ContinueCard";
import { genreName } from "@/lib/genres";
import { animeHref, captionOf, watchHref, posterOf, progressFraction, type HomeOut } from "@/lib/catalog";

const WIDE = "w-64 sm:w-72";

/** The rows under the hero. The API already leaves out empty ones. */
export async function HomeRows({ rows }: { rows: HomeOut["rows"] }) {
  const t = await getTranslations("home");
  const tGenres = await getTranslations("genres");
  return (
    <div className="space-y-8 py-6">
      {rows.map((row) => (
        <Row
          key={row.genre ? `genre-${row.genre.id}` : row.id}
          title={row.genre ? t("rows.genre", { genre: genreName(tGenres, row.genre) }) : t(`rows.${row.id}`)}
          itemClassName={row.id === "continue_watching" ? WIDE : undefined}
        >
          {row.items.map(({ anime, progress, resume_episode }) =>
            row.id === "continue_watching" ? (
              <ContinueCard
                key={anime.id}
                animeId={anime.id}
                href={resume_episode ? watchHref(anime.id, resume_episode) : animeHref(anime.id)}
                title={anime.title}
                image={posterOf(anime)}
                caption={resume_episode ? t("episode", { n: resume_episode }) : undefined}
                progress={progress ? progressFraction(progress) : undefined}
              />
            ) : (
              <PosterCard
                key={anime.id}
                href={animeHref(anime.id)}
                title={anime.title}
                image={posterOf(anime)}
                caption={captionOf(anime)}
              />
            ),
          )}
        </Row>
      ))}
    </div>
  );
}
