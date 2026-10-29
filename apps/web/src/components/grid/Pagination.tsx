import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";

import { MAX_PAGE } from "@/lib/browse";

type Props = {
  page: number;
  hasNext: boolean;
  /** Builds the link for a page, keeping the other query values. */
  hrefFor: (page: number) => { pathname: string; query: Record<string, string> };
};

export async function Pagination({ page, hasNext, hrefFor }: Props) {
  const t = await getTranslations("browse");
  const next = hasNext && page < MAX_PAGE;
  if (page === 1 && !next) return null;
  const link = "press inline-flex min-h-11 items-center justify-center rounded-full border border-line-strong px-5 py-2 text-sm font-bold hover:border-accent";
  return (
    <nav aria-label={t("pagination")} className="mt-8 flex items-center justify-center gap-4">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} rel="prev" className={link}>
          {t("previous")}
        </Link>
      ) : (
        <span aria-hidden="true" className="w-24" />
      )}
      <span className="text-sm text-muted" aria-current="page">
        {t("page", { page })}
      </span>
      {next ? (
        <Link href={hrefFor(page + 1)} rel="next" className={link}>
          {t("next")}
        </Link>
      ) : (
        <span aria-hidden="true" className="w-24" />
      )}
    </nav>
  );
}
