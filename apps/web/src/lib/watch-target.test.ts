import { describe, expect, it } from "vitest";

import { pickEpisode } from "./watch-target";

describe("pickEpisode", () => {
  it("keeps an episode the source has", () => {
    expect(pickEpisode([1, 2, 3], 2)).toBe(2);
  });

  it("clamps a resume point past the last aired episode", () => {
    expect(pickEpisode([1, 2, 3], 4)).toBe(3);
  });

  it("skips to the next one when the wanted episode is missing", () => {
    expect(pickEpisode([1, 3], 2)).toBe(3);
  });

  it("has nothing without episodes", () => {
    expect(pickEpisode([], 1)).toBeNull();
  });
});
