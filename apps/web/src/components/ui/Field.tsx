"use client";

import { useTranslations } from "next-intl";
import { useId, useState, type ComponentProps } from "react";

export function Field({
  label,
  hint,
  className = "",
  type,
  id,
  ...props
}: ComponentProps<"input"> & { label: string; hint?: string }) {
  const t = useTranslations("actions");
  const [shown, setShown] = useState(false);
  const isPassword = type === "password";
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <div className="flex flex-col gap-1">
      {/* A sibling label, not a wrapping one, so the Show button does not join the field's name. */}
      <label htmlFor={inputId} className="text-sm text-muted">
        {label}
      </label>
      <div className="relative flex">
        <input
          id={inputId}
          type={isPassword && shown ? "text" : type}
          className={`h-11 w-full rounded-ui border border-line-strong bg-bg px-4 text-fg transition-colors placeholder:text-muted focus:border-accent ${isPassword ? "pr-20" : ""} ${className}`}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            aria-pressed={shown}
            onClick={() => setShown((v) => !v)}
            className="absolute inset-y-0 right-0 rounded-ui px-4 text-xs font-bold text-muted hover:text-fg"
          >
            {shown ? t("hidePassword") : t("showPassword")}
          </button>
        )}
      </div>
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </div>
  );
}
