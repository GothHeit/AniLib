import type { ComponentProps } from "react";

import { Link } from "@/i18n/navigation";

type Variant = "primary" | "secondary" | "ghost";

const base =
  "inline-flex items-center justify-center gap-2 rounded-ui px-4 py-2 text-sm pointer-coarse:min-h-11 font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50";
const variants: Record<Variant, string> = {
  primary: "bg-accent text-on-accent hover:bg-accent/85",
  secondary: "border border-line bg-surface text-fg hover:border-accent",
  ghost: "text-muted hover:bg-surface hover:text-fg",
};

export function buttonClass(variant: Variant = "primary", className = "") {
  return `${base} ${variants[variant]} ${className}`.trim();
}

export function Button({
  variant = "primary",
  className,
  type = "button",
  ...props
}: ComponentProps<"button"> & { variant?: Variant }) {
  return <button type={type} className={buttonClass(variant, className)} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={buttonClass(variant, className)} {...props} />;
}
