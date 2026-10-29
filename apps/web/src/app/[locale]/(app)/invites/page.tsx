import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { InvitesPanel } from "@/components/account/InvitesPanel";
import { serverApi, unwrap } from "@/lib/server-api";
import { titled } from "@/lib/page-title";

export async function generateMetadata({ params }: PageProps<"/[locale]/invites">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "account.invites" });
  return titled(t("title"));
}

export default async function InvitesPage({ params }: PageProps<"/[locale]/invites">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("account.invites");

  const api = await serverApi();
  const me = await unwrap(api.GET("/me"), locale);
  if (!me.is_admin) notFound();
  const invites = await unwrap(api.GET("/invites"), locale);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 pb-8 pt-24 sm:px-8">
      <h1 className="text-4xl sm:text-5xl">{t("title")}</h1>
      <p className="text-muted">{t("intro")}</p>
      <InvitesPanel invites={invites} />
    </div>
  );
}
