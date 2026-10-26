import { describe, expect, it } from "vitest";

import { ACCESS_COOKIE, clearedCookies, REFRESH_COOKIE, sessionCookies } from "./cookies";

const tokens = { access_token: "a", refresh_token: "r", token_type: "bearer" as const, expires_in: 900 };

describe("cookies", () => {
  it("stores both tokens httpOnly, and the access cookie expires early", () => {
    const [access, refresh] = sessionCookies(tokens);
    expect(access).toMatchObject({ name: ACCESS_COOKIE, value: "a" });
    expect(refresh).toMatchObject({ name: REFRESH_COOKIE, value: "r" });
    expect(access.options.httpOnly && refresh.options.httpOnly).toBe(true);
    expect(access.options.maxAge).toBe(870);
    expect(refresh.options.maxAge).toBeGreaterThan(access.options.maxAge);
  });

  it("never sets a non-positive access lifetime", () => {
    expect(sessionCookies({ ...tokens, expires_in: 10 })[0].options.maxAge).toBe(1);
  });

  it("clears both cookies", () => {
    expect(clearedCookies().map((c) => [c.name, c.value, c.options.maxAge])).toEqual([
      [ACCESS_COOKIE, "", 0],
      [REFRESH_COOKIE, "", 0],
    ]);
  });
});
