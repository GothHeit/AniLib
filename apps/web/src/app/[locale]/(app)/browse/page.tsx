import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";

import { FilterBar } from "@/components/grid/FilterBar";
import { Pagination } from "@/components/grid/Pagination";
import { GridSkeleton, PosterGrid } from "@/components/grid/PosterGrid";
import { PosterCard } from "@/components/ui/PosterCard";
import { parseBrowse, yearOptions, type BrowseFilters } from "@/lib/browse";
import { animeHref, captionOf, posterOf } from "@/lib/catalog";
import { serverApi, unwrap } from "@/lib/server-api";
import { titled } from "@/lib/page-title";

async function Results({ filters, page, locale }: { filters: BrowseFilters; page: number; locale: string }) {
  const t = await getTranslations("browse");
  const { data, has_next } = await unwrap(
    (await serverApi()).GET("/anime/browse", { params: { query: { ...filters, page } } }),
    locale,
  );
  if (data.length === 0) return <p className="py-12 text-center text-muted">{t("empty")}</p>;

  const query: Record<string, string> = {};
  if (filters.genre) query.genre = String(filters.genre);
  if (filters.year) query.year = String(filters.year);
  if (filters.season) query.season = filters.season;

  return (
    <>
      <PosterGrid>
        {data.map((a) => (
          <PosterCard key={a.id} href={animeHref(a.id)} title={a.title} image={posterOf(a)} caption={captionOf(a)} />
        ))}
      </PosterGrid>
      <Pagination
        page={page}
        hasNext={has_next}
        hrefFor={(p) => ({ pathname: "/browse", query: p > 1 ? { ...query, page: String(p) } : query })}
      />
    </>
  );
}

export async function generateMetadata({ params }: PageProps<"/[locale]/browse">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "browse" });
  return titled(t("title"));
}

export default async function BrowsePage({ params, searchParams }: PageProps<"/[locale]/browse">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("browse");
  const genres = await unwrap((await serverApi()).GET("/anime/genres"), locale);
  const { filters, page } = parseBrowse(await searchParams, new Set(genres.map((g) => g.id)));

  return (
    <section className="px-4 pb-8 pt-24 sm:px-8">
      <h1 className="mb-5 text-3xl font-bold">{t("title")}</h1>
      <FilterBar genres={genres} filters={filters} years={yearOptions()} />
      <div className="mt-8">
        <Suspense key={JSON.stringify([filters, page])} fallback={<GridSkeleton />}>
          <Results filters={filters} page={page} locale={locale} />
        </Suspense>
      </div>
    </section>
  );
}
