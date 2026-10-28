"use client";

import { useEffect, useRef, type RefObject } from "react";

type Props = {
  video: RefObject<HTMLVideoElement | null>;
  /** The styled (ASS) track to draw, through the API proxy. */
  url: string;
  /** Font name (lower case) -> link, through the API proxy. Loaded only when the script uses one. */
  fonts: Record<string, string>;
  /** Called when the renderer can't run here; the player then shows the plain WebVTT copy. */
  onFail: () => void;
};

/**
 * Draws ASS subtitles as their authors styled them (positions, signs, karaoke, embedded fonts)
 * with JASSUB, libass compiled to WebAssembly. The canvas sits over the video. Safari's
 * native full screen can't show it; the WebVTT track takes over there (see SubtitleOverlay).
 */
export function AssSubtitles({ video, url, fonts, onFail }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const fail = useRef(onFail);
  useEffect(() => {
    fail.current = onFail;
  }, [onFail]);

  useEffect(() => {
    const v = video.current;
    const box = host.current;
    if (!v || !box) return;
    // A canvas can hand its drawing over to a worker only once, so each track gets a new one.
    const canvas = document.createElement("canvas");
    canvas.style.position = "absolute";
    box.appendChild(canvas);
    let renderer: import("jassub").default | undefined;
    let cancelled = false;
    void (async () => {
      const [{ default: JASSUB }, script] = await Promise.all([
        import("jassub"),
        fetch(url).then((r) => {
          if (!r.ok) throw new Error(`subtitles answered ${r.status}`);
          return r.text();
        }),
      ]);
      if (cancelled) return;
      // The worker resolves links against its own script, so they must be absolute.
      const availableFonts = Object.fromEntries(
        Object.entries(fonts).map(([name, link]) => [name, new URL(link, window.location.href).href]),
      );
      renderer = new JASSUB({ video: v, canvas, subContent: script, availableFonts });
      await renderer.ready;
      // It draws on each new video frame; a paused video has none coming, so draw once now.
      if (!cancelled && v.paused && v.videoWidth > 0) {
        const frame = { mediaTime: v.currentTime, width: v.videoWidth, height: v.videoHeight };
        await renderer.manualRender({ ...frame, expectedDisplayTime: performance.now() });
      }
    })().catch(() => {
      if (!cancelled) fail.current();
    });
    return () => {
      cancelled = true;
      void renderer?.destroy().catch(() => undefined);
      canvas.remove();
    };
  }, [video, url, fonts]);

  return <div ref={host} aria-hidden="true" data-testid="ass-subtitles" className="pointer-events-none absolute inset-0" />;
}
