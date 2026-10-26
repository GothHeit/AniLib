import { describe, expect, it } from "vitest";

import { describeAgent } from "./describeAgent";

describe("describeAgent", () => {
  it("names the browser and system", () => {
    expect(
      describeAgent("Mozilla/5.0 (X11; Linux x86_64; rv:130.0) Gecko/20100101 Firefox/130.0"),
    ).toEqual({ browser: "Firefox", system: "Linux" });
    expect(
      describeAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36 Edg/126.0",
      ),
    ).toEqual({ browser: "Edge", system: "Windows" });
  });

  it("tells Chrome from Safari and reads phones as phones, not as macOS", () => {
    expect(
      describeAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Version/17.5 Safari/604.1"),
    ).toEqual({ browser: "Safari", system: "iOS" });
    expect(describeAgent("Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/126.0 Mobile Safari/537.36")).toEqual({
      browser: "Chrome",
      system: "Android",
    });
  });

  it("returns nulls for an unknown or missing agent", () => {
    expect(describeAgent(null)).toEqual({ browser: null, system: null });
    expect(describeAgent("curl/8.0")).toEqual({ browser: null, system: null });
  });
});
