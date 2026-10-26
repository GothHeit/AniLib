import { describe, expect, it } from "vitest";

import { captionOf, progressFraction, type AnimeCard, type ProgressOut } from "./catalog";

const progress = (over: Partial<ProgressOut>): ProgressOut => ({
  anime_id: 1,
  episode: 1,
  position_seconds: 0,
  duration_seconds: 100,
  completed: false,
  updated_at: "2026-01-01T00:00:00Z",
  ...over,
});

describe("progressFraction", () => {
  it("is the position over the duration", () => {
    expect(progressFraction(progress({ position_seconds: 25 }))).toBe(0.25);
  });
  it("is full when completed and never above 1", () => {
    expect(progressFraction(progress({ completed: true }))).toBe(1);
    expect(progressFraction(progress({ position_seconds: 500 }))).toBe(1);
  });
  it("shows a sliver when the duration is unknown", () => {
    expect(progressFraction(progress({ duration_seconds: null }))).toBeGreaterThan(0);
  });
});

describe("captionOf", () => {
  it("joins year and score, skipping what is missing", () => {
    const card = { id: 1, title: "x", genres: [], mean: 8.44, start_season: { year: 2024, season: "fall" } } as AnimeCard;
    expect(captionOf(card)).toBe("2024 · ★ 8.4");
    expect(captionOf({ id: 2, title: "y", genres: [] } as AnimeCard)).toBe("");
  });
});
