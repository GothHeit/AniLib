"use client";

import type { components } from "@app/api-client";
import { errorCode } from "@app/api-client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { api } from "@/lib/api";

import type { LocalEvent, Playback } from "./sync";

export type RoomState = components["schemas"]["RoomOut"];
export type ChatMessage = {
  id: string;
  user_id: string;
  username: string;
  text: string;
  reaction: boolean;
};
/** `closed` carries why: the room ended, is full, or the session is gone. */
export type Status = "connecting" | "open" | { closed: "room_not_found" | "room_full" | "not_authenticated" | "network" };

const CHAT_LIMIT = 100;

function stamp(playback: RoomState["playback"]): Playback {
  return { playing: playback.playing, position: playback.position, receivedAt: Date.now() };
}

/** Joins a room over server-sent events and keeps its state, chat and playback up to date. */
export function useRoom(initial: RoomState) {
  const code = initial.code;
  const [room, setRoom] = useState(initial);
  const [playback, setPlayback] = useState(() => stamp(initial.playback));
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<Status>("connecting");
  const [lastReaction, setLastReaction] = useState<ChatMessage | null>(null);
  const reactionTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    const source = new EventSource(`/api/proxy/watch/rooms/${encodeURIComponent(code)}/events`);
    const on = <T,>(name: string, handler: (data: T) => void) =>
      source.addEventListener(name, (event) => handler(JSON.parse((event as MessageEvent<string>).data) as T));

    source.onopen = () => setStatus("open");
    on<RoomState>("state", (state) => {
      setRoom(state);
      setPlayback(stamp(state.playback));
    });
    on<RoomState["playback"]>("playback", (data) => setPlayback(stamp(data)));
    on<ChatMessage>("chat", (message) => {
      if (message.reaction) {
        setLastReaction(message);
        clearTimeout(reactionTimer.current);
        reactionTimer.current = setTimeout(() => setLastReaction(null), 2500);
        return;
      }
      // A reconnect replays the history, so a message may arrive twice.
      setMessages((list) => (list.some((m) => m.id === message.id) ? list : [...list, message].slice(-CHAT_LIMIT)));
    });
    source.onerror = () => {
      // The browser retries a dropped connection on its own. It gives up (CLOSED) when the
      // server refused it, so ask why.
      if (source.readyState !== EventSource.CLOSED) {
        setStatus("connecting");
        return;
      }
      void api
        .GET("/watch/rooms/{code}", { params: { path: { code } } })
        .then(({ error }) => {
          const reason = errorCode(error);
          setStatus({
            closed: reason === "room_not_found" || reason === "room_full" || reason === "not_authenticated" ? reason : "network",
          });
        })
        .catch(() => setStatus({ closed: "network" }));
    };
    return () => {
      source.close();
      clearTimeout(reactionTimer.current);
    };
  }, [code]);

  const path = useMemo(() => ({ params: { path: { code } } }), [code]);

  const send = useCallback(
    (action: LocalEvent, position: number) =>
      api.POST("/watch/rooms/{code}/control", { ...path, body: { action, position } }).catch(() => undefined),
    [path],
  );
  const setBuffering = useCallback(
    (buffering: boolean) =>
      api.POST("/watch/rooms/{code}/buffering", { ...path, body: { buffering } }).catch(() => undefined),
    [path],
  );
  const say = useCallback(
    (text: string) => api.POST("/watch/rooms/{code}/chat", { ...path, body: { text } }).catch(() => undefined),
    [path],
  );
  const react = useCallback(
    (emoji: string) => api.POST("/watch/rooms/{code}/reaction", { ...path, body: { emoji } }).catch(() => undefined),
    [path],
  );
  const voteEpisode = useCallback(
    (episode: number) => api.POST("/watch/rooms/{code}/episode", { ...path, body: { episode } }).catch(() => undefined),
    [path],
  );
  const withdrawVote = useCallback(
    () => api.DELETE("/watch/rooms/{code}/episode", path).catch(() => undefined),
    [path],
  );
  const setLocked = useCallback(
    (locked: boolean) => api.PUT("/watch/rooms/{code}/lock", { ...path, body: { locked } }).catch(() => undefined),
    [path],
  );

  return { room, playback, messages, status, lastReaction, send, setBuffering, say, react, voteEpisode, withdrawVote, setLocked };
}
