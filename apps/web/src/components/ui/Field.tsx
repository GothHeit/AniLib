"use client";

import { useTranslations } from "next-intl";
import { useState, type ComponentProps } from "react";

export function Field({
  label,
  hint,
  className = "",
  type,
  ...props
}: ComponentProps<"input"> & { label: string; hint?: string }) {
  const t = useTranslations("actions");
  const [shown, setShown] = useState(false);
  const isPassword = type === "password";

  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm text-muted">{label}</span>
      <span className="relative flex">
        <input
          type={isPassword && shown ? "text" : type}
          className={`w-full rounded-ui border border-line bg-surface px-3 py-2 text-fg placeholder:text-muted focus:border-accent ${isPassword ? "pr-16" : ""} ${className}`}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            aria-pressed={shown}
            onClick={() => setShown((v) => !v)}
            className="absolute inset-y-0 right-0 rounded-ui px-3 text-xs font-bold text-muted hover:text-fg"
          >
            {shown ? t("hidePassword") : t("showPassword")}
          </button>
        )}
      </span>
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </label>
  );
}
