import { getTranslations, setRequestLocale } from "next-intl/server";

import { ComingSoon } from "@/components/shell/ComingSoon";

export default async function Page({ params }: PageProps<"/[locale]/browse">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("nav");
  return <ComingSoon title={t("browse")} />;
}
