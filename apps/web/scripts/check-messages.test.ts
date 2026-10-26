// @vitest-environment node
import { describe, expect, it } from "vitest";

// @ts-expect-error plain .mjs script without types
import { checkMessages } from "./check-messages.mjs";

describe("messages", () => {
  it("has the same files and keys in every language", () => {
    expect(checkMessages()).toEqual([]);
  });
});
