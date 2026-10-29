import type { Metadata, Viewport } from "next";
import { Instrument_Serif, Manrope } from "next/font/google";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { ToastProvider } from "@/components/ui/Toast";
import { routing } from "@/i18n/routing";
import { APP_NAME } from "@/lib/brand";
import { SPLASH_IMAGES } from "@/lib/splash";

import "../globals.css";

const serif = Instrument_Serif({ subsets: ["latin"], weight: "400", variable: "--font-instrument-serif" });
const manrope = Manrope({ subsets: ["latin"], weight: ["400", "500", "700"], variable: "--font-manrope" });

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Lets the page draw under the notch and home indicator; the shell pads itself with the safe-area insets.
  viewportFit: "cover",
  // Android: the keyboard shrinks the layout viewport, as on iOS, so bottom-pinned fields stay visible.
  interactiveWidget: "resizes-content",
  themeColor: "#150d26",
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
    <html lang={locale === "pt" ? "pt-BR" : "en"} className={`${serif.variable} ${manrope.variable}`}>
      <body className="min-h-dvh">
        <NextIntlClientProvider>
          <ToastProvider>{children}</ToastProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
