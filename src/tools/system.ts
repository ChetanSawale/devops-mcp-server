import os from "node:os";
import { run } from "../lib/exec.js";

export interface SystemStats {
  hostname: string;
  platform: string;
  uptime_seconds: number;
  load_average_1_5_15: number[];
  cpu_count: number;
  cpu_model: string;
  memory: { total_mb: number; free_mb: number; used_percent: number };
  disk_root: string;
}

export async function systemStats(): Promise<SystemStats> {
  const memTotal = os.totalmem();
  const memFree = os.freemem();

  let diskRoot = "unavailable";
  try {
    const df = await run("df", ["-h", "/"]);
    const dataLine = df
      .trim()
      .split("\n")
      .slice(1)
      .find((l) => l.trim().length > 0);
    if (dataLine) {
      // Filesystem Size Used Avail Use% Mounted
      const parts = dataLine.trim().split(/\s+/);
      const usePct = parts.find((p) => p.endsWith("%")) ?? "?";
      diskRoot = `${parts[1] ?? "?"} total, ${parts[2] ?? "?"} used (${usePct}), ${parts[3] ?? "?"} avail`;
    }
  } catch {
    // df missing or failed — leave as "unavailable"
  }

  return {
    hostname: os.hostname(),
    platform: `${os.platform()} ${os.release()}`,
    uptime_seconds: Math.floor(os.uptime()),
    load_average_1_5_15: os.loadavg(),
    cpu_count: os.cpus().length,
    cpu_model: os.cpus()[0]?.model ?? "unknown",
    memory: {
      total_mb: Math.round(memTotal / 1_048_576),
      free_mb: Math.round(memFree / 1_048_576),
      used_percent: Math.round(((memTotal - memFree) / memTotal) * 100),
    },
    disk_root: diskRoot,
  };
}
