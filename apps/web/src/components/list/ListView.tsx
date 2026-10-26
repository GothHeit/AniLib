"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { PosterGrid } from "@/components/grid/PosterGrid";
import { LIST_STATUSES, type ListEntry, type ListStatus } from "@/lib/catalog";

import { ListEntryCard } from "./ListEntryCard";

/** Status tabs over the whole list, so switching tabs needs no new request. The tab lives in the URL. */
export function ListView({ entries, initial }: { entries: ListEntry[]; initial: ListStatus }) {
  const t = useTranslations("list");
  const [active, setActive] = useState(initial);

  function select(status: ListStatus) {
    setActive(status);
    const url = new URL(window.location.href);
    url.searchParams.set("status", status);
    window.history.replaceState(null, "", url);
  }

  const shown = entries.filter((e) => e.list_status.status === active);
  const count = (s: ListStatus) => entries.filter((e) => e.list_status.status === s).length;

  return (
    <>
      <div
        role="tablist"
        aria-label={t("tabs")}
        className="no-scrollbar -mx-4 mb-6 flex gap-1 overflow-x-auto px-4 sm:-mx-8 sm:px-8"
      >
        {LIST_STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            role="tab"
            id={`list-tab-${s}`}
            aria-selected={s === active}
            aria-controls="list-panel"
            onClick={() => select(s)}
            className={`shrink-0 whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium ${s === active ? "border-accent text-accent" : "border-transparent text-muted hover:text-fg"}`}
          >
            {t(`status.${s}`)} <span className="text-xs">({count(s)})</span>
          </button>
        ))}
      </div>
      <div role="tabpanel" id="list-panel" aria-labelledby={`list-tab-${active}`}>
        {shown.length === 0 ? (
          <p className="py-12 text-center text-muted">{t("empty")}</p>
        ) : (
          <PosterGrid>
            {shown.map((e) => (
              <ListEntryCard key={e.node.id} entry={e} />
            ))}
          </PosterGrid>
        )}
      </div>
    </>
  );
}
