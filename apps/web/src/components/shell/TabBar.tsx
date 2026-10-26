"use client";

import { useTranslations } from "next-intl";

import { Link, usePathname } from "@/i18n/navigation";

import { Icon } from "./Icon";
import { isActive, NAV_ITEMS } from "./nav-items";
import { UserMenu } from "./UserMenu";

const item = "flex flex-1 flex-col items-center gap-1 py-2 text-xs";

/** Phone navigation: Home, Browse, My list, Search, You. */
export function TabBar({ username }: { username: string }) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const tabs = [...NAV_ITEMS, { href: "/search" as const, key: "search" as const, icon: "search" as const }];

  return (
    <nav
      aria-label={t("main")}
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-bg md:hidden"
    >
      {tabs.map(({ href, key, icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`${item} ${active ? "text-accent" : "text-muted"}`}
          >
            <Icon name={icon} />
            {t(key)}
          </Link>
        );
      })}
      <div className="flex flex-1 justify-center">
        <UserMenu
          username={username}
          variant="tab"
          triggerClassName={`${item} h-full w-full text-muted`}
          trigger={
            <>
              <Icon name="you" />
              {t("you")}
            </>
          }
        />
      </div>
    </nav>
  );
}
