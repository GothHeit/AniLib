import type { components } from "@app/api-client";
import { cache } from "react";

import { serverApi } from "@/lib/server-api";

export type TitleArt = components["schemas"]["TitleArtOut"];

const NONE: TitleArt = { backdrop: null, episodes: {} };

/** Episode stills, episode titles and a wide picture for a title. Empty when the lookup fails. */
export const titleArt = cache(async (id: number, locale: string): Promise<TitleArt> => {
  const api = await serverApi();
  const { data } = await api
    .GET("/anime/{anime_id}/art", {
      params: { path: { anime_id: id }, query: { lang: locale === "pt" ? "pt" : "en" } },
    })
    .catch(() => ({ data: undefined }));
  return data ?? NONE;
});
