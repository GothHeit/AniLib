import { expect, test } from "@playwright/test";

import { signIn } from "./helpers";

test("shows a watchable title with its episodes and rows", async ({ page }) => {
  await signIn(page);
  await page.goto("/en/anime/1");
  await expect(page.getByRole("heading", { level: 1, name: "Moon Test 1" })).toBeVisible();
  await expect(page.getByText("Watch here")).toBeVisible();
  await expect(page.getByText("Score 8.51")).toBeVisible();
  await expect(page.getByText("Fall 2026")).toBeVisible();
  await expect(page.getByRole("link", { name: "Continue episode 2" })).toHaveAttribute(
    "href",
    "/en/watch/stub/1/2",
  );
  const episodes = page.getByRole("region", { name: "Episodes" });
  await expect(episodes.getByRole("link")).toHaveCount(3);
  await expect(episodes.getByRole("link", { name: /Episode 1.*Watched/ })).toBeVisible();
  await expect(page.getByRole("region", { name: "Related" }).getByText("Sequel", { exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "Recommended" }).getByRole("link", { name: /Sun Test/ })).toHaveAttribute(
    "href",
    "/en/anime/11",
  );
});

test("shows a title that can only be tracked", async ({ page }) => {
  await signIn(page);
  await page.goto("/en/anime/2");
  await expect(page.getByText("Tracking only", { exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "Episodes" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /episode/i })).toHaveCount(0);
});

test("adds the title to the list", async ({ page }) => {
  await signIn(page);
  await page.goto("/en/anime/1");
  await page.getByLabel("My list").selectOption("watching");
  await expect(page.getByText("Saved to Watching.")).toBeVisible();
});

test("shows the status already on the list", async ({ page }) => {
  await signIn(page);
  await page.goto("/en/anime/4");
  await expect(page.getByLabel("My list")).toHaveValue("completed");
});

test("disables the status picker when the list entry can't be loaded", async ({ page }) => {
  await signIn(page);
  await page.goto("/en/anime/5");
  const picker = page.getByLabel("My list");
  await expect(picker).toBeDisabled();
  await expect(picker.locator("option:checked")).toHaveText("Status unavailable");
});

test("shows the title right away and streams the watch button in", async ({ page }) => {
  await signIn(page);
  await page.goto("/en/anime/1");
  await expect(page.getByRole("heading", { level: 1, name: "Moon Test 1" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Continue episode 2" })).toBeVisible();
});

test("speaks Portuguese", async ({ page }) => {
  await signIn(page, "pt");
  await page.goto("/pt/anime/1");
  await expect(page.getByRole("link", { name: "Continuar episódio 2" })).toBeVisible();
  await expect(page.getByText("Outono 2026")).toBeVisible();
});
