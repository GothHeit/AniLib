import { describe, expect, it } from "vitest";

import { levelsToDrop, qualityList } from "./qualities";

describe("qualityList", () => {
  it("lists each height once, tallest first, and skips unknown heights", () => {
    expect(qualityList([{ height: 720 }, { height: 1080 }, { height: 0 }, { height: 1080 }])).toEqual([
      { index: 1, height: 1080 },
      { index: 0, height: 720 },
    ]);
  });
});

describe("levelsToDrop", () => {
  it("drops the H.264 copy when an HEVC level is playable", () => {
    expect(levelsToDrop([{ videoCodec: "avc1.640028" }, { videoCodec: "hvc1.2.4.L120.B0" }])).toEqual([0]);
  });

  it("drops nothing when no HEVC level is left", () => {
    expect(levelsToDrop([{ videoCodec: "avc1.640028" }, { videoCodec: undefined }])).toEqual([]);
  });
});
