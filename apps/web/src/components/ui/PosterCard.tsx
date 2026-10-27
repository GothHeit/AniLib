import { Link } from "@/i18n/navigation";

const GRADIENTS = [
  "bg-poster-1",
  "bg-poster-2",
  "bg-poster-3",
  "bg-poster-4",
  "bg-poster-5",
  "bg-poster-6",
];

/** The same title always gets the same placeholder gradient. */
export function gradientFor(seed: string | number) {
  const n = typeof seed === "number" ? seed : [...seed].reduce((sum, c) => sum + c.charCodeAt(0), 0);
  return GRADIENTS[Math.abs(n) % GRADIENTS.length];
}

type Props = {
  href: string;
  title: string;
  image?: string | null;
  caption?: string;
  seed?: string | number;
};

/** Tall 2:3 poster for browsing rows and grids. */
export function PosterCard({ href, title, image, caption, seed = title }: Props) {
  return (
    <Link href={href} className="group block w-full">
      <div
        className={`relative aspect-[2/3] overflow-hidden rounded-ui border border-line transition-transform group-hover:scale-[1.03] group-focus-visible:scale-[1.03] ${gradientFor(seed)}`}
      >
        {image && (
          // eslint-disable-next-line @next/next/no-img-element -- posters come from remote catalogs
          <img src={image} alt="" width={300} height={450} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
        )}
      </div>
      <p className="mt-2 line-clamp-2 text-sm font-medium">{title}</p>
      {caption && <p className="text-xs text-muted">{caption}</p>}
    </Link>
  );
}
