import { expect, test } from "@playwright/test";

import { signIn } from "./helpers";

test("home shows the hero and rows, with progress on continue watching", async ({ page }) => {
  await signIn(page);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Frieren");
  await expect(page.getByRole("region", { name: "Continue watching" })).toBeVisible();
  await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "50");
  await expect(page.getByRole("region", { name: "This season" })).toBeVisible();
});

test("the nav search suggests titles and Enter opens the results page", async ({ page }) => {
  await signIn(page);
  const box = page.getByRole("combobox", { name: "Search" });
  await box.fill("dungeon");
  await expect(page.getByRole("option", { name: /Dungeon Meshi/ })).toBeVisible();
  await box.press("Enter");
  await expect(page).toHaveURL(/\/en\/search\?q=dungeon$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Results for “dungeon”");
  await expect(page.getByRole("link", { name: /Dungeon Meshi/ })).toBeVisible();
});

test("browse filters live in the URL and narrow the grid", async ({ page }) => {
  await signIn(page);
  await page.goto("/en/browse");
  await expect(page.getByRole("link", { name: /Dungeon Meshi/ })).toBeVisible();
  await page.getByLabel("Genre").selectOption({ label: "Adventure" });
  await expect(page).toHaveURL(/\/en\/browse\?genre=1$/);
  await expect(page.getByRole("link", { name: /Dungeon Meshi/ })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Fullmetal/ })).toBeVisible();

  await page.goto("/en/browse?genre=1&year=2024");
  await expect(page.getByLabel("Season")).toBeEnabled();
});

test("my list asks to link MyAnimeList when it is not linked", async ({ page }) => {
  await signIn(page);
  await page.goto("/en/list");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("My list");
  await expect(page.getByRole("button", { name: "Link MyAnimeList" })).toBeVisible();
});

test("an expired MyAnimeList session keeps the user signed in and offers to link again", async ({ page }) => {
  await signIn(page, "en", "expired");
  await page.goto("/en/list");
  await expect(page).toHaveURL(/\/en\/list$/);
  await expect(page.getByText("Your MyAnimeList session expired. Link it again.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Link MyAnimeList" })).toBeVisible();
});
