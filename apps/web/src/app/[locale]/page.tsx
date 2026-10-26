import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { use } from "react";

import { Link } from "@/i18n/navigation";
import { APP_NAME } from "@/lib/brand";

export default function Home({ params }: PageProps<"/[locale]">) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations("home");

  return (
    <section className="mx-auto max-w-2xl py-24 text-center">
      <h1 className="text-4xl font-bold sm:text-5xl">{t("title", { app: APP_NAME })}</h1>
      <p className="mt-4 text-lg text-neutral-400">{t("subtitle")}</p>
      <Link
        href="/login"
        className="mt-8 inline-block rounded-md bg-rose-600 px-6 py-3 font-semibold hover:bg-rose-500"
      >
        {t("cta")}
      </Link>
    </section>
  );
}
