import type { Metadata, Viewport } from "next";
import { DM_Sans, Sora } from "next/font/google";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { ToastProvider } from "@/components/ui/Toast";
import { routing } from "@/i18n/routing";
import { APP_NAME } from "@/lib/brand";
import { SPLASH_IMAGES } from "@/lib/splash";

import "../globals.css";

const sora = Sora({ subsets: ["latin"], weight: ["500", "700"], variable: "--font-sora" });
const dmSans = DM_Sans({ subsets: ["latin"], weight: ["400", "500", "700"], variable: "--font-dm-sans" });

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Lets the page draw under the notch and home indicator; the shell pads itself with the safe-area insets.
  viewportFit: "cover",
  themeColor: "#0b0a12",
  colorScheme: "dark",
};

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return {
    title: APP_NAME,
    description: t("description", { app: APP_NAME }),
    appleWebApp: { capable: true, title: APP_NAME, statusBarStyle: "black", startupImage: SPLASH_IMAGES },
    formatDetection: { telephone: false },
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
      <body className="min-h-dvh">
        <NextIntlClientProvider>
          <ToastProvider>{children}</ToastProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
