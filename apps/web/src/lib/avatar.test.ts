import { describe, expect, it } from "vitest";

import { avatarSrc, initialHue } from "./avatar";

describe("avatarSrc", () => {
  it("points an upload at the API with its version", () => {
    expect(avatarSrc("u1", { kind: "upload", version: 3 })).toBe("/api/proxy/users/u1/avatar?v=3");
  });

  it("uses the shipped artwork for a known preset only", () => {
    expect(avatarSrc("u1", { kind: "preset", preset: "moon-2", version: 0 })).toBe("/avatars/moon-2.svg");
    expect(avatarSrc("u1", { kind: "preset", preset: "../x", version: 0 })).toBeNull();
  });

  it("uses the MAL picture, and nothing when there is none", () => {
    expect(avatarSrc("u1", { kind: "mal", url: "https://cdn.example/a.jpg", version: 0 })).toBe("https://cdn.example/a.jpg");
    expect(avatarSrc("u1", { kind: "none", version: 0 })).toBeNull();
  });
});

describe("initialHue", () => {
  it("is stable and within the colour wheel", () => {
    expect(initialHue("kafka")).toBe(initialHue("kafka"));
    expect(initialHue("kafka")).toBeGreaterThanOrEqual(0);
    expect(initialHue("kafka")).toBeLessThan(360);
  });
});
