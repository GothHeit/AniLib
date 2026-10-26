"use client";

import { useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import { useRouter } from "@/i18n/navigation";
import { postAuth } from "@/lib/bff";
import { safeNext } from "@/lib/redirect";

import { Button } from "@/components/ui/Button";

type Props = {
  endpoint: "login" | "register";
  submitLabel: string;
  /** Extra values merged into the request body (such as the locale). */
  extra?: Record<string, string>;
  children: ReactNode;
};

/** Posts the form to the web server's auth route, then goes where the user was headed. */
export function AuthForm({ endpoint, submitLabel, extra, children }: Props) {
  const tErr = useTranslations("errors");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const body = { ...Object.fromEntries(new FormData(e.currentTarget)), ...extra };
    setPending(true);
    setError(null);
    const code = await postAuth(endpoint, body);
    if (code) {
      setError(tErr.has(code) ? tErr(code) : tErr("unknown"));
      setPending(false);
      return;
    }
    router.replace(safeNext(new URLSearchParams(window.location.search).get("next")));
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {children}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {submitLabel}
      </Button>
    </form>
  );
}
