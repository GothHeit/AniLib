import { describe, expect, it } from "vitest";

import { safeNext } from "./redirect";

describe("safeNext", () => {
  it("keeps local paths", () => {
    expect(safeNext("/browse?genre=1")).toBe("/browse?genre=1");
  });
  it.each([null, undefined, "", "https://evil.test", "//evil.test", "/\\evil.test", "browse", "/a\nb", "/\t/evil.test"])(
    "falls back to home for %s",
    (value) => {
      expect(safeNext(value)).toBe("/");
    },
  );
});
