import { describe, expect, it, vi } from "vitest";

vi.mock("@/i18n/navigation", () => ({ Link: () => null, useRouter: () => ({}) }));
vi.mock("@/lib/api", () => ({ api: {} }));

const { pickTrack, watchHref } = await import("./Player");

describe("watchHref", () => {
  it("keeps sub and the start out of the URL unless needed", () => {
    expect(watchHref("allanime", 5, 3)).toBe("/watch/allanime/5/3");
    expect(watchHref("allanime", 5, 3, "dub", 61.8)).toBe("/watch/allanime/5/3?lang=dub&t=61");
  });
});

describe("pickTrack", () => {
  const tracks = [
    { lang: "en", label: "English", url: "a" },
    { lang: "pt-BR", label: "Portuguese", url: "b" },
    { lang: "es", label: "Spanish", url: "c" },
  ];

  it("defaults to pt-BR, then English", () => {
    expect(pickTrack(tracks, null)).toBe(1);
    expect(pickTrack([tracks[0], tracks[2]], null)).toBe(0);
    expect(pickTrack([tracks[2]], null)).toBe(-1);
  });

  it("honours a saved language, falling back when the episode lacks it", () => {
    expect(pickTrack(tracks, "es")).toBe(2);
    expect(pickTrack(tracks, "fr")).toBe(1);
  });

  it("turns subtitles off", () => {
    expect(pickTrack(tracks, "off")).toBe(-1);
  });
});
