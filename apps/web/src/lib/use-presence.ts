"use client";

import { useEffect, useState } from "react";

function reducedMotion() {
  return typeof window.matchMedia !== "function" || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Keeps a panel mounted for its exit transition after `open` turns false, so it leaves the way it came.
 * With reduced motion (or no way to tell) it unmounts at once. */
export function usePresence(open: boolean, ms = 160) {
  const [wasOpen, setWasOpen] = useState(open);
  const [lingering, setLingering] = useState(false);

  if (open !== wasOpen) {
    setWasOpen(open);
    setLingering(!open && !reducedMotion());
  }

  useEffect(() => {
    if (!lingering) return;
    const timer = setTimeout(() => setLingering(false), ms);
    return () => clearTimeout(timer);
  }, [lingering, ms]);

  const closing = !open && lingering;
  return { mounted: open || closing, closing };
}
