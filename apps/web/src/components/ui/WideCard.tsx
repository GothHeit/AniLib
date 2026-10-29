import { Link } from "@/i18n/navigation";

import { placeholderFor } from "./PosterCard";

type Props = {
  href: string;
  title: string;
  image?: string | null;
  caption?: string;
  /** 0 to 1. Shows the progress bar when set. */
  progress?: number;
  seed?: string | number;
};

/** Wide 16:9 card with a progress bar, used for Continue watching. */
export function WideCard({ href, title, image, caption, progress, seed = title }: Props) {
  const pct = progress === undefined ? undefined : Math.round(Math.min(Math.max(progress, 0), 1) * 100);
  return (
    <Link href={href} className="group block w-full">
      <div
        className={`relative aspect-video overflow-hidden rounded-ui transition-transform duration-200 ease-out group-hover:scale-[1.03] group-focus-visible:scale-[1.03] group-active:scale-[0.98] ${placeholderFor(seed)}`}
      >
        {image && (
          // eslint-disable-next-line @next/next/no-img-element -- thumbnails come from remote catalogs
          <img src={image} alt="" width={320} height={180} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
        )}
        {pct !== undefined && (
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pct}
            aria-label={title}
            className="absolute inset-x-0 bottom-0 h-1 bg-black/40"
          >
            <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
          </div>
        )}
      </div>
      {/* "Title · Ep 4": the episode stays visible when a long title is cut. */}
      <p className="mt-2.5 flex min-w-0 text-sm font-bold">
        <span className="truncate">{title}</span>
        {caption && <span className="shrink-0 whitespace-pre text-muted">{` · ${caption}`}</span>}
      </p>
    </Link>
  );
}
