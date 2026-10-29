"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import { PosterCard } from "@/components/ui/PosterCard";
import { useToast } from "@/components/ui/Toast";
import { useRouter } from "@/i18n/navigation";
import { animeHref, LIST_STATUSES, posterOf, type ListEntry } from "@/lib/catalog";
import { usePresence } from "@/lib/use-presence";

import { removeEntry, setStatus } from "./listApi";
import { useErrorMessage } from "./useErrorMessage";

/** A poster with a status/remove menu. Saves through the API, then refreshes the page data. */
export function ListEntryCard({ entry }: { entry: ListEntry }) {
  const t = useTranslations("list");
  const message = useErrorMessage();
  const toast = useToast();
  const router = useRouter();
  const root = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const presence = usePresence(open);
  const [pending, setPending] = useState(false);
  const { node, list_status: status } = entry;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function apply(action: () => Promise<string | null>, done: string) {
    setPending(true);
    const code = await action();
    setPending(false);
    setOpen(false);
    if (code) {
      toast(message(code), "error");
      return;
    }
    toast(done, "success");
    router.refresh();
  }

  const watched = status.num_episodes_watched ?? 0;
  const progress = node.num_episodes
    ? t("progress", { watched, total: node.num_episodes })
    : t("progressUnknown", { watched });

  const item = "block w-full px-3 py-2 text-left text-sm hover:bg-bg active:bg-bg disabled:opacity-50 pointer-coarse:py-3";

  return (
    <div ref={root} className="relative">
      <PosterCard href={animeHref(node.id)} title={node.title} image={posterOf(node)} caption={progress} />
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("menu", { title: node.title })}
        onClick={() => setOpen((v) => !v)}
        className="press absolute right-1.5 top-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-bg/80 text-fg hover:bg-bg pointer-coarse:h-11 pointer-coarse:w-11"
      >
        ⋯
      </button>
      {presence.mounted && (
        <ul
          role="menu"
          data-closing={presence.closing || undefined}
          inert={presence.closing}
          className="pop-in absolute right-1.5 top-11 z-20 w-52 origin-top-right overflow-hidden rounded-ui border border-line bg-surface shadow-lg shadow-black/50 pointer-coarse:top-14"
        >
          {LIST_STATUSES.filter((s) => s !== status.status).map((s) => (
            <li key={s} role="none">
              <button
                role="menuitem"
                type="button"
                disabled={pending}
                className={item}
                onClick={() => apply(() => setStatus(node.id, s), t("updated"))}
              >
                {t("moveTo", { status: t(`status.${s}`) })}
              </button>
            </li>
          ))}
          <li role="none" className="border-t border-line">
            <button
              role="menuitem"
              type="button"
              disabled={pending}
              className={`${item} text-danger`}
              onClick={() => apply(() => removeEntry(node.id), t("removed"))}
            >
              {t("remove")}
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}
