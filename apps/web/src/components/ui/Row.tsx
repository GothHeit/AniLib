"use client";

import { useRef, type ReactNode } from "react";
import { useTranslations } from "next-intl";

type Props = {
  title: string;
  children: ReactNode;
  /** Tailwind width class for each item. Tall posters are narrower than wide cards. */
  itemClassName?: string;
};

/** Horizontal scroller with arrow buttons and Left/Right keys. */
export function Row({ title, children, itemClassName = "w-36 sm:w-44" }: Props) {
  const t = useTranslations("row");
  const scroller = useRef<HTMLUListElement>(null);

  function scroll(direction: -1 | 1) {
    const el = scroller.current;
    if (el) el.scrollBy({ left: direction * el.clientWidth * 0.85, behavior: "smooth" });
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowRight") scroll(1);
    else if (e.key === "ArrowLeft") scroll(-1);
    else return;
    e.preventDefault();
  }

  const arrow =
    "absolute top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-bg/90 text-fg hover:border-accent md:flex";

  return (
    <section aria-label={title} className="group/row relative">
      <h2 className="mb-3 px-4 text-lg font-bold sm:px-8">{title}</h2>
      <div className="relative">
        <button type="button" aria-label={t("previous")} onClick={() => scroll(-1)} className={`${arrow} left-2`}>
          ‹
        </button>
        <ul
          ref={scroller}
          tabIndex={0}
          aria-label={title}
          onKeyDown={onKeyDown}
          className="no-scrollbar flex snap-x gap-3 overflow-x-auto scroll-smooth px-4 pb-2 sm:px-8"
        >
          {Array.isArray(children)
            ? children.map((child, i) => (
                <li key={i} className={`shrink-0 snap-start ${itemClassName}`}>
                  {child}
                </li>
              ))
            : <li className={`shrink-0 snap-start ${itemClassName}`}>{children}</li>}
        </ul>
        <button type="button" aria-label={t("next")} onClick={() => scroll(1)} className={`${arrow} right-2`}>
          ›
        </button>
      </div>
    </section>
  );
}
