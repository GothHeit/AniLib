import { describe, expect, it } from "vitest";

import { readLimitedBody } from "./body-limit";

const post = (body: string, headers?: HeadersInit) => new Request("http://x/", { method: "POST", body, headers });

describe("readLimitedBody", () => {
  it("returns a body within the limit", async () => {
    const body = await readLimitedBody(post("hello"), 10);
    expect(new TextDecoder().decode(body!)).toBe("hello");
  });

  it("refuses a body over the limit", async () => {
    expect(await readLimitedBody(post("x".repeat(11)), 10)).toBeNull();
  });

  it("refuses on the declared length without reading", async () => {
    expect(await readLimitedBody(post("x", { "content-length": "999" }), 10)).toBeNull();
  });

  it("accepts an empty body", async () => {
    expect((await readLimitedBody(new Request("http://x/", { method: "POST" }), 10))!.byteLength).toBe(0);
  });
});
