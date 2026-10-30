import { describe, expect, it } from "vitest";

import { mergeMessages } from "@/i18n/messages";

import player from "../../../messages/en/player.json";
import sources from "../../../messages/en/sources.json";

import { sameStream, streamLabel, type StreamNames } from "./streams";

function lookup(key: string): unknown {
  return key.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], (mergeMessages([player, sources]).player));
}

const names: StreamNames = {
  has: (key) => typeof lookup(key) === "string",
  t: (key, values = {}) => (lookup(key) as string).replace(/\{(\w+)\}/g, (_, name: string) => values[name] ?? ""),
};

describe("streamLabel", () => {
  it("says what a known source's version is", () => {
    expect(streamLabel(names, { source: "animesdigital", lang: "sub" })).toBe("Animes Digital · Portuguese subtitles");
    expect(streamLabel(names, { source: "zoko", lang: "dub" })).toBe("Zoko · English dub");
    expect(streamLabel(names, { source: "animedrive", lang: "dub" })).toBe("AnimeDrive · Portuguese dub");
  });

  it("falls back to the name and sub or dub", () => {
    expect(streamLabel(names, { source: "other", lang: "dub" })).toBe("other · Dub");
  });
});

describe("sameStream", () => {
  it("needs both the source and the version to match", () => {
    expect(sameStream({ source: "zoko", lang: "sub" }, { source: "zoko", lang: "sub" })).toBe(true);
    expect(sameStream({ source: "zoko", lang: "sub" }, { source: "zoko", lang: "dub" })).toBe(false);
  });
});
