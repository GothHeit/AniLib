import type { StreamChoice } from "@/lib/watch-target";

/** The bits of the player's translator the labels need, so they can be tested without it. */
export type StreamNames = {
  has: (key: string) => boolean;
  t: (key: string, values?: Record<string, string>) => string;
};

export function sameStream(a: StreamChoice, b: StreamChoice) {
  return a.source === b.source && a.lang === b.lang;
}

/** A known source says what each version really is (e.g. burned-in Portuguese subtitles);
 * any other one shows its name and sub or dub. */
export function streamLabel(names: StreamNames, { source, lang }: StreamChoice) {
  const known = `streams.${source}.${lang}`;
  if (names.has(known)) return names.t(known);
  return names.t("streamFallback", { source, lang: names.t(lang) });
}
