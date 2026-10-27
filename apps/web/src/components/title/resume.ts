import type { components } from "@app/api-client";

export type Progress = components["schemas"]["ProgressOut"];

export type NextUp = { episode: number; resume: boolean; rewatch?: boolean };

/**
 * The episode the primary button opens: the furthest one started if it isn't finished,
 * otherwise the next available one, otherwise the first (a rewatch when every one is watched). Furthest, not most recent, so
 * rewatching an early episode doesn't move the resume point back. `episodes` must be sorted.
 */
export function nextUp(progress: Progress[], episodes: number[]): NextUp | null {
  if (episodes.length === 0) return null;
  const latest = progress.reduce<Progress | undefined>(
    (best, p) => (!best || p.episode > best.episode ? p : best),
    undefined,
  );
  if (!latest) return { episode: episodes[0], resume: false };
  if (!latest.completed && episodes.includes(latest.episode)) return { episode: latest.episode, resume: true };
  const next = episodes.find((e) => e > latest.episode);
  if (next !== undefined) return { episode: next, resume: false };
  const watched = new Set(progress.filter((p) => p.completed).map((p) => p.episode));
  return { episode: episodes[0], resume: false, rewatch: episodes.every((e) => watched.has(e)) };
}

/** 0 to 1 for an episode's progress bar, or undefined when it was never started. */
export function progressRatio(p: Progress | undefined): number | undefined {
  if (!p) return undefined;
  if (p.completed) return 1;
  if (!p.duration_seconds) return undefined;
  return Math.min(p.position_seconds / p.duration_seconds, 1);
}
