/** A genre's name in the current language. MAL only names them in English, so the translated
 * names live in the messages; a genre without one keeps the name the API gave. */
export function genreName(t: { has(key: string): boolean; (key: string): string }, genre: { name: string }) {
  return t.has(genre.name) ? t(genre.name) : genre.name;
}
