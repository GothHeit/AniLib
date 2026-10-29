import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { ButtonLink } from "@/components/ui/Button";
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
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 pb-8 pt-24 sm:px-8">
      <h1 className="text-4xl sm:text-5xl">{t("joinTitle")}</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        <section className="flex flex-col gap-3 rounded-ui border border-line bg-surface p-5">
          <h2 className="text-2xl">{t("haveCodeTitle")}</h2>
          <p className="text-sm text-muted">{t("haveCodeBody")}</p>
          <JoinRoomForm />
        </section>
        <section className="flex flex-col items-start gap-3 rounded-ui border border-line bg-surface p-5">
          <h2 className="text-2xl">{t("createTitle")}</h2>
          <p className="text-sm text-muted">{t("createBody")}</p>
          <ButtonLink href="/browse" variant="secondary" className="mt-auto">
            {t("createCta")}
          </ButtonLink>
        </section>
      </div>
    </div>
  );
}
