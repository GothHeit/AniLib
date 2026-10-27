import { describe, expect, it } from "vitest";

import { commandFor, correction, expectedPosition, votesNeeded, type Playback } from "./sync";

const playing: Playback = { playing: true, position: 100, receivedAt: 1_000_000 };
const paused: Playback = { playing: false, position: 100, receivedAt: 1_000_000 };

describe("expectedPosition", () => {
  it("moves on while playing and holds still when paused", () => {
    expect(expectedPosition(playing, 1_005_000)).toBe(105);
    expect(expectedPosition(paused, 1_005_000)).toBe(100);
  });
});

describe("commandFor", () => {
  it("sends what the viewer did when the room disagrees", () => {
    expect(commandFor("play", paused, 100)).toEqual({ action: "play", position: 100 });
    expect(commandFor("pause", playing, 103, 1_003_000)).toEqual({ action: "pause", position: 103 });
  });

  it("stays quiet when the room already agrees, so a late joiner doesn't rewind everyone", () => {
    expect(commandFor("play", playing, 0, 1_000_000)).toBeNull();
    expect(commandFor("pause", paused, 100)).toBeNull();
  });

  it("sends a seek only when the player moved away from the room", () => {
    expect(commandFor("seek", playing, 101, 1_001_000)).toBeNull();
    expect(commandFor("seek", playing, 300, 1_001_000)).toEqual({ action: "seek", position: 300 });
  });
});

describe("correction", () => {
  it("does nothing when the player is close and in the same state", () => {
    expect(correction(playing, { currentTime: 101, paused: false }, 1_001_000)).toBeNull();
  });

  it("seeks a drifted player and fixes play/pause", () => {
    expect(correction(playing, { currentTime: 10, paused: true }, 1_002_000)).toEqual({ seekTo: 102, play: true });
    expect(correction(paused, { currentTime: 100, paused: false })).toEqual({ seekTo: null, play: false });
  });
});

describe("votesNeeded", () => {
  it("is a strict majority", () => {
    expect([1, 2, 3, 4, 10].map(votesNeeded)).toEqual([1, 2, 2, 3, 6]);
  });
});
