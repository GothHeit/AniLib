"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { useRouter } from "@/i18n/navigation";

const CODE_PATTERN = /^[A-Z0-9]{4,12}$/;

export function JoinRoomForm() {
  const t = useTranslations("room");
  const router = useRouter();
  const [code, setCode] = useState("");
  const [invalid, setInvalid] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const clean = code.trim().toUpperCase();
    if (!CODE_PATTERN.test(clean)) {
      setInvalid(true);
      return;
    }
    router.push(`/room/${clean}`);
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">{t("codeLabel")}</span>
        <input
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            setInvalid(false);
          }}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={12}
          aria-invalid={invalid}
          aria-describedby={invalid ? "code-error" : undefined}
          className="h-12 rounded-ui border border-line-strong bg-bg px-4 text-xl font-bold uppercase tracking-widest focus:border-accent"
        />
      </label>
      {invalid && (
        <p id="code-error" role="alert" className="text-sm text-danger">
          {t("invalidCode")}
        </p>
      )}
      <button type="submit" className="press inline-flex min-h-11 items-center justify-center rounded-full bg-accent px-5 py-2 font-bold text-on-accent">
        {t("join")}
      </button>
    </form>
  );
}
