/**
 * The episode to open when someone asks for `wanted` of a title whose source lists `episodes`.
 * A resume point can sit past what has aired (or past a shorter source), so it is clamped to
 * the last available episode; a wanted episode missing from the middle goes to the next one.
 * Returns null when there are no episodes.
 */
export function pickEpisode(episodes: number[], wanted: number): number | null {
  if (episodes.length === 0) return null;
  const sorted = [...episodes].sort((a, b) => a - b);
  return sorted.find((e) => e >= wanted) ?? sorted[sorted.length - 1];
}
