"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { useRouter } from "@/i18n/navigation";
import { postAuth } from "@/lib/bff";

type Props = {
  username: string;
  /** "tab" opens upward from the phone tab bar. */
  variant?: "nav" | "tab";
  trigger?: ReactNode;
  triggerClassName?: string;
};

export function UserMenu({ username, variant = "nav", trigger, triggerClassName }: Props) {
  const t = useTranslations("nav");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function signOut() {
    await postAuth("logout", {});
    setOpen(false);
    router.replace("/login");
    router.refresh();
  }

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-label={t("account")}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={triggerClassName}
      >
        {trigger ?? (
          <span className="flex h-8 w-8 items-center justify-center rounded-ui bg-accent-deep text-sm font-bold uppercase">
            {username.charAt(0)}
          </span>
        )}
      </button>
      {open && (
        <div
          role="menu"
          className={`absolute right-0 z-50 w-56 rounded-ui border border-line bg-surface p-2 shadow-xl ${
            variant === "tab" ? "bottom-full mb-3" : "top-full mt-2"
          }`}
        >
          <p className="px-3 py-2 text-sm text-muted">{t("signedInAs", { name: username })}</p>
          <button
            type="button"
            role="menuitem"
            onClick={signOut}
            className="w-full rounded-ui px-3 py-2 text-left text-sm hover:bg-line"
          >
            {t("signOut")}
          </button>
        </div>
      )}
    </div>
  );
}
