import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { deviceHeaders, refreshSession, resetSessionState } from "./session";

const tokens = { access_token: "new", refresh_token: "next", token_type: "bearer", expires_in: 900 };

beforeEach(() => resetSessionState());
afterEach(() => vi.unstubAllGlobals());

describe("refreshSession", () => {
  it("shares one API call between concurrent callers", async () => {
    const fetchMock = vi.fn(async () => Response.json(tokens));
    vi.stubGlobal("fetch", fetchMock);
    const results = await Promise.all([refreshSession("old"), refreshSession("old"), refreshSession("old")]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(results.every((r) => typeof r === "object" && r.access_token === "new")).toBe(true);
  });

  it("gives a late caller the same result instead of reusing the spent token", async () => {
    const fetchMock = vi.fn(async () => Response.json(tokens));
    vi.stubGlobal("fetch", fetchMock);
    await refreshSession("old");
    expect(await refreshSession("old")).toMatchObject({ refresh_token: "next" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("reports a refused token as rejected", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 401 })));
    expect(await refreshSession("bad")).toBe("rejected");
  });

  it("reports an unreachable API or a 5xx as unavailable, and does not cache it", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("down"))
      .mockResolvedValueOnce(new Response("{}", { status: 503 }))
      .mockResolvedValueOnce(Response.json(tokens));
    vi.stubGlobal("fetch", fetchMock);
    expect(await refreshSession("any")).toBe("unavailable");
    expect(await refreshSession("any")).toBe("unavailable");
    expect((await refreshSession("any") as { access_token: string }).access_token).toBe("new");
  });

  it("shares its state across separately loaded copies of the module", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json(tokens)));
    await refreshSession("old");
    vi.resetModules();
    const copy = await import("./session");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect(await copy.refreshSession("old")).toMatchObject({ access_token: "new" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("deviceHeaders", () => {
  it("keeps only what the sessions list shows", () => {
    const headers = new Headers({ "user-agent": "Firefox", "x-forwarded-for": "1.2.3.4", cookie: "secret", accept: "*/*" });
    expect(deviceHeaders(headers)).toEqual({ "user-agent": "Firefox", "x-forwarded-for": "1.2.3.4" });
  });

  it("is sent with the refresh call", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => Response.json(tokens));
    vi.stubGlobal("fetch", fetchMock);
    await refreshSession("old", { "user-agent": "Firefox" });
    const init = fetchMock.mock.calls[0][1];
    expect(init?.headers).toMatchObject({ "user-agent": "Firefox" });
  });
});
