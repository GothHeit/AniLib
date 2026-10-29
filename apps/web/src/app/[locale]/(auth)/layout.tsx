import type { ReactNode } from "react";

import { LocaleSwitcher } from "@/components/shell/LocaleSwitcher";
import { Link } from "@/i18n/navigation";
import { Logo } from "@/components/shell/Logo";
import { APP_NAME } from "@/lib/brand";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-8 px-4 py-12">
      <div className="absolute right-4 top-4 sm:right-8 sm:top-6">
        <LocaleSwitcher />
      </div>
      <Link href="/" aria-label={APP_NAME}>
        <Logo size="lg" />
      </Link>
      {children}
    </div>
  );
}
