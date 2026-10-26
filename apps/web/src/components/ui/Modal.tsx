"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useTranslations } from "next-intl";

type Props = { open: boolean; onClose: () => void; title: string; children: ReactNode };

/** Native <dialog>: the browser handles the focus trap, Escape and the backdrop. */
export function Modal({ open, onClose, title, children }: Props) {
  const t = useTranslations("actions");
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) {
      if (typeof el.showModal === "function") el.showModal();
      else el.setAttribute("open", "");
    } else if (!open && el.open) {
      if (typeof el.close === "function") el.close();
      else el.removeAttribute("open");
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-ui border border-line bg-surface p-6 text-fg backdrop:bg-black/70"
    >
      <div className="mb-4 flex items-start justify-between gap-4">
        <h2 className="text-xl font-bold">{title}</h2>
        <button type="button" onClick={onClose} aria-label={t("close")} className="text-muted hover:text-fg">
          ✕
        </button>
      </div>
      {children}
    </dialog>
  );
}
