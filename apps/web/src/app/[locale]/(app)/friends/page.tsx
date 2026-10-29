import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { FriendsPanel } from "@/components/friends/FriendsPanel";
import { serverApi, unwrap } from "@/lib/server-api";
import { titled } from "@/lib/page-title";

export async function generateMetadata({ params }: PageProps<"/[locale]/friends">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "friends" });
  return titled(t("title"));
}

export default async function FriendsPage({ params }: PageProps<"/[locale]/friends">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("friends");
  const api = await serverApi();
  const [me, friends, requests] = await Promise.all([
    unwrap(api.GET("/me"), locale),
    unwrap(api.GET("/friends"), locale),
    unwrap(api.GET("/friends/requests"), locale),
  ]);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 pb-8 pt-24 sm:px-8">
      <h1 className="text-4xl sm:text-5xl">{t("title")}</h1>
      <p className="text-muted">{t("intro")}</p>
      <p className="rounded-ui border border-line bg-surface px-4 py-3 text-sm text-muted">
        {t.rich("yourName", { name: me.username, b: (chunks) => <strong className="text-fg">{chunks}</strong> })}
      </p>
      <FriendsPanel friends={friends} requests={requests} />
    </div>
  );
}
