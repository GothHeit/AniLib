import { describe, expect, it } from "vitest";

import { activeSkip } from "./skips";

describe("activeSkip", () => {
  const skips = [
    { kind: "intro" as const, start: 30, end: 110 },
    { kind: "outro" as const, start: 1300, end: 1390 },
  ];

  it("finds the stretch the time is in, and nothing outside", () => {
    expect(activeSkip(skips, 29)).toBeUndefined();
    expect(activeSkip(skips, 30)?.kind).toBe("intro");
    expect(activeSkip(skips, 1350)?.kind).toBe("outro");
    expect(activeSkip(skips, 500)).toBeUndefined();
    expect(activeSkip([], 40)).toBeUndefined();
  });

  it("hides the button in the last seconds of a stretch", () => {
    expect(activeSkip(skips, 108.5)).toBeUndefined();
  });
});
