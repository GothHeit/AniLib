import type { ReactNode } from "react";

import { LocaleSwitcher } from "@/components/shell/LocaleSwitcher";
import { Link } from "@/i18n/navigation";
import { APP_NAME } from "@/lib/brand";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-hero px-4 py-12">
      <div className="absolute right-4 top-4 sm:right-8 sm:top-6">
        <LocaleSwitcher />
      </div>
      <Link href="/" className="font-display text-3xl font-bold tracking-tight text-accent">
        {APP_NAME}
      </Link>
      {children}
    </div>
  );
}
