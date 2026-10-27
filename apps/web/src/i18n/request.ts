import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";

import { routing } from "./routing";

// Every messages/<locale>/*.json file is merged, so each area owns its own file.
async function loadMessages(locale: string) {
  const dir = join(process.cwd(), "messages", locale);
  const files = (await readdir(dir)).filter((f) => f.endsWith(".json")).sort();
  const parts = await Promise.all(files.map(async (f) => JSON.parse(await readFile(join(dir, f), "utf8"))));
  return Object.assign({}, ...parts);
}

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  // A fixed zone and a shared "now" keep server and browser renderings of dates identical.
  return { locale, messages: await loadMessages(locale), timeZone: "UTC", now: new Date() };
});
