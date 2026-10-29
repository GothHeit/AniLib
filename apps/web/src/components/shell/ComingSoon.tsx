import { getTranslations } from "next-intl/server";

/** Stand-in for pages that later tasks build. */
export async function ComingSoon({ title }: { title: string }) {
  const t = await getTranslations("placeholder");
  return (
    <section className="px-4 pb-24 pt-28 sm:px-8">
      <h1 className="text-4xl sm:text-5xl">{title}</h1>
      <p className="mt-2 text-muted">{t("comingSoon")}</p>
    </section>
  );
}
