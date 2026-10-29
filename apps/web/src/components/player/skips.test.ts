import { describe, expect, it } from "vitest";

import { activeSkip, mergeSkips } from "./skips";

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

describe("mergeSkips", () => {
  const intro = { kind: "intro" as const, start: 30, end: 110 };

  it("keeps the source's own and fills in the kinds it lacks", () => {
    const extra = [
      { kind: "intro" as const, start: 0, end: 90 },
      { kind: "recap" as const, start: 110, end: 170 },
      { kind: "outro" as const, start: 1300, end: 1390 },
    ];
    expect(mergeSkips([intro], extra)).toEqual([intro, extra[1], extra[2]]);
  });

  it("drops a community skip that overlaps one of the source's", () => {
    expect(mergeSkips([intro], [{ kind: "recap", start: 100, end: 160 }])).toEqual([intro]);
  });
});
