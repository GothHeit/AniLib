import { expect, test } from "@playwright/test";

import { signIn } from "./helpers";

test("sends signed-out visitors to login and back to the page they wanted", async ({ page }) => {
  await page.goto("/en/browse");
  await expect(page).toHaveURL(/\/en\/login\?next=%2Fbrowse$/);
  await page.getByLabel("Username").fill("kafka");
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/en\/browse$/);
});

test("signs in, keeps tokens out of the page, and signs out", async ({ page, context }) => {
  await signIn(page);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("kafka");

  const cookies = await context.cookies();
  expect(cookies.filter((c) => c.name.startsWith("mr_")).every((c) => c.httpOnly)).toBe(true);
  expect(await page.evaluate(() => document.cookie)).toBe("");
  expect(await page.evaluate(() => JSON.stringify(localStorage))).toBe("{}");

  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/en\/login$/);
  await page.goto("/en");
  await expect(page).toHaveURL(/\/en\/login/);
});

test("signed-in users skip the login page", async ({ page }) => {
  await signIn(page);
  await page.goto("/en/login");
  await expect(page).toHaveURL(/\/en$/);
});

test("renews an expired access cookie, once even for concurrent pages", async ({ page, context, request }) => {
  await signIn(page);
  const before = (await (await request.get("http://localhost:4010/__stats")).json()).refreshCalls;

  const cookies = await context.cookies();
  await context.clearCookies({ name: "mr_access" });
  expect(cookies.some((c) => c.name === "mr_access")).toBe(true);

  const other = await context.newPage();
  await Promise.all([page.goto("/en/browse"), other.goto("/en/list")]);
  await expect(page.getByRole("heading", { name: "Browse" })).toBeVisible();
  await expect(other.getByRole("heading", { name: "My list" })).toBeVisible();

  const after = (await (await request.get("http://localhost:4010/__stats")).json()).refreshCalls;
  expect(after - before).toBe(1);
  expect((await context.cookies()).some((c) => c.name === "mr_access")).toBe(true);
});

test("a page load and an API call with an expired cookie share one refresh", async ({ page, context, request }) => {
  await signIn(page);
  const before = (await (await request.get("http://localhost:4010/__stats")).json()).refreshCalls;
  await context.clearCookies({ name: "mr_access" });

  const status = page.evaluate(async () => (await fetch("/api/proxy/me")).status);
  const other = await context.newPage();
  await Promise.all([status, other.goto("/en/browse")]);
  expect(await status).toBe(200);

  const after = (await (await request.get("http://localhost:4010/__stats")).json()).refreshCalls;
  expect(after - before).toBe(1);
});

test("a revoked session goes back to login", async ({ page, context }) => {
  await signIn(page);
  await context.clearCookies({ name: "mr_access" });
  await context.addCookies([
    { name: "mr_refresh", value: "forged", url: "http://localhost:3100", httpOnly: true },
  ]);
  await page.goto("/en");
  await expect(page).toHaveURL(/\/en\/login/);
});

test("shows a translated error when the server rejects the login", async ({ page }) => {
  await page.goto("/pt/login");
  await page.getByLabel("Usuário").fill("kafka");
  await page.getByLabel("Senha").fill("wrong-password");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.locator("form").getByRole("alert")).toHaveText("Usuário ou senha incorretos.");
});

test("shows a translated error when the web server is unreachable", async ({ page }) => {
  await page.route("**/api/auth/login", (route) => route.abort());
  await page.goto("/en/login");
  await page.getByLabel("Username").fill("kafka");
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.locator("form").getByRole("alert")).toHaveText("Couldn't reach the server.");
});

test.describe("register", () => {
  test("creates an account with an invite code and signs in", async ({ page }) => {
    await page.goto("/en/register?invite=GOOD-INVITE");
    await expect(page.getByLabel("Invite code")).toHaveValue("GOOD-INVITE");
    await page.getByLabel("Username").fill("newfriend");
    await page.getByLabel("Password").fill("password123");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL(/\/en$/);
  });

  test("explains a bad invite", async ({ page }) => {
    await page.goto("/pt/register");
    await page.getByLabel("Código do convite").fill("nope");
    await page.getByLabel("Usuário").fill("newfriend");
    await page.getByLabel("Senha").fill("password123");
    await page.getByRole("button", { name: "Criar conta" }).click();
    await expect(page.locator("form").getByRole("alert")).toHaveText(
      "Este convite é inválido, já foi usado ou expirou.",
    );
  });
});
