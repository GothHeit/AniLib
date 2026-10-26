"use client";

import { errorCode } from "@app/api-client";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { api, saveTokens } from "@/lib/api";

export function LoginForm() {
  const t = useTranslations("login");
  const tErr = useTranslations("errors");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setPending(true);
    setError(null);
    try {
      const { data, error } = await api.POST("/auth/login", {
        body: { username: String(form.get("username")), password: String(form.get("password")) },
      });
      if (data) {
        saveTokens(data);
        setDone(true);
      } else {
        const code = errorCode(error);
        setError(tErr.has(code) ? tErr(code) : tErr("unknown"));
      }
    } catch {
      setError(tErr("network"));
    } finally {
      setPending(false);
    }
  }

  if (done) return <p role="status">{t("success")}</p>;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="text-sm text-neutral-400">{t("username")}</span>
        <input name="username" required autoComplete="username"
          className="rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2" />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm text-neutral-400">{t("password")}</span>
        <input name="password" type="password" required autoComplete="current-password"
          className="rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2" />
      </label>
      {error && <p role="alert" className="text-sm text-rose-400">{error}</p>}
      <button type="submit" disabled={pending}
        className="rounded-md bg-rose-600 px-4 py-2 font-semibold hover:bg-rose-500 disabled:opacity-50">
        {t("submit")}
      </button>
    </form>
  );
}
