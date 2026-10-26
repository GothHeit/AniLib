// Fails when a message file or key exists in one language but not the other.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL("..", import.meta.url)), "messages");
const locales = readdirSync(root, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);

function flatten(obj, prefix = "") {
  return Object.entries(obj).flatMap(([key, value]) =>
    value && typeof value === "object" ? flatten(value, `${prefix}${key}.`) : [`${prefix}${key}`],
  );
}

function keysOf(locale) {
  const out = new Map();
  for (const file of readdirSync(join(root, locale)).filter((f) => f.endsWith(".json"))) {
    const json = JSON.parse(readFileSync(join(root, locale, file), "utf8"));
    out.set(file, new Set(flatten(json)));
  }
  return out;
}

export function checkMessages() {
  const problems = [];
  const byLocale = Object.fromEntries(locales.map((l) => [l, keysOf(l)]));
  const files = new Set(locales.flatMap((l) => [...byLocale[l].keys()]));
  for (const file of files) {
    const all = new Set(locales.flatMap((l) => [...(byLocale[l].get(file) ?? [])]));
    for (const locale of locales) {
      const have = byLocale[locale].get(file);
      if (!have) {
        problems.push(`${locale}/${file}: file is missing`);
        continue;
      }
      for (const key of all) if (!have.has(key)) problems.push(`${locale}/${file}: missing "${key}"`);
    }
  }
  return problems;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const problems = checkMessages();
  if (problems.length) {
    console.error(problems.join("\n"));
    process.exit(1);
  }
  console.log("Messages are in sync.");
}
