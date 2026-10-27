import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { JoinRoomForm } from "@/components/room/JoinRoomForm";
import { titled } from "@/lib/page-title";

export async function generateMetadata({ params }: PageProps<"/[locale]/room">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "room" });
  return titled(t("joinTitle"));
}

export default async function JoinRoomPage({ params }: PageProps<"/[locale]/room">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("room");

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 px-4 pb-8 pt-24 sm:px-8">
      <h1 className="text-3xl font-bold">{t("joinTitle")}</h1>
      <p className="text-muted">{t("joinIntro")}</p>
      <JoinRoomForm />
    </div>
  );
}
