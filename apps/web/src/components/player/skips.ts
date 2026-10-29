import type { components } from "@app/api-client";

export type Skip = components["schemas"]["SkipOut"];

// The button disappears this close to the end, so it never jumps by a second or two.
const MIN_LEFT = 2;

/**
 * The source's own skips, plus the community ones (AniSkip) for kinds the source didn't give,
 * as long as they don't overlap one of the source's.
 */
export function mergeSkips(own: Skip[], extra: Skip[]): Skip[] {
  const added = extra.filter(
    (e) => !own.some((o) => o.kind === e.kind || (e.start < o.end && o.start < e.end)),
  );
  return [...own, ...added].sort((a, b) => a.start - b.start);
}

/** The stretch to skip (intro, recap or outro) the viewer is inside at `time`, if any. */
export function activeSkip(skips: Skip[], time: number): Skip | undefined {
  return skips.find((s) => time >= s.start && time < s.end - MIN_LEFT);
}
