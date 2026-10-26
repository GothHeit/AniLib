import { describe, expect, it } from "vitest";

import { formatTime, isCompleted, resumePosition } from "./progress";

const saved = (position: number, extra = {}) => ({
  anime_id: 1,
  episode: 1,
  position_seconds: position,
  duration_seconds: 1400,
  completed: false,
  updated_at: "2026-10-26T00:00:00Z",
  ...extra,
});

describe("resumePosition", () => {
  it("resumes mid-episode", () => {
    expect(resumePosition(saved(600))).toBe(600);
  });

  it("starts over near either end or once watched", () => {
    expect(resumePosition(undefined)).toBe(0);
    expect(resumePosition(saved(3))).toBe(0);
    expect(resumePosition(saved(1395))).toBe(0);
    expect(resumePosition(saved(600, { completed: true }))).toBe(0);
  });
});

describe("isCompleted", () => {
  it("counts 90% as watched", () => {
    expect(isCompleted(1260, 1400)).toBe(true);
    expect(isCompleted(1259, 1400)).toBe(false);
    expect(isCompleted(10, 0)).toBe(false);
  });
});

describe("formatTime", () => {
  it("formats minutes and hours", () => {
    expect(formatTime(75)).toBe("1:15");
    expect(formatTime(3725)).toBe("1:02:05");
    expect(formatTime(NaN)).toBe("0:00");
  });
});
