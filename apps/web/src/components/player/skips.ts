import type { components } from "@app/api-client";

export type Skip = components["schemas"]["SkipOut"];

// The button disappears this close to the end, so it never jumps by a second or two.
const MIN_LEFT = 2;

/** The intro or outro the viewer is inside at `time`, if any. */
export function activeSkip(skips: Skip[], time: number): Skip | undefined {
  return skips.find((s) => time >= s.start && time < s.end - MIN_LEFT);
}
