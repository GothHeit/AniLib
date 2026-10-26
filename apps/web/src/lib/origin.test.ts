import { describe, expect, it } from "vitest";

import { isSameOrigin } from "./origin";

const req = (method: string, headers: Record<string, string>) =>
  new Request("http://localhost:3000/api/proxy/me", { method, headers });

describe("isSameOrigin", () => {
  it("lets reads through", () => {
    expect(isSameOrigin(req("GET", { origin: "https://evil.example" }))).toBe(true);
  });

  it("accepts a write from the same host", () => {
    expect(isSameOrigin(req("POST", { origin: "http://localhost:3000", host: "localhost:3000" }))).toBe(true);
  });

  it("trusts the forwarded host behind a reverse proxy", () => {
    const headers = { origin: "https://moon.example", host: "web:3000", "x-forwarded-host": "moon.example" };
    expect(isSameOrigin(req("PATCH", headers))).toBe(true);
  });

  it("refuses a write from another site", () => {
    expect(isSameOrigin(req("POST", { origin: "https://evil.example", host: "localhost:3000" }))).toBe(false);
    expect(isSameOrigin(req("DELETE", { origin: "null", host: "localhost:3000" }))).toBe(false);
  });

  it("without an Origin, only refuses what the browser marks cross-site", () => {
    expect(isSameOrigin(req("POST", { "sec-fetch-site": "cross-site" }))).toBe(false);
    expect(isSameOrigin(req("POST", { "sec-fetch-site": "same-origin" }))).toBe(true);
    expect(isSameOrigin(req("POST", {}))).toBe(true);
  });
});
