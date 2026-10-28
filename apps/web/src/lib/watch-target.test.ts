import { describe, expect, it } from "vitest";

import { pickEpisode, watchHref } from "./watch-target";

describe("watchHref", () => {
  it("keeps sub and the start out of the URL unless needed", () => {
    expect(watchHref("zoko", 5, 3)).toBe("/watch/zoko/5/3");
    expect(watchHref("zoko", 5, 3, "dub", 61.8)).toBe("/watch/zoko/5/3?lang=dub&t=61");
  });
});

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
