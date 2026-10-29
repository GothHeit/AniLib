import { getTranslations } from "next-intl/server";

import { ButtonLink } from "@/components/ui/Button";

import { watchPlan } from "./watchPlan";

// The three parts of the title header that depend on the sources. They share one cached lookup
// (watchPlan), so rendering them separately costs a single round trip.

export function WatchBadgeSkeleton() {
  return <div aria-hidden="true" className="h-6 w-24 self-start animate-pulse rounded-ui bg-surface" />;
}

export function WatchPlaySkeleton() {
  return <div aria-hidden="true" className="h-11 w-40 animate-pulse rounded-full bg-surface" />;
}

export async function WatchBadge({ id }: { id: number }) {
  const [plan, t] = await Promise.all([watchPlan(id), getTranslations("titlePage")]);
  return (
    <p
      className={`inline-block self-start rounded-full border px-3 py-0.5 text-xs font-bold ${plan ? "border-accent text-accent" : "border-line-strong text-muted"}`}
    >
      {plan ? t("watchHere") : t("trackingOnly")}
    </p>
  );
}

export async function WatchPlay({ id }: { id: number }) {
  const [plan, t] = await Promise.all([watchPlan(id), getTranslations("titlePage")]);
  if (!plan) return null;
  return (
    <ButtonLink href={plan.href}>
      <span aria-hidden="true">▶</span>
      {plan.next.resume
        ? t("continue", { episode: plan.next.episode })
        : plan.next.rewatch
          ? t("rewatch")
          : t("play", { episode: plan.next.episode })}
    </ButtonLink>
  );
}

export async function WatchHint({ id }: { id: number }) {
  const [plan, t] = await Promise.all([watchPlan(id), getTranslations("titlePage")]);
  return plan ? null : <p className="mt-3 text-sm text-muted">{t("trackingOnlyHint")}</p>;
}
