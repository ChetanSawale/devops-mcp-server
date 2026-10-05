import { execFile } from "node:child_process";
import path from "node:path";

export class CommandError extends Error {
  constructor(
    message: string,
    public readonly stderr = "",
  ) {
    super(message);
    this.name = "CommandError";
  }
}

/**
 * Run a binary with an argument list — no shell involved, so there is
 * no shell-injection surface. Rejects on non-zero exit or timeout.
 */
export function run(cmd: string, args: string[], timeoutMs = 10_000): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { timeout: timeoutMs, maxBuffer: 4 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) {
        const detail = (stderr || "").trim() || err.message;
        reject(new CommandError(`${cmd} failed: ${detail}`, (stderr || "").trim()));
      } else {
        resolve(stdout);
      }
    });
  });
}

/** Allow only safe systemd unit names (blocks `;`, `$()`, paths, etc). */
export function assertSafeUnit(name: string): void {
  if (!/^[A-Za-z0-9@._-]{1,64}$/.test(name)) {
    throw new CommandError(`Refusing unsafe unit name: ${name}`);
  }
}

/** Restrict log reads to files under /var/log. Returns the resolved path. */
export function assertSafeLogPath(p: string): string {
  const resolved = path.resolve(p);
  if (resolved !== "/var/log" && !resolved.startsWith("/var/log/")) {
    throw new CommandError(`Refusing log path outside /var/log: ${p}`);
  }
  return resolved;
}

/** Clamp a requested line count to a sane range. */
export function clampLines(n: number, max = 500): number {
  if (!Number.isFinite(n)) return 50;
  return Math.min(Math.max(Math.floor(n), 1), max);
}
