import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { use } from "react";

import { LoginForm } from "@/components/LoginForm";

export default function LoginPage({ params }: PageProps<"/[locale]/login">) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations("login");

  return (
    <section className="mx-auto max-w-sm py-16">
      <h1 className="mb-6 text-2xl font-bold">{t("title")}</h1>
      <LoginForm />
    </section>
  );
}
