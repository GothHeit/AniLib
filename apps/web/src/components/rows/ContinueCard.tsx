"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { useRouter } from "@/i18n/navigation";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import { WideCard } from "@/components/ui/WideCard";

type Props = {
  animeId: number;
  href: string;
  title: string;
  image?: string | null;
  caption?: string;
  progress?: number;
};

/** A Continue watching card with a button that takes the title off the row. Watch history is kept. */
export function ContinueCard({ animeId, ...card }: Props) {
  const t = useTranslations("home");
  const tErr = useTranslations("errors");
  const router = useRouter();
  const toast = useToast();
  const [removed, setRemoved] = useState(false);

  async function remove() {
    setRemoved(true);
    try {
      const { response } = await api.DELETE("/me/progress/{anime_id}/continue", { params: { path: { anime_id: animeId } } });
      if (!response.ok) throw new Error("remove failed");
      router.refresh();
    } catch {
      setRemoved(false);
      toast(tErr("unknown"), "error");
    }
  }

  if (removed) return null;
  return (
    <div className="group/card relative">
      <WideCard {...card} />
      <button
        type="button"
        onClick={remove}
        aria-label={t("remove", { title: card.title })}
        className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/70 text-white opacity-0 transition-opacity hover:bg-black focus-visible:opacity-100 group-hover/card:opacity-100 max-md:opacity-100 pointer-coarse:opacity-100"
      >
        <span aria-hidden="true">✕</span>
      </button>
    </div>
  );
}
