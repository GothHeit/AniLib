"use client";

import { errorCode } from "@app/api-client";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api";

import { useErrorMessage } from "./useErrorMessage";

/** Shown instead of the list when no MyAnimeList account is linked. */
export function LinkMalCard({ expired = false }: { expired?: boolean }) {
  const t = useTranslations("list.unlinked");
  const tErr = useTranslations("list.errors");
  const message = useErrorMessage();
  const toast = useToast();
  const [pending, setPending] = useState(false);

  async function link() {
    setPending(true);
    try {
      const { data, error } = await api.GET("/mal/link");
      const url = (data as { auth_url?: string } | undefined)?.auth_url;
      if (url) {
        window.location.assign(url);
        return;
      }
      toast(message(errorCode(error)), "error");
    } catch {
      toast(message("network"), "error");
    }
    setPending(false);
  }

  return (
    <div className="mx-auto max-w-lg rounded-ui border border-line bg-surface p-6 text-center">
      <h2 className="text-xl font-bold">{t("title")}</h2>
      <p className="mt-2 text-muted">{expired ? tErr("mal_session_expired") : t("body")}</p>
      <Button className="mt-5" onClick={link} disabled={pending}>
        {t("action")}
      </Button>
    </div>
  );
}
