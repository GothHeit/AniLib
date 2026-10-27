/** Drops the trailing source credit catalogs append, like "[Written by MAL Rewrite]" or "(Source: Crunchyroll)". */
export function cleanSynopsis(text: string | null | undefined): string {
  return (text ?? "").replace(/\s*[[(](?:written by|source:)[^\])]*[\])]\s*$/i, "").trim();
}
