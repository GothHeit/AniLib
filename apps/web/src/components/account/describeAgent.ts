const BROWSERS: [RegExp, string][] = [
  [/Edg(e|A|iOS)?\//, "Edge"],
  [/OPR\/|Opera/, "Opera"],
  [/Firefox\/|FxiOS\//, "Firefox"],
  [/Chrome\/|CriOS\//, "Chrome"],
  [/Safari\//, "Safari"],
];

const SYSTEMS: [RegExp, string][] = [
  [/iPhone|iPad|iPod/, "iOS"],
  [/Android/, "Android"],
  [/Windows/, "Windows"],
  [/Mac OS X|Macintosh/, "macOS"],
  [/CrOS/, "ChromeOS"],
  [/Linux|X11/, "Linux"],
];

/** A short "Browser on System" label from a User-Agent string, or null when it says nothing. */
export function describeAgent(agent: string | null | undefined): { browser: string | null; system: string | null } {
  if (!agent) return { browser: null, system: null };
  return {
    browser: BROWSERS.find(([pattern]) => pattern.test(agent))?.[1] ?? null,
    system: SYSTEMS.find(([pattern]) => pattern.test(agent))?.[1] ?? null,
  };
}
