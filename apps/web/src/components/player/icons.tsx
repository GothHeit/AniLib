const PATHS = {
  play: "M7 4l13 8-13 8z",
  pause: "M7 4h4v16H7zM13 4h4v16h-4z",
  rewind: "M11 6L4 12l7 6zM20 6l-7 6 7 6z",
  forward: "M13 6l7 6-7 6zM4 6l7 6-7 6z",
  volume: "M4 9h4l5-4v14l-5-4H4zM16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11",
  muted: "M4 9h4l5-4v14l-5-4H4zM16 9l5 6M21 9l-5 6",
  fullscreen: "M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5",
  exitFullscreen: "M9 4v5H4M20 9h-5V4M15 20v-5h5M4 15h5v5",
  next: "M5 5l10 7-10 7zM18 5v14",
  back: "M15 5l-7 7 7 7",
} as const;

export type PlayerIconName = keyof typeof PATHS;

export function PlayerIcon({ name }: { name: PlayerIconName }) {
  const filled = name === "play" || name === "pause" || name === "rewind" || name === "forward";
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
