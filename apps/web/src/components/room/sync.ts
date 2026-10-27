export type Playback = {
  playing: boolean;
  /** Seconds into the episode when the event arrived. */
  position: number;
  /** `Date.now()` when the event arrived, to carry the position forward while it plays. */
  receivedAt: number;
};

/** Further apart than this and a player is pulled back to the room's position. */
export const DRIFT_SECONDS = 1.5;
/** How long after applying the room's state the player's own events are not the viewer's doing. */
export const APPLY_WINDOW_MS = 800;

export function expectedPosition(playback: Playback, now = Date.now()): number {
  return playback.playing ? playback.position + (now - playback.receivedAt) / 1000 : playback.position;
}

export type LocalEvent = "play" | "pause" | "seek";

/**
 * What the viewer's own action means for the room: the action to send, or null when the room
 * already agrees (joining a playing room and pressing play must not rewind everyone).
 */
export function commandFor(
  event: LocalEvent,
  playback: Playback,
  currentTime: number,
  now = Date.now(),
): { action: LocalEvent; position: number } | null {
  const drifted = Math.abs(currentTime - expectedPosition(playback, now)) > DRIFT_SECONDS;
  if (event === "play") return playback.playing ? null : { action: "play", position: currentTime };
  if (event === "pause") return playback.playing ? { action: "pause", position: currentTime } : null;
  return drifted ? { action: "seek", position: currentTime } : null;
}

/** The fix for a player that disagrees with the room, or null when it is close enough. */
export function correction(
  playback: Playback,
  video: { currentTime: number; paused: boolean },
  now = Date.now(),
): { seekTo: number | null; play: boolean | null } | null {
  const target = expectedPosition(playback, now);
  const seekTo = Math.abs(video.currentTime - target) > DRIFT_SECONDS ? target : null;
  const play = playback.playing === video.paused ? playback.playing : null;
  return seekTo === null && play === null ? null : { seekTo, play };
}

/** Votes needed to switch episodes: more than half of the people in the room. */
export function votesNeeded(members: number): number {
  return Math.floor(members / 2) + 1;
}
