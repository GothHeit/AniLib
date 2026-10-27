/** iPhone portrait screens: CSS width, CSS height, pixel ratio. Each has a PNG in public/splash. */
const SCREENS: [number, number, number][] = [
  [375, 667, 2],
  [414, 736, 3],
  [375, 812, 3],
  [414, 896, 2],
  [414, 896, 3],
  [360, 780, 3],
  [390, 844, 3],
  [428, 926, 3],
  [393, 852, 3],
  [430, 932, 3],
  [402, 874, 3],
  [440, 956, 3],
];

/** The launch images iOS shows while the Home Screen app starts, one per screen size. */
export const SPLASH_IMAGES = SCREENS.map(([w, h, r]) => ({
  url: `/splash/${w * r}x${h * r}.png`,
  media: `(device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${r}) and (orientation: portrait)`,
}));
