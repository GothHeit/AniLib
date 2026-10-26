"use client";

import { useSyncExternalStore } from "react";

// Per-browser preference: autoplay the next episode. On unless the viewer turned it off.
const KEY = "player.autoNext";
const listeners = new Set<() => void>();
// Used when storage is blocked, so the choice still lasts until the page reloads.
let fallback = true;

function read(): boolean {
  try {
    return localStorage.getItem(KEY) !== "off";
  } catch {
    return fallback;
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setAutoNext(on: boolean) {
  fallback = on;
  try {
    localStorage.setItem(KEY, on ? "on" : "off");
  } catch {
    // Storage blocked: the fallback above keeps the choice.
  }
  listeners.forEach((l) => l());
}

export function useAutoNext() {
  return useSyncExternalStore(subscribe, read, () => true);
}
