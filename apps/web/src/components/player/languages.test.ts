import { describe, expect, it } from "vitest";

import { languageName, trackNames } from "./languages";

describe("languageName", () => {
  it("names a language in the viewer's language", () => {
    expect(languageName("en", "pt")).toBe("Inglês");
    expect(languageName("pt-BR", "en")).toBe("Brazilian Portuguese");
  });

  it("gives up on unknown or invalid codes", () => {
    expect(languageName("und", "en")).toBeNull();
    expect(languageName("not a code!", "en")).toBeNull();
    expect(languageName(undefined, "en")).toBeNull();
  });
});

describe("trackNames", () => {
  it("falls back to the source label", () => {
    expect(trackNames([{ lang: "und", label: "Signs" }], "en")).toEqual(["Signs"]);
  });

  it("tells apart tracks in the same language", () => {
    expect(
      trackNames(
        [
          { lang: "en", label: "English" },
          { lang: "en", label: "English (CC)" },
        ],
        "en",
      ),
    ).toEqual(["English", "English (English (CC))"]);
  });
});
