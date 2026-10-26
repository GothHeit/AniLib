import { getTranslations, setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";

import { MalSection, type MalStatus } from "@/components/account/MalSection";
import { PreferencesForm } from "@/components/account/PreferencesForm";
import { ButtonLink } from "@/components/ui/Button";
import { serverApi, unwrap } from "@/lib/server-api";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-ui border border-line bg-surface p-6">
      <h2 className="mb-4 text-lg font-bold">{title}</h2>
      {children}
    </section>
  );
}

export default async function SettingsPage({ params, searchParams }: PageProps<"/[locale]/settings">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("account");
  const { mal } = await searchParams;

  const api = await serverApi();
  const [me, malStatus] = await Promise.all([unwrap(api.GET("/me"), locale), unwrap(api.GET("/me/mal"), locale)]);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 pb-8 pt-24 sm:px-8">
      <h1 className="text-3xl font-bold">{t("settings.title")}</h1>

      <Section title={t("settings.profile")}>
        <p className="text-sm text-muted">{t("settings.username")}</p>
        <p className="font-medium">
          {me.username}
          {me.is_admin && <span className="ml-3 rounded-ui bg-accent-deep px-2 py-0.5 text-xs">{t("settings.admin")}</span>}
        </p>
        {me.is_admin && (
          <ButtonLink href="/invites" variant="secondary" className="mt-4">
            {t("invites.manage")}
          </ButtonLink>
        )}
      </Section>

      <Section title={t("settings.preferences")}>
        <PreferencesForm showNsfw={me.show_nsfw} />
      </Section>

      <Section title={t("mal.title")}>
        <MalSection status={malStatus as MalStatus} returned={typeof mal === "string" ? mal : undefined} />
      </Section>
    </div>
  );
}
