import type { ReactNode } from "react";

type Props = {
  title: string;
  meta?: string;
  synopsis?: string;
  image?: string | null;
  children?: ReactNode;
};

/** Full-bleed banner. The nav floats over its top edge. */
export function Hero({ title, meta, synopsis, image, children }: Props) {
  return (
    <section className="relative flex min-h-[26rem] items-end bg-hero px-4 pb-12 pt-28 sm:min-h-[32rem] sm:px-8">
      {image && (
        // eslint-disable-next-line @next/next/no-img-element -- banners come from remote catalogs
        <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-50" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-bg via-transparent to-transparent" />
      <div className="relative max-w-2xl">
        <h1 className="text-3xl font-bold sm:text-5xl">{title}</h1>
        {meta && <p className="mt-2 text-sm font-medium text-success">{meta}</p>}
        {synopsis && <p className="mt-3 line-clamp-3 text-muted sm:text-lg">{synopsis}</p>}
        {children && <div className="mt-6 flex flex-wrap gap-3">{children}</div>}
      </div>
    </section>
  );
}
