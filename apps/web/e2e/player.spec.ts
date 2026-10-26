import { expect, test, type Page } from "@playwright/test";

import { signIn } from "./helpers";

const API = "http://localhost:4010";

type Saved = { anime_id: number; episode: number; position_seconds: number; completed: boolean };

async function saved(page: Page, episode: number) {
  const all: Saved[] = await (await page.request.get(`${API}/__progress`)).json();
  return all.find((p) => p.anime_id === 4 && p.episode === episode);
}

const video = (page: Page) => page.locator("video");
const currentTime = (page: Page) => video(page).evaluate((v: HTMLVideoElement) => v.currentTime);

test("resumes from the saved position and saves on pause", async ({ page }) => {
  await signIn(page);
  await page.goto("/en/watch/stub/4/2");
  await expect(page.getByText("Episode 2", { exact: true })).toBeVisible();
  await expect.poll(() => currentTime(page)).toBeGreaterThanOrEqual(12);
  await expect.poll(() => video(page).evaluate((v: HTMLVideoElement) => !v.paused)).toBe(true);

  await page.keyboard.press("Space");
  await expect(page.getByRole("button", { name: "Play", exact: true })).toBeVisible();
  const at = await currentTime(page);
  await expect.poll(async () => (await saved(page, 2))?.position_seconds).toBeCloseTo(at, 0);
});

test("offers the next episode at the end and marks the episode watched", async ({ page }) => {
  await signIn(page);
  await page.goto("/en/watch/stub/4/1");
  await expect.poll(() => video(page).evaluate((v: HTMLVideoElement) => v.duration)).toBeGreaterThan(30);
  await video(page).evaluate((v: HTMLVideoElement) => {
    v.currentTime = v.duration - 0.3;
    return v.play();
  });
  await expect(page.getByText(/Episode 2 starts in \d+ seconds?/)).toBeVisible();
  await expect.poll(async () => (await saved(page, 1))?.completed).toBe(true);
  await page.getByRole("button", { name: "Play now" }).click();
  await expect(page).toHaveURL(/\/en\/watch\/stub\/4\/2$/);
});

test("cancels the countdown", async ({ page }) => {
  await signIn(page);
  await page.goto("/en/watch/stub/4/2?t=39");
  await expect(page.getByText(/Episode 3 starts in/)).toBeVisible({ timeout: 10_000 });
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByText("Up next: episode 3")).toBeVisible();
  await page.waitForTimeout(1500);
  await expect(page).toHaveURL(/\/watch\/stub\/4\/2\?t=39$/);
});

test("explains an HLS-only episode", async ({ page }) => {
  await signIn(page);
  await page.goto("/en/watch/stub/4/3");
  await expect(page.getByText(/stream format the player doesn't support yet/)).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to the title" }).first()).toHaveAttribute("href", "/en/anime/4");
});

test("explains a disabled source", async ({ page }) => {
  await signIn(page);
  await page.goto("/en/watch/off/4/1");
  await expect(page.getByText("Streaming is turned off on this server.")).toBeVisible();
});

test("keeps sub when the episode has no dub", async ({ page }) => {
  await signIn(page);
  await page.goto("/en/watch/stub/4/2");
  await page.getByRole("button", { name: "Dub" }).click();
  await expect(page.getByText("No dub for this episode.")).toBeVisible();
  await expect(page).toHaveURL(/\/watch\/stub\/4\/2$/);
});

test("seeks through the proxy with range requests", async ({ page }) => {
  await signIn(page);
  const res = await page.request.get("/api/proxy/watch/video?token=ep-1-sub", { headers: { Range: "bytes=100-199" } });
  expect(res.status()).toBe(206);
  expect(res.headers()["content-range"]).toMatch(/^bytes 100-199\/\d+$/);
  expect((await res.body()).length).toBe(100);
});
