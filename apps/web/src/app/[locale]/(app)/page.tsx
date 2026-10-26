import { getTranslations, setRequestLocale } from "next-intl/server";

import { Hero } from "@/components/ui/Hero";
import { PosterCard } from "@/components/ui/PosterCard";
import { Row } from "@/components/ui/Row";
import { serverApi, unwrap } from "@/lib/server-api";

// Placeholder home: the real rows arrive with the browse pages.
export default async function Home({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("placeholder");
  const me = await unwrap((await serverApi()).GET("/me"), locale);

  return (
    <>
      <Hero title={t("greeting", { name: me.username })} synopsis={t("tagline")} />
      <div className="py-6">
        <Row title={t("rowTitle")}>
          {Array.from({ length: 8 }, (_, i) => (
            <PosterCard key={i} href="/browse" title={`${t("rowTitle")} ${i + 1}`} seed={i} />
          ))}
        </Row>
      </div>
    </>
  );
}
