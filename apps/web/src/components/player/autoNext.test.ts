import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { setAutoNext, useAutoNext } from "./autoNext";

afterEach(() => {
  localStorage.clear();
  act(() => setAutoNext(true));
});

describe("useAutoNext", () => {
  it("is on until the viewer turns it off, and remembers the choice", () => {
    const { result } = renderHook(() => useAutoNext());
    expect(result.current).toBe(true);
    act(() => setAutoNext(false));
    expect(result.current).toBe(false);
    expect(localStorage.getItem("player.autoNext")).toBe("off");
  });
});
