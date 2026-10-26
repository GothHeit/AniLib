import { getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";

import { HomeRows } from "@/components/rows/HomeRows";
import { HomeSkeleton } from "@/components/rows/HomeSkeleton";
import { ButtonLink } from "@/components/ui/Button";
import { Hero } from "@/components/ui/Hero";
import { animeHref } from "@/lib/catalog";
import { serverApi, unwrap } from "@/lib/server-api";

async function HomeContent({ locale }: { locale: string }) {
  const t = await getTranslations("home");
  const home = await unwrap((await serverApi()).GET("/home"), locale);
  const hero = home.hero;

  return (
    <>
      {hero && (
        <Hero
          title={hero.anime.title}
          meta={hero.anime.mean ? t("score", { score: hero.anime.mean.toFixed(1) }) : undefined}
          synopsis={hero.synopsis ?? undefined}
          image={hero.backdrop}
        >
          <ButtonLink href={animeHref(hero.anime.id)}>{t("play")}</ButtonLink>
        </Hero>
      )}
      {home.rows.length > 0 ? (
        <HomeRows rows={home.rows} />
      ) : (
        <p className="px-4 pb-24 pt-28 text-muted sm:px-8">{t("empty")}</p>
      )}
    </>
  );
}

export default async function Home({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <Suspense fallback={<HomeSkeleton />}>
      <HomeContent locale={locale} />
    </Suspense>
  );
}
