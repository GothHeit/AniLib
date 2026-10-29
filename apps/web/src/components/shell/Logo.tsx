import Image from "next/image";

import { APP_NAME } from "@/lib/brand";

/** Crescent mark followed by the product name from the brand config. */
export function Logo({ size = "md" }: { size?: "md" | "lg" }) {
  const px = size === "lg" ? 40 : 28;
  return (
    <span className="inline-flex items-center gap-2">
      <Image src="/logo-mark.svg" alt="" width={px} height={px} unoptimized priority />
      <span
        className={`font-display text-fg ${size === "lg" ? "text-4xl" : "text-[1.75rem] leading-none"}`}
      >
        {APP_NAME}
      </span>
    </span>
  );
}
