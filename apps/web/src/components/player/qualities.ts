import type { Quality } from "./SettingsMenu";

/**
 * One menu entry per height, tallest first. A library episode has the same picture twice
 * (original HEVC and an H.264 copy); hls.js keeps whichever codec this device plays.
 */
export function qualityList(levels: { height: number }[]): Quality[] {
  return levels
    .map((level, index) => ({ index, height: level.height }))
    .filter((q, i, all) => q.height > 0 && all.findIndex((o) => o.height === q.height) === i)
    .sort((a, b) => b.height - a.height);
}
