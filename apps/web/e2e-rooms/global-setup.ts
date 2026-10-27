import { execFileSync } from "node:child_process";
import { join } from "node:path";

const API_DIR = join(__dirname, "../../api");

// The real API runs against a real database, so watch-together is tested end to end: the
// room logic on the server, the event stream, the proxy and the player in two browsers.
export default function globalSetup() {
  const run = (...args: string[]) => execFileSync("uv", ["run", ...args], { cwd: API_DIR, stdio: "inherit" });
  run("alembic", "upgrade", "head");
  run("python", join(__dirname, "seed.py"));
}
