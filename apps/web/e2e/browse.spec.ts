import { expect, test } from "@playwright/test";

import { signIn } from "./helpers";

test("home shows the hero and rows, with progress on continue watching", async ({ page }) => {
  await signIn(page);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Frieren");
  await expect(page.getByRole("region", { name: "Continue watching" })).toBeVisible();
  await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "50");
  await expect(page.getByRole("region", { name: "This season" })).toBeVisible();
});

test("continue watching opens the player on the resume episode", async ({ page }) => {
  await signIn(page);
  await page.getByRole("region", { name: "Continue watching" }).getByRole("link").click();
  await expect(page).toHaveURL(/\/en\/watch\/stub\/1\/2$/);
});

test("a resume point past the last episode opens the last available one", async ({ page }) => {
  await signIn(page);
  await page.goto("/en/continue/1/9");
  await expect(page).toHaveURL(/\/en\/watch\/stub\/1\/3$/);
});

test("a title with no source falls back to its page", async ({ page }) => {
  await signIn(page);
  await page.goto("/en/continue/2/1");
  await expect(page).toHaveURL(/\/en\/anime\/2$/);
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

test("browse ignores hand-edited filters it can't use", async ({ page }) => {
  await signIn(page);
  // A season needs a year, and an unknown genre is dropped: the page still shows the catalog.
  await page.goto("/en/browse?season=fall&genre=9999");
  await expect(page.getByRole("link", { name: /Dungeon Meshi/ })).toBeVisible();
  await expect(page.getByLabel("Season")).toBeDisabled();
  await expect(page.getByLabel("Genre")).toHaveValue("");
  await page.goto("/en/browse?year=abc&page=-3");
  await expect(page.getByRole("link", { name: /Frieren/ })).toBeVisible();
});

test("genre names follow the language", async ({ page }) => {
  await signIn(page, "pt");
  await page.goto("/pt/browse");
  await expect(page.getByLabel("Gênero")).toContainText("Aventura");
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

test("my list shows the linked list by status and lets titles move or go", async ({ page }) => {
  await signIn(page, "en", "linked");
  await page.goto("/en/list");
  await expect(page.getByRole("tab", { name: /Watching \(2\)/ })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("link", { name: /Frieren/ })).toBeVisible();
  await page.getByRole("tab", { name: /Completed \(1\)/ }).click();
  await expect(page.getByRole("link", { name: /Fullmetal/ })).toBeVisible();

  await page.getByRole("tab", { name: /Watching/ }).click();
  await page.getByRole("button", { name: "Options for Frieren" }).click();
  await page.getByRole("menuitem", { name: "Move to Completed" }).click();
  await expect(page.getByText("List updated.")).toBeVisible();
  await expect(page.getByRole("tab", { name: /Completed \(2\)/ })).toBeVisible();

  await page.getByRole("button", { name: "Options for Dungeon Meshi" }).click();
  await page.getByRole("menuitem", { name: "Remove from list" }).click();
  await expect(page.getByText("Removed from your list.")).toBeVisible();
  await expect(page.getByRole("tab", { name: /Watching \(0\)/ })).toBeVisible();
});
