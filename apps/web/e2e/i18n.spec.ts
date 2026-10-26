import { expect, test } from "@playwright/test";

test.describe("with a Portuguese browser", () => {
  test.use({ locale: "pt-BR" });

  test("picks Portuguese", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/pt$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Bem-vindo");
    await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
  });
});

test("picks English for an English browser", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/en$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Welcome");
});

test("falls back to Portuguese for other languages", async ({ browser }) => {
  const page = await browser.newPage({ locale: "ja-JP" });
  await page.goto("/");
  await expect(page).toHaveURL(/\/pt$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Bem-vindo");
  await page.close();
});

test("switches to English and keeps the page", async ({ page }) => {
  await page.goto("/pt/login");
  await page.getByLabel("Idioma").selectOption("en");
  await expect(page).toHaveURL(/\/en\/login$/);
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
});

test("shows a translated error when the API is unreachable", async ({ page }) => {
  await page.route("**/auth/login", (route) => route.abort());
  await page.goto("/en/login");
  await page.getByLabel("Username").fill("kafka");
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.locator("form").getByRole("alert")).toHaveText("Couldn't reach the server.");
});

test("shows the API's error code translated", async ({ page }) => {
  await page.route("**/auth/login", (route) =>
    route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ error: { code: "invalid_credentials", message: "x" } }),
    }),
  );
  await page.goto("/pt/login");
  await page.getByLabel("Usuário").fill("kafka");
  await page.getByLabel("Senha").fill("wrong-password");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.locator("form").getByRole("alert")).toHaveText("Usuário ou senha incorretos.");
});
