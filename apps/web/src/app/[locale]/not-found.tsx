import { useTranslations } from "next-intl";

import { ButtonLink } from "@/components/ui/Button";

export default function NotFound() {
  const t = useTranslations();
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-3xl font-bold">{t("states.notFoundTitle")}</h1>
      <p className="text-muted">{t("states.notFoundBody")}</p>
      <ButtonLink href="/">{t("actions.goHome")}</ButtonLink>
    </div>
  );
}
