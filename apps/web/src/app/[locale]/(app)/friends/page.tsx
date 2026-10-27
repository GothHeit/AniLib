import { getTranslations, setRequestLocale } from "next-intl/server";

import { FriendsPanel } from "@/components/friends/FriendsPanel";
import { serverApi, unwrap } from "@/lib/server-api";

export default async function FriendsPage({ params }: PageProps<"/[locale]/friends">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("friends");
  const api = await serverApi();
  const [friends, requests] = await Promise.all([
    unwrap(api.GET("/friends"), locale),
    unwrap(api.GET("/friends/requests"), locale),
  ]);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 pb-8 pt-24 sm:px-8">
      <h1 className="text-3xl font-bold">{t("title")}</h1>
      <p className="text-muted">{t("intro")}</p>
      <FriendsPanel friends={friends} requests={requests} />
    </div>
  );
}
