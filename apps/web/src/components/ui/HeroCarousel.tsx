"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { ButtonLink } from "./Button";

export type HeroSlide = {
  id: number;
  title: string;
  href: string;
  meta?: string;
  synopsis?: string;
  /** Set when the synopsis is not in the reader's language. */
  synopsisNote?: string;
  image?: string | null;
};

const INTERVAL_MS = 8000;

/** Full-bleed banner that rotates through a few titles. The nav floats over its top edge.
 * Rotation pauses on hover and focus and never starts for people who prefer reduced motion. */
export function HeroCarousel({ slides, cta }: { slides: HeroSlide[]; cta: string }) {
  const t = useTranslations("home");
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(true);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (slides.length < 2 || paused || reduced) return;
    const timer = setTimeout(() => setIndex((i) => (i + 1) % slides.length), INTERVAL_MS);
    return () => clearTimeout(timer);
  }, [index, slides.length, paused, reduced]);

  return (
    <section
      aria-roledescription="carousel"
      aria-label={t("featured")}
      className="relative min-h-[26rem] overflow-hidden bg-hero sm:min-h-[32rem]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {slides.map((slide, i) => {
        const active = i === index;
        return (
          <div
            key={slide.id}
            role="group"
            aria-roledescription="slide"
            aria-label={t("slide", { n: i + 1, total: slides.length })}
            aria-hidden={!active}
            inert={!active}
            className={`absolute inset-0 flex items-end px-4 pb-12 pt-28 transition-opacity duration-700 motion-reduce:transition-none sm:px-8 ${active ? "opacity-100" : "opacity-0"}`}
          >
            {slide.image && (
              // MAL only has portrait posters, which pixelate when stretched to a banner: blur
              // them into a backdrop and show the sharp one beside the text.
              // eslint-disable-next-line @next/next/no-img-element -- banners come from remote catalogs
              <img
                src={slide.image}
                alt=""
                fetchPriority={i === 0 ? "high" : "auto"}
                loading={i === 0 ? "eager" : "lazy"}
                decoding="async"
                className="absolute inset-0 h-full w-full scale-110 object-cover opacity-40 blur-2xl"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-bg via-transparent to-transparent" />
            {slide.image && (
              // eslint-disable-next-line @next/next/no-img-element -- remote catalog poster
              <img
                src={slide.image}
                alt=""
                loading={i === 0 ? "eager" : "lazy"}
                decoding="async"
                className="absolute bottom-12 right-8 hidden h-72 w-auto rounded-ui shadow-2xl md:block lg:right-16 lg:h-96"
              />
            )}
            <div className="relative max-w-2xl">
              {active ? (
                <h1 className="text-3xl font-bold sm:text-5xl">{slide.title}</h1>
              ) : (
                <p className="text-3xl font-bold sm:text-5xl">{slide.title}</p>
              )}
              {slide.meta && <p className="mt-2 text-sm font-medium text-success">{slide.meta}</p>}
              {slide.synopsis && <p className="mt-3 line-clamp-3 text-muted sm:text-lg">{slide.synopsis}</p>}
              {slide.synopsis && slide.synopsisNote && <p className="mt-1 text-xs text-muted">{slide.synopsisNote}</p>}
              <div className="mt-6 flex flex-wrap gap-3">
                <ButtonLink href={slide.href}>{cta}</ButtonLink>
              </div>
            </div>
          </div>
        );
      })}
      {slides.length > 1 && (
        <div className="absolute inset-x-0 bottom-4 z-10 flex justify-center gap-1 sm:justify-end sm:px-8">
          {slides.map((slide, i) => (
            <button
              key={slide.id}
              type="button"
              aria-label={t("goToSlide", { n: i + 1 })}
              aria-current={i === index}
              onClick={() => setIndex(i)}
              className="flex h-6 w-6 items-center justify-center pointer-coarse:h-11 pointer-coarse:w-11"
            >
              <span className={`h-1.5 rounded-full transition-all ${i === index ? "w-6 bg-accent" : "w-3 bg-fg/40"}`} />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
