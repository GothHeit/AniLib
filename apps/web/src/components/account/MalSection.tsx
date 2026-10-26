"use client";

import { errorCode, type components } from "@app/api-client";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { usePathname, useRouter } from "@/i18n/navigation";
import { api } from "@/lib/api";

export type MalStatus = components["schemas"]["MalStatusOut"];

const RETURN_TOASTS = { linked: "linkedToast", denied: "deniedToast", failed: "failedToast" } as const;

type Props = {
  status: MalStatus;
  /** The `mal` query value MAL's callback leaves on the page, if any. */
  returned?: string;
};

export function MalSection({ status, returned }: Props) {
  const t = useTranslations("account.mal");
  const tErr = useTranslations("errors");
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();
  const [busy, setBusy] = useState<"link" | "unlink" | null>(null);
  const [confirming, setConfirming] = useState(false);

  // Show the callback result once, then drop it from the URL so a reload doesn't repeat it.
  useEffect(() => {
    if (!returned || !(returned in RETURN_TOASTS)) return;
    const key = RETURN_TOASTS[returned as keyof typeof RETURN_TOASTS];
    toast(t(key), returned === "linked" ? "success" : "error");
    router.replace(pathname);
  }, [returned, pathname, router, t, toast]);

  function fail(error: unknown) {
    const code = errorCode(error);
    toast(tErr.has(code) ? tErr(code) : tErr("unknown"), "error");
  }

  async function link() {
    setBusy("link");
    try {
      const { data, error } = await api.GET("/mal/link");
      const url = data?.auth_url;
      if (!url) throw error ?? new Error("no url");
      window.location.assign(url);
    } catch (e) {
      fail(e);
      setBusy(null);
    }
  }

  async function unlink() {
    setBusy("unlink");
    try {
      const { response, error } = await api.DELETE("/me/mal");
      if (!response.ok) throw error;
      setConfirming(false);
      toast(t("unlinkedToast"), "success");
      router.refresh();
    } catch (e) {
      fail(e);
    }
    setBusy(null);
  }

  const stats = status.statistics;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">{t("intro")}</p>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-medium">
            {status.connected
              ? status.mal_username
                ? t("linkedAs", { name: status.mal_username })
                : t("linkedNoName")
              : t("notLinked")}
          </p>
          {status.connected && stats && (
            <p className="mt-1 text-sm text-muted">
              {t("stats", {
                watching: stats.num_items_watching ?? 0,
                completed: stats.num_items_completed ?? 0,
                planned: stats.num_items_plan_to_watch ?? 0,
              })}
            </p>
          )}
        </div>
        {status.connected ? (
          <Button variant="secondary" onClick={() => setConfirming(true)} disabled={busy !== null}>
            {t("unlink")}
          </Button>
        ) : (
          <Button onClick={link} disabled={busy !== null}>
            {busy === "link" ? t("linking") : t("link")}
          </Button>
        )}
      </div>

      <Modal open={confirming} onClose={() => setConfirming(false)} title={t("unlinkTitle")}>
        <p className="text-sm text-muted">{t("unlinkBody")}</p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirming(false)} disabled={busy === "unlink"}>
            {t("cancel")}
          </Button>
          <Button onClick={unlink} disabled={busy === "unlink"}>
            {busy === "unlink" ? t("unlinking") : t("unlink")}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
