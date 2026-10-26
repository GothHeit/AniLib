import { describe, expect, it, vi } from "vitest";

vi.mock("@/i18n/navigation", () => ({ Link: () => null, useRouter: () => ({}) }));
vi.mock("@/lib/api", () => ({ api: {} }));

const { watchHref } = await import("./Player");

describe("watchHref", () => {
  it("keeps sub and the start out of the URL unless needed", () => {
    expect(watchHref("allanime", 5, 3)).toBe("/watch/allanime/5/3");
    expect(watchHref("allanime", 5, 3, "dub", 61.8)).toBe("/watch/allanime/5/3?lang=dub&t=61");
  });
});
