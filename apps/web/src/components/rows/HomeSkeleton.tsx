import { Skeleton } from "@/components/ui/Skeleton";

/** Stands in for the hero and rows while /home loads. */
export function HomeSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="min-h-[26rem] bg-hero sm:min-h-[32rem]" />
      <div className="space-y-8 py-6">
        {[0, 1].map((r) => (
          <div key={r}>
            <Skeleton className="mx-4 mb-3 h-6 w-48 sm:mx-8" />
            <div className="flex gap-3 overflow-hidden px-4 sm:px-8">
              {Array.from({ length: 8 }, (_, i) => (
                <Skeleton key={i} className="aspect-[2/3] w-36 shrink-0 sm:w-44" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
