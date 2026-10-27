"use client";

import { useCallback, useEffect, useRef, type ReactNode } from "react";

import { APPLY_WINDOW_MS, commandFor, correction, type LocalEvent, type Playback } from "./sync";

export type RoomBinding = {
  playback: Playback;
  /** False when the host locked the controls and this viewer isn't the host. */
  canControl: boolean;
  send: (action: LocalEvent, position: number) => unknown;
  /** The viewer asked for another episode: a vote, or an order when they host. */
  pickEpisode: (episode: number) => unknown;
  /** Called when a locked viewer tries to control the video. */
  onLocked: () => void;
  /** Rendered in the player's top bar, after the title. */
  topBar: ReactNode;
  /** Rendered over the video, outside the controls that fade away. */
  overlay: ReactNode;
};

/** What the sync needs from the player's <video>, so the hook never touches the element. */
export type VideoControls = {
  /** The playhead and play state, or null while there is nothing to sync (no metadata yet). */
  read: () => { currentTime: number; paused: boolean } | null;
  seek: (seconds: number) => void;
  play: () => void;
  pause: () => void;
};

const RESYNC_MS = 5000;

/**
 * Keeps a player in step with a room: applies what the room says to the video, and turns the
 * viewer's own play, pause and seek into commands. Without a room it does nothing.
 */
export function useRoomSync(video: VideoControls, room: RoomBinding | undefined) {
  const latest = useRef(room);
  const controls = useRef(video);
  const ignoreUntil = useRef(0);

  useEffect(() => {
    latest.current = room;
    controls.current = video;
  });

  const apply = useCallback(() => {
    const current = latest.current;
    // Before the metadata is in there is nothing to seek yet; loadedmetadata calls this again.
    const state = controls.current.read();
    if (!state || !current) return;
    const fix = correction(current.playback, state);
    if (!fix) return;
    ignoreUntil.current = Date.now() + APPLY_WINDOW_MS;
    if (fix.seekTo !== null) controls.current.seek(Math.max(fix.seekTo, 0));
    if (fix.play === true) controls.current.play();
    if (fix.play === false) controls.current.pause();
  }, []);

  const playback = room?.playback;
  useEffect(() => {
    if (playback) apply();
  }, [playback, apply]);

  // Someone who stalled or lagged catches up with the room.
  const inRoom = room !== undefined;
  useEffect(() => {
    if (!inRoom) return;
    const id = setInterval(apply, RESYNC_MS);
    return () => clearInterval(id);
  }, [inRoom, apply]);

  const local = useCallback(
    (event: LocalEvent) => {
      const current = latest.current;
      const state = controls.current.read();
      if (!current || !state || Date.now() < ignoreUntil.current) return;
      if (!current.canControl) {
        // Not allowed: undo what the viewer just did.
        if (commandFor(event, current.playback, state.currentTime)) current.onLocked();
        apply();
        return;
      }
      const command = commandFor(event, current.playback, state.currentTime);
      if (command) current.send(command.action, command.position);
      else apply();
    },
    [apply],
  );

  return {
    onPlay: () => local("play"),
    onPause: () => local("pause"),
    onSeeked: () => local("seek"),
    onLoadedMetadata: apply,
  };
}
