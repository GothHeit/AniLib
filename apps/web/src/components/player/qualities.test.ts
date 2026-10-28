import { describe, expect, it } from "vitest";

import { qualityList } from "./qualities";

describe("qualityList", () => {
  it("lists each height once, tallest first, and skips unknown heights", () => {
    expect(qualityList([{ height: 720 }, { height: 1080 }, { height: 0 }, { height: 1080 }])).toEqual([
      { index: 1, height: 1080 },
      { index: 0, height: 720 },
    ]);
  });
});
