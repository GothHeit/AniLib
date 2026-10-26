"use client";

import { useLocale, useTranslations } from "next-intl";

import { Field } from "@/components/ui/Field";

import { AuthForm } from "./AuthForm";

export function RegisterForm({ initialCode }: { initialCode?: string }) {
  const t = useTranslations("register");
  const locale = useLocale();
  return (
    <AuthForm endpoint="register" submitLabel={t("submit")} extra={{ locale }}>
      <Field
        label={t("inviteCode")}
        name="invite_code"
        required
        autoComplete="off"
        defaultValue={initialCode}
        autoFocus={!initialCode}
      />
      <Field
        label={t("username")}
        name="username"
        required
        autoComplete="username"
        pattern="[A-Za-z0-9_]{3,32}"
        hint={t("usernameHint")}
      />
      <Field
        label={t("password")}
        name="password"
        type="password"
        required
        minLength={8}
        maxLength={128}
        autoComplete="new-password"
        hint={t("passwordHint")}
      />
    </AuthForm>
  );
}
