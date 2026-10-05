import { run, CommandError } from "../lib/exec.js";

function parseJsonLines(out: string): unknown[] {
  return out
    .trim()
    .split("\n")
    .filter((l) => l.trim().length > 0)
    .map((l) => JSON.parse(l));
}

/** List running Docker containers. Throws a clear error when Docker is missing. */
export async function dockerPs(): Promise<unknown[]> {
  try {
    const out = await run("docker", ["ps", "--format", "{{json .}}"]);
    return parseJsonLines(out);
  } catch (e) {
    if (e instanceof CommandError) {
      throw new CommandError(`Docker does not appear to be available on this host: ${e.message}`);
    }
    throw e;
  }
}

/** One-shot per-container CPU/memory usage. */
export async function dockerStats(): Promise<unknown[]> {
  try {
    const out = await run("docker", ["stats", "--no-stream", "--format", "{{json .}}"]);
    return parseJsonLines(out);
  } catch (e) {
    if (e instanceof CommandError) {
      throw new CommandError(`Docker does not appear to be available on this host: ${e.message}`);
    }
    throw e;
  }
}
