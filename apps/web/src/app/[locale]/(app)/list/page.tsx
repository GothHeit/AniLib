import { errorCode } from "@app/api-client";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";

import { GridSkeleton } from "@/components/grid/PosterGrid";
import { LinkMalCard } from "@/components/list/LinkMalCard";
import { ListView } from "@/components/list/ListView";
import { redirect } from "@/i18n/navigation";
import { toApiError } from "@/lib/errors";
import { LIST_STATUSES, type ListEntry, type ListStatus } from "@/lib/catalog";
import { serverApi, unwrap } from "@/lib/server-api";

async function Entries({ active, locale }: { active: ListStatus; locale: string }) {
  const api = await serverApi();
  const { connected } = (await unwrap(api.GET("/me/mal"), locale)) as { connected: boolean };
  if (!connected) return <LinkMalCard />;

  // Not unwrap: a 401 here means the MyAnimeList token expired, not the MoonRoom session.
  const { data, error, response } = await api.GET("/me/animelist", { params: { query: {} } });
  if (data !== undefined) return <ListView entries={(data as { data: ListEntry[] }).data} initial={active} />;
  const code = errorCode(error);
  if (code === "mal_session_expired" || code === "mal_not_linked") return <LinkMalCard expired={code === "mal_session_expired"} />;
  if (response.status === 401) redirect({ href: "/login", locale });
  throw toApiError(response.status, error);
}

export default async function ListPage({ params, searchParams }: PageProps<"/[locale]/list">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("list");
  const raw = (await searchParams).status;
  const value = Array.isArray(raw) ? raw[0] : raw;
  const active = LIST_STATUSES.find((s) => s === value) ?? "watching";

  return (
    <section className="px-4 pb-8 pt-24 sm:px-8">
      <h1 className="mb-5 text-3xl font-bold">{t("title")}</h1>
      <Suspense fallback={<GridSkeleton />}>
        <Entries active={active} locale={locale} />
      </Suspense>
    </section>
  );
}
