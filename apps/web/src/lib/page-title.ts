import type { Metadata } from "next";

import { APP_NAME } from "./brand";

/** Tab and history title for a page: "Browse · MoonRoom". */
export function titled(label: string): Metadata {
  return { title: `${label} · ${APP_NAME}` };
}
