"use client";

import { useTranslations } from "next-intl";

/** Turns an API error code into text: list-specific first, then the shared ones. */
export function useErrorMessage() {
  const tList = useTranslations("list.errors");
  const tErr = useTranslations("errors");
  return (code: string) => (tList.has(code) ? tList(code) : tErr.has(code) ? tErr(code) : tErr("unknown"));
}
