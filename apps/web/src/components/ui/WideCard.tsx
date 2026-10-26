import { Link } from "@/i18n/navigation";

import { gradientFor } from "./PosterCard";

type Props = {
  href: string;
  title: string;
  image?: string | null;
  caption?: string;
  /** 0 to 1. Shows the progress bar when set. */
  progress?: number;
  seed?: string | number;
};

/** Wide 16:9 card, used for Continue watching. */
export function WideCard({ href, title, image, caption, progress, seed = title }: Props) {
  const pct = progress === undefined ? undefined : Math.round(Math.min(Math.max(progress, 0), 1) * 100);
  return (
    <Link href={href} className="group block w-full">
      <div
        className={`relative aspect-video overflow-hidden rounded-ui border border-line transition-transform group-hover:scale-[1.03] group-focus-visible:scale-[1.03] ${gradientFor(seed)}`}
      >
        {image && (
          // eslint-disable-next-line @next/next/no-img-element -- thumbnails come from remote catalogs
          <img src={image} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
        )}
        {pct !== undefined && (
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pct}
            aria-label={title}
            className="absolute inset-x-0 bottom-0 h-1 bg-black/50"
          >
            <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
          </div>
        )}
      </div>
      <p className="mt-2 line-clamp-1 text-sm font-medium">{title}</p>
      {caption && <p className="text-xs text-muted">{caption}</p>}
    </Link>
  );
}
