import type { IconName } from "./Icon";

export const NAV_ITEMS: { href: "/" | "/browse" | "/list"; key: "home" | "browse" | "list"; icon: IconName }[] = [
  { href: "/", key: "home", icon: "home" },
  { href: "/browse", key: "browse", icon: "browse" },
  { href: "/list", key: "list", icon: "list" },
];

/** True when `pathname` (locale already stripped) is inside the nav item's section. */
export function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
