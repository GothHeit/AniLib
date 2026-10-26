import type { Metadata } from "next";
import { DM_Sans, Sora } from "next/font/google";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { ToastProvider } from "@/components/ui/Toast";
import { routing } from "@/i18n/routing";
import { APP_NAME } from "@/lib/brand";

import "../globals.css";

const sora = Sora({ subsets: ["latin"], weight: ["500", "700"], variable: "--font-sora" });
const dmSans = DM_Sans({ subsets: ["latin"], weight: ["400", "500", "700"], variable: "--font-dm-sans" });

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return {
    title: APP_NAME,
    description: t("description", { app: APP_NAME }),
    icons: {
      icon: [{ url: "/icon.svg", type: "image/svg+xml" }, { url: "/favicon.ico", sizes: "any" }],
      apple: "/apple-touch-icon.png",
    },
  };
}

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return (
    <html lang={locale === "pt" ? "pt-BR" : "en"} className={`${sora.variable} ${dmSans.variable}`}>
      <body className="min-h-screen">
        <NextIntlClientProvider>
          <ToastProvider>{children}</ToastProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
