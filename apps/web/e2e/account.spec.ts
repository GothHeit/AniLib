import { expect, test } from "@playwright/test";

import { signIn } from "./helpers";

test("lists devices and signs one out", async ({ page }) => {
  await signIn(page);
  await page.goto("/en/settings");
  await expect(page.getByTestId("session")).toHaveCount(2);
  await expect(page.getByText("Firefox on Linux")).toBeVisible();
  await expect(page.getByText("This device")).toBeVisible();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page.getByTestId("session")).toHaveCount(1);
});

test("changes the password, and explains a wrong current one", async ({ page }) => {
  await signIn(page);
  await page.goto("/en/settings");
  await page.getByLabel("Current password").fill("wrong");
  await page.getByLabel(/^New password/).fill("a-brand-new-one");
  await page.getByLabel("Repeat the new password").fill("a-brand-new-one");
  await page.getByRole("button", { name: "Change password" }).click();
  await expect(page.getByText("The current password is wrong.")).toBeVisible();

  await page.getByLabel("Current password").fill("password123");
  await page.getByRole("button", { name: "Change password" }).click();
  await expect(page.getByText("Password changed.")).toBeVisible();
});

test("signs out everywhere", async ({ page }) => {
  await signIn(page);
  await page.goto("/en/settings");
  await page.getByRole("button", { name: "Sign out everywhere" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Sign out everywhere" }).click();
  await expect(page).toHaveURL(/\/en\/login/);
});

test("the proxy refuses auth routes and cross-site writes", async ({ page }) => {
  await signIn(page);
  const auth = await page.request.post("/api/proxy/auth/login", {
    data: { username: "kafka", password: "password123" },
  });
  expect(auth.status()).toBe(404);
  const cross = await page.request.patch("/api/proxy/me", {
    data: { show_nsfw: true },
    headers: { Origin: "https://evil.example" },
  });
  expect(cross.status()).toBe(403);
  const same = await page.request.patch("/api/proxy/me", { data: { show_nsfw: false } });
  expect(same.status()).toBe(200);
});
