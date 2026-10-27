"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { Link, usePathname } from "@/i18n/navigation";
import { APP_NAME } from "@/lib/brand";

import { LocaleSwitcher } from "./LocaleSwitcher";
import { Logo } from "./Logo";
import { NotificationBell } from "./NotificationBell";
import { isActive, NAV_ITEMS } from "./nav-items";
import { SearchBox } from "./SearchBox";
import type { AvatarInfo } from "@/lib/avatar";

import { UserMenu } from "./UserMenu";

/** Transparent over the hero, solid once the page scrolls. */
export function TopNav({ userId, username, avatar, isAdmin, pending = 0 }: { userId: string; username: string; avatar: AvatarInfo; isAdmin: boolean; pending?: number }) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      data-scrolled={scrolled}
      className={`fixed inset-x-0 top-0 z-40 pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] transition-colors ${scrolled ? "bg-bg shadow-lg shadow-black/40" : "bg-gradient-to-b from-bg/80 to-transparent"}`}
    >
      <nav aria-label={t("main")} className="flex items-center gap-6 px-4 py-3 sm:px-8">
        <Link href="/" aria-label={APP_NAME}>
          <Logo />
        </Link>
        <ul className="hidden items-center gap-1 md:flex">
          {NAV_ITEMS.map(({ href, key }) => {
            const active = isActive(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`rounded-ui px-3 py-1.5 text-sm font-medium hover:text-fg ${active ? "text-accent" : "text-muted"}`}
                >
                  {t(key)}
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="ml-auto flex items-center gap-3">
          <div className="hidden md:block">
            <SearchBox />
          </div>
          <NotificationBell />
          <div className="hidden md:block">
            <LocaleSwitcher />
          </div>
          <div className="hidden md:block">
            <UserMenu userId={userId} username={username} avatar={avatar} isAdmin={isAdmin} pending={pending} />
          </div>
        </div>
      </nav>
    </header>
  );
}
