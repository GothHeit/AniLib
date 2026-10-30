type Tree = { [key: string]: unknown };

const isTree = (value: unknown): value is Tree => typeof value === "object" && value !== null && !Array.isArray(value);

/** Merges message files that share a top-level namespace (player.json and sources.json both hold "player"). */
export function mergeMessages(parts: Tree[]): Tree {
  const out: Tree = {};
  for (const part of parts) {
    for (const [key, value] of Object.entries(part)) {
      const current = out[key];
      out[key] = isTree(current) && isTree(value) ? mergeMessages([current, value]) : value;
    }
  }
  return out;
}

/** The video sources whose display names may ship to the browser: the ones this server has switched on. */
export function enabledSources(env: string | undefined): string[] {
  return (env ?? "").split(",").map((s) => s.trim()).filter(Boolean);
}

/** Drops the names of sources that aren't enabled, so a build without them never mentions them. */
export function pruneSources(messages: Tree, enabled: string[]): Tree {
  const player = messages.player;
  if (!isTree(player) || !isTree(player.streams)) return messages;
  const streams = Object.fromEntries(Object.entries(player.streams).filter(([name]) => enabled.includes(name)));
  return { ...messages, player: { ...player, streams } };
}
