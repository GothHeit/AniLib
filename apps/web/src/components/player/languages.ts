export type LabeledTrack = { lang: string; label: string };

/** A language's name in the viewer's language, or null when the code isn't a real language. */
export function languageName(code: string | undefined, locale: string): string | null {
  if (!code || code === "und") return null;
  try {
    const name = new Intl.DisplayNames([locale], { type: "language" }).of(code);
    if (!name || name === code) return null;
    return name.charAt(0).toLocaleUpperCase(locale) + name.slice(1);
  } catch {
    return null;
  }
}

/**
 * Display names for tracks: the localized language name, with the source's own label added in
 * brackets only when two tracks would otherwise read the same.
 */
export function trackNames(tracks: LabeledTrack[], locale: string): string[] {
  const base = tracks.map((t) => languageName(t.lang, locale) ?? t.label);
  return base.map((name, i) =>
    base.filter((other) => other === name).length > 1 && tracks[i].label !== name
      ? `${name} (${tracks[i].label})`
      : name,
  );
}
