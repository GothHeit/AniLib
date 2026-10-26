"use client";

import { useTranslations } from "next-intl";

import { Field } from "@/components/ui/Field";

import { AuthForm } from "./AuthForm";

export function LoginForm() {
  const t = useTranslations("login");
  return (
    <AuthForm endpoint="login" submitLabel={t("submit")}>
      <Field label={t("username")} name="username" required autoComplete="username" />
      <Field label={t("password")} name="password" type="password" required autoComplete="current-password" />
    </AuthForm>
  );
}
