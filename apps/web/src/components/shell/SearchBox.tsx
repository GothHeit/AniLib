"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { useRouter } from "@/i18n/navigation";

export function SearchBox() {
  const t = useTranslations("nav");
  const router = useRouter();
  const [query, setQuery] = useState("");

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        const q = query.trim();
        if (q) router.push({ pathname: "/search", query: { q } });
      }}
    >
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label={t("search")}
        placeholder={t("searchPlaceholder")}
        className="w-40 rounded-ui border border-line bg-surface/80 px-3 py-1.5 text-sm placeholder:text-muted focus:w-64 focus:border-accent lg:w-56"
      />
    </form>
  );
}
