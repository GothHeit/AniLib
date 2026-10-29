"use client";

import { useTranslations } from "next-intl";
import { useLayoutEffect, useRef, useState } from "react";

/** The synopsis, cut to a few lines with a toggle when it runs longer. */
export function Synopsis({ text }: { text: string }) {
  const t = useTranslations("titlePage");
  const ref = useRef<HTMLParagraphElement>(null);
  const [open, setOpen] = useState(false);
  const [long, setLong] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || open) return;
    const check = () => setLong(el.scrollHeight > el.clientHeight + 1);
    check();
    const observer = new ResizeObserver(check);
    observer.observe(el);
    return () => observer.disconnect();
  }, [open]);

  return (
    <>
      <p
        ref={ref}
        id="synopsis"
        className={`mt-6 max-w-2xl whitespace-pre-line leading-relaxed text-soft ${open ? "" : "line-clamp-4"}`}
      >
        {text}
      </p>
      {(long || open) && (
        <button
          type="button"
          aria-expanded={open}
          aria-controls="synopsis"
          onClick={() => setOpen((o) => !o)}
          className="mt-1 self-start py-1 text-sm font-bold text-accent pointer-coarse:py-3"
        >
          {open ? t("readLess") : t("readMore")}
        </button>
      )}
    </>
  );
}
