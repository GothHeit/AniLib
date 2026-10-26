import { getTranslations, setRequestLocale } from "next-intl/server";

import { AuthCard } from "@/components/auth/AuthCard";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { Link } from "@/i18n/navigation";

export default async function RegisterPage({ params, searchParams }: PageProps<"/[locale]/register">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("register");
  const { invite } = await searchParams;

  return (
    <AuthCard
      title={t("title")}
      footer={
        <>
          {t("haveAccount")}{" "}
          <Link href="/login" className="font-bold text-accent hover:underline">
            {t("loginLink")}
          </Link>
        </>
      }
    >
      <RegisterForm initialCode={typeof invite === "string" ? invite : undefined} />
    </AuthCard>
  );
}
