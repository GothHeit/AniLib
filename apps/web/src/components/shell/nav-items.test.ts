import { describe, expect, it } from "vitest";

import { isActive } from "./nav-items";

describe("isActive", () => {
  it("matches home only exactly", () => {
    expect(isActive("/", "/")).toBe(true);
    expect(isActive("/browse", "/")).toBe(false);
  });
  it("matches a section and its children", () => {
    expect(isActive("/browse", "/browse")).toBe(true);
    expect(isActive("/browse/x", "/browse")).toBe(true);
    expect(isActive("/browser", "/browse")).toBe(false);
  });
});
