import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { AuthCard } from "@/components/auth/AuthCard";
import { LoginForm } from "@/components/auth/LoginForm";
import { Link } from "@/i18n/navigation";
import { titled } from "@/lib/page-title";

export async function generateMetadata({ params }: PageProps<"/[locale]/login">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "login" });
  return titled(t("title"));
}

export default async function LoginPage({ params }: PageProps<"/[locale]/login">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("login");

  return (
    <AuthCard
      title={t("title")}
      footer={
        <>
          {t("noAccount")}{" "}
          <Link href="/register" className="font-bold text-accent hover:underline">
            {t("registerLink")}
          </Link>
        </>
      }
    >
      <LoginForm />
    </AuthCard>
  );
}
