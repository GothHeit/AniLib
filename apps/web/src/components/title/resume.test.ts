import { describe, expect, it } from "vitest";

import { nextUp, progressRatio, type Progress } from "./resume";

const p = (episode: number, extra: Partial<Progress> = {}): Progress => ({
  anime_id: 1,
  episode,
  position_seconds: 100,
  duration_seconds: 1400,
  completed: false,
  updated_at: `2026-10-0${episode}T00:00:00Z`,
  ...extra,
});

describe("nextUp", () => {
  it("starts at the first episode when nothing was watched", () => {
    expect(nextUp([], [1, 2, 3])).toEqual({ episode: 1, resume: false });
  });

  it("continues the latest unfinished episode", () => {
    expect(nextUp([p(1, { completed: true }), p(2)], [1, 2, 3])).toEqual({ episode: 2, resume: true });
  });

  it("moves on after a finished episode, picking the latest by time", () => {
    const old = p(3, { updated_at: "2026-01-01T00:00:00Z" });
    expect(nextUp([old, p(2, { completed: true })], [1, 2, 3])).toEqual({ episode: 3, resume: false });
  });

  it("starts over after the last episode and has nothing without episodes", () => {
    expect(nextUp([p(3, { completed: true })], [1, 2, 3])).toEqual({ episode: 1, resume: false });
    expect(nextUp([p(1)], [])).toBeNull();
  });
});

describe("progressRatio", () => {
  it("is full when completed and empty when unknown", () => {
    expect(progressRatio(p(1, { completed: true }))).toBe(1);
    expect(progressRatio(p(1, { duration_seconds: null }))).toBeUndefined();
    expect(progressRatio(undefined)).toBeUndefined();
    expect(progressRatio(p(1, { position_seconds: 700 }))).toBe(0.5);
  });
});
