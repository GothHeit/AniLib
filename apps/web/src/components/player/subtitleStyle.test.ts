import { describe, expect, it } from "vitest";

import { blockPosition, cueStyle, cueText, DEFAULT_STYLE } from "./subtitleStyle";

describe("cueText", () => {
  it("drops markup and decodes entities", () => {
    expect(cueText("<i>Hello</i> <c.yellow>moon</c> &amp; <v Rin>stars</v>&nbsp;&lt;3")).toBe(
      "Hello moon & stars <3",
    );
  });
});

describe("cueStyle", () => {
  it("outlines by default and boxes on request", () => {
    expect(cueStyle(DEFAULT_STYLE)).toMatchObject({ color: "#ffffff", backgroundColor: undefined });
    expect(cueStyle(DEFAULT_STYLE).textShadow).toBeTruthy();
    const boxed = cueStyle({ ...DEFAULT_STYLE, subtitle_background: "solid", subtitle_color: "yellow" });
    expect(boxed).toMatchObject({ backgroundColor: "#000", color: "#ffe94d", textShadow: undefined });
  });
});

describe("blockPosition", () => {
  it("clears the controls only while they show", () => {
    expect(blockPosition("bottom", true)).toEqual({ bottom: "9rem" });
    expect(blockPosition("bottom", false)).toEqual({ bottom: "6%" });
    expect(blockPosition("top", true)).toEqual({ top: "8%" });
  });
});
