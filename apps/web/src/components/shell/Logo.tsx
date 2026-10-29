import Image from "next/image";

import { APP_NAME } from "@/lib/brand";

/** Outlined wordmark with the crescent as its full stop (the lockup is 1039x250). */
export function Logo({ size = "md" }: { size?: "md" | "lg" }) {
  const height = size === "lg" ? 56 : 32;
  return (
    <Image
      src="/logo-lockup.svg"
      alt={APP_NAME}
      width={Math.round((height * 1039) / 250)}
      height={height}
      unoptimized
      priority
    />
  );
}
