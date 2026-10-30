import { describe, expect, it } from "vitest";

import { enabledSources, mergeMessages, pruneSources } from "./messages";

describe("mergeMessages", () => {
  it("merges files that share a namespace", () => {
    expect(mergeMessages([{ player: { a: "1" } }, { player: { b: "2" }, other: "x" }])).toEqual({
      player: { a: "1", b: "2" },
      other: "x",
    });
  });
});

describe("pruneSources", () => {
  const messages = { player: { title: "t", streams: { zoko: { sub: "Z" }, local: { sub: "L" } } } };

  it("keeps only the enabled sources", () => {
    expect(pruneSources(messages, ["local"])).toEqual({ player: { title: "t", streams: { local: { sub: "L" } } } });
  });

  it("drops every name when none are enabled", () => {
    expect(JSON.stringify(pruneSources(messages, []))).not.toContain("zoko");
  });
});

describe("enabledSources", () => {
  it("parses the comma list", () => {
    expect(enabledSources(" zoko, local ,")).toEqual(["zoko", "local"]);
    expect(enabledSources(undefined)).toEqual([]);
  });
});
