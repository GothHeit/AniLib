import { setRequestLocale } from "next-intl/server";

import { TabBar } from "@/components/shell/TabBar";
import { TopNav } from "@/components/shell/TopNav";
import { serverApi, unwrap } from "@/lib/server-api";

export default async function AppLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const api = await serverApi();
  const me = await unwrap(api.GET("/me"), locale);

  return (
    <>
      <TopNav username={me.username} />
      <main className="pb-24 md:pb-16">{children}</main>
      <TabBar username={me.username} />
    </>
  );
}
