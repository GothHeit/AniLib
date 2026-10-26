import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { APP_NAME } from "@/lib/brand";

import "../globals.css";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return { title: APP_NAME, description: t("description", { app: APP_NAME }) };
}

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return (
    <html lang={locale === "pt" ? "pt-BR" : "en"}>
      <body className="min-h-screen">
        <NextIntlClientProvider>
          <header className="flex items-center justify-between px-4 py-4 sm:px-8">
            <Link href="/" className="text-xl font-bold tracking-tight text-rose-500">
              {APP_NAME}
            </Link>
            <LocaleSwitcher />
          </header>
          <main className="px-4 pb-16 sm:px-8">{children}</main>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
