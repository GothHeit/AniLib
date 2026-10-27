import { getTranslations, setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";

import { AvatarForm } from "@/components/account/AvatarForm";
import { NotificationsForm } from "@/components/account/NotificationsForm";
import { MalSection } from "@/components/account/MalSection";
import { PasswordForm } from "@/components/account/PasswordForm";
import { PreferencesForm } from "@/components/account/PreferencesForm";
import { SessionsPanel } from "@/components/account/SessionsPanel";
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
  const tNotifications = await getTranslations("notifications.settings");
  const { mal } = await searchParams;

  const api = await serverApi();
  const [me, malStatus, sessions, notifications] = await Promise.all([
    unwrap(api.GET("/me"), locale),
    unwrap(api.GET("/me/mal"), locale),
    unwrap(api.GET("/me/sessions"), locale),
    unwrap(api.GET("/notifications/settings"), locale),
  ]);

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

      <Section title={t("avatar.title")}>
        <AvatarForm userId={me.id} username={me.username} avatar={me.avatar} />
      </Section>

      <Section title={t("settings.preferences")}>
        <PreferencesForm showNsfw={me.show_nsfw} shareActivity={me.share_activity} />
      </Section>

      <Section title={tNotifications("title")}>
        <NotificationsForm muted={notifications.muted} />
      </Section>

      <Section title={t("mal.title")}>
        <MalSection status={malStatus} returned={typeof mal === "string" ? mal : undefined} />
      </Section>

      <Section title={t("password.title")}>
        <PasswordForm />
      </Section>

      <Section title={t("sessions.title")}>
        <SessionsPanel sessions={sessions} />
      </Section>
    </div>
  );
}
