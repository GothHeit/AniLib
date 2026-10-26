import type { ReactNode } from "react";

/** Responsive poster grid: 2 columns on phones up to 8 on wide screens. */
export function PosterGrid({ children }: { children: ReactNode }) {
  return (
    <ul className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8">
      {Array.isArray(children) ? children.map((c, i) => <li key={i}>{c}</li>) : <li>{children}</li>}
    </ul>
  );
}

export function GridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div
      aria-hidden="true"
      className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8"
    >
      {Array.from({ length: count }, (_, i) => (
        <div key={i}>
          <div className="aspect-[2/3] animate-pulse rounded-ui bg-surface" />
          <div className="mt-2 h-4 w-3/4 animate-pulse rounded-ui bg-surface" />
        </div>
      ))}
    </div>
  );
}
