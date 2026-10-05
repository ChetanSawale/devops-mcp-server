import { run, assertSafeUnit, CommandError } from "../lib/exec.js";

export interface ServiceState {
  unit: string;
  active: string;
  enabled: string;
}

/** Read-only: report whether a systemd unit is active/enabled. */
export async function serviceStatus(unit: string): Promise<ServiceState> {
  assertSafeUnit(unit);
  let active = "unknown";
  let enabled = "unknown";
  try {
    active = (await run("systemctl", ["is-active", unit])).trim();
  } catch (e) {
    active = e instanceof CommandError ? e.message : "error";
  }
  try {
    enabled = (await run("systemctl", ["is-enabled", unit])).trim();
  } catch (e) {
    enabled = e instanceof CommandError ? e.message : "error";
  }
  return { unit, active, enabled };
}

/**
 * WRITE ACTION: restart a systemd service.
 * Refused unless ALLOW_WRITE_ACTIONS=true is set in the environment.
 */
export async function serviceRestart(unit: string): Promise<{ unit: string; result: string }> {
  assertSafeUnit(unit);
  if (process.env.ALLOW_WRITE_ACTIONS !== "true") {
    throw new CommandError(
      "Write actions are disabled. Set ALLOW_WRITE_ACTIONS=true in the environment to allow service restarts.",
    );
  }
  await run("systemctl", ["restart", unit], 30_000);
  const state = await serviceStatus(unit);
  return { unit, result: `restart requested; now active=${state.active}` };
}
