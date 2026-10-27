import { describe, expect, it } from "vitest";

import { cleanSynopsis } from "./synopsis";

describe("cleanSynopsis", () => {
  it("removes a trailing written-by credit", () => {
    expect(cleanSynopsis("A race begins.\n\n[Written by MAL Rewrite]")).toBe("A race begins.");
  });

  it("removes a trailing source credit", () => {
    expect(cleanSynopsis("A race begins. (Source: Crunchyroll News)")).toBe("A race begins.");
  });

  it("keeps brackets that are part of the story", () => {
    expect(cleanSynopsis("He wears [the mask] daily.")).toBe("He wears [the mask] daily.");
  });

  it("handles missing text", () => {
    expect(cleanSynopsis(undefined)).toBe("");
    expect(cleanSynopsis(null)).toBe("");
  });
});
