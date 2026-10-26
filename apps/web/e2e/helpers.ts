import { expect, type Page } from "@playwright/test";

export async function signIn(page: Page, locale: "en" | "pt" = "en") {
  const en = locale === "en";
  await page.goto(`/${locale}/login`);
  await page.getByLabel(en ? "Username" : "Usuário").fill("kafka");
  await page.getByLabel(en ? "Password" : "Senha").fill("password123");
  await page.getByRole("button", { name: en ? "Sign in" : "Entrar" }).click();
  await expect(page).toHaveURL(new RegExp(`/${locale}$`));
}
