"use client";

import { errorCode } from "@app/api-client";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api";

export const LIST_STATUSES = ["watching", "plan_to_watch", "completed", "on_hold", "dropped"] as const;
export type Status = (typeof LIST_STATUSES)[number];

const LIST_ERRORS = ["mal_not_linked", "mal_session_expired", "mal_update_failed"];

/** The title's status on the user's list (null when it isn't there), or "unavailable" when it couldn't be loaded. */
export type ListState = Status | null | "unavailable";

type Props = {
  animeId: number;
  state: ListState;
};

/** Status picker that saves the title to the user's MyAnimeList list. */
export function AddToList({ animeId, state }: Props) {
  const t = useTranslations("titlePage.list");
  const tErrors = useTranslations("errors");
  const toast = useToast();
  const [status, setStatus] = useState<Status | "">(state === "unavailable" ? "" : (state ?? ""));
  const [saving, setSaving] = useState(false);

  async function save(next: Status) {
    const previous = status;
    setStatus(next);
    setSaving(true);
    try {
      const { error, response } = await api.PATCH("/me/animelist/{anime_id}", {
        params: { path: { anime_id: animeId } },
        body: { status: next },
      });
      if (response.ok) {
        toast(t("saved", { status: t(`status.${next}`) }), "success");
        return;
      }
      setStatus(previous);
      const code = errorCode(error);
      toast(LIST_ERRORS.includes(code) ? t(`errors.${code}`) : tErrors(errorKey(code)), "error");
    } catch {
      setStatus(previous);
      toast(tErrors("network"), "error");
    } finally {
      setSaving(false);
    }
  }

  // Without the real status, picking one could overwrite it (Watching -> Plan to watch).
  const unavailable = state === "unavailable";

  return (
    <label className="inline-flex items-center rounded-ui border border-line bg-surface text-sm font-bold hover:border-accent focus-within:border-accent">
      <span className="sr-only">{t("label")}</span>
      <select
        value={status}
        disabled={saving || unavailable}
        onChange={(e) => e.target.value && save(e.target.value as Status)}
        className="cursor-pointer appearance-none bg-transparent px-4 py-2 pr-8 text-fg outline-none disabled:opacity-50"
        style={{
          backgroundImage:
            "linear-gradient(45deg, transparent 50%, currentColor 50%), linear-gradient(135deg, currentColor 50%, transparent 50%)",
          backgroundPosition: "calc(100% - 15px) 55%, calc(100% - 10px) 55%",
          backgroundSize: "5px 5px",
          backgroundRepeat: "no-repeat",
        }}
      >
        <option value="" disabled>
          {unavailable ? t("unavailable") : t("add")}
        </option>
        {LIST_STATUSES.map((s) => (
          <option key={s} value={s} className="bg-surface">
            {t(`status.${s}`)}
          </option>
        ))}
      </select>
    </label>
  );
}

// Codes common.json knows; anything else shows the generic message.
const COMMON_ERRORS = ["not_authenticated", "rate_limited", "mal_unavailable", "validation_failed", "network"];

export function errorKey(code: string) {
  return COMMON_ERRORS.includes(code) ? code : "unknown";
}
