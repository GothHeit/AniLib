import { getTranslations, setRequestLocale } from "next-intl/server";

import { TabBar } from "@/components/shell/TabBar";
import { TopNav } from "@/components/shell/TopNav";
import { serverApi, unwrap } from "@/lib/server-api";

export default async function AppLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("nav");
  const api = await serverApi();
  const me = await unwrap(api.GET("/me"), locale);

  return (
    <>
      <a
        href="#main"
        className="sr-only z-50 rounded-ui bg-accent px-4 py-2 font-medium text-on-accent focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        {t("skip")}
      </a>
      <TopNav userId={me.id} username={me.username} avatar={me.avatar} isAdmin={me.is_admin} />
      <main id="main" tabIndex={-1} className="pb-24 md:pb-16">{children}</main>
      <TabBar userId={me.id} username={me.username} avatar={me.avatar} isAdmin={me.is_admin} />
    </>
  );
}
