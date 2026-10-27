import type { ReactNode } from "react";

const ATTRIBUTE = "data-fullscreen-stage";

/**
 * The element the player puts in full screen. It lives in the watch layout, above the
 * per-episode page, so moving to the next episode swaps what's inside it without leaving
 * full screen.
 */
export function FullscreenStage({ children }: { children: ReactNode }) {
  return (
    <div {...{ [ATTRIBUTE]: "" }} className="bg-black">
      {children}
    </div>
  );
}

/** The stage around `el`, or `el` itself when it isn't inside one. */
export function stageOf(el: HTMLElement | null): HTMLElement | null {
  return el?.closest<HTMLElement>(`[${ATTRIBUTE}]`) ?? el;
}
