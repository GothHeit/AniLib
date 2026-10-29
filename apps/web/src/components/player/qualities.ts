import type { Quality } from "./SettingsMenu";

/**
 * One menu entry per height, tallest first. A library episode has the same picture twice
 * (original HEVC and an H.264 copy); hls.js drops the codecs this device can't play.
 */
export function qualityList(levels: { height: number }[]): Quality[] {
  return levels
    .map((level, index) => ({ index, height: level.height }))
    .filter((q, i, all) => q.height > 0 && all.findIndex((o) => o.height === q.height) === i)
    .sort((a, b) => b.height - a.height);
}

const HEVC = /^(hvc1|hev1)\./;

/**
 * Indexes to drop so the original HEVC plays when the device can decode it: both copies have
 * the same height, so left alone hls.js picks between them by bitrate alone. Nothing is
 * dropped when no HEVC level survived hls.js's codec check.
 */
export function levelsToDrop(levels: { videoCodec?: string }[]): number[] {
  if (!levels.some((l) => HEVC.test(l.videoCodec ?? ""))) return [];
  return levels.flatMap((l, i) => (HEVC.test(l.videoCodec ?? "") ? [] : [i]));
}
