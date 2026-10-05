import { readFile } from "node:fs/promises";
import { run, assertSafeUnit, assertSafeLogPath, clampLines, CommandError } from "../lib/exec.js";

/** Read the last N lines of a log file. Path is restricted to /var/log. */
export async function tailLog(p: string, lines = 50): Promise<{ path: string; lines: string[] }> {
  const safe = assertSafeLogPath(p);
  const n = clampLines(lines);
  try {
    const out = await run("tail", ["-n", String(n), safe]);
    return { path: safe, lines: out.replace(/\n$/, "").split("\n") };
  } catch {
    // `tail` missing — fall back to reading the file directly
    try {
      const content = await readFile(safe, "utf8");
      return { path: safe, lines: content.replace(/\n$/, "").split("\n").slice(-n) };
    } catch (e) {
      throw new CommandError(`Cannot read log file ${safe}: ${(e as Error).message}`);
    }
  }
}

/** Read recent journald entries for a systemd unit. */
export async function journalLogs(unit: string, lines = 50): Promise<{ unit: string; lines: string[] }> {
  assertSafeUnit(unit);
  const n = clampLines(lines);
  const out = await run("journalctl", ["-u", unit, "-n", String(n), "--no-pager"]);
  return { unit, lines: out.replace(/\n$/, "").split("\n") };
}
