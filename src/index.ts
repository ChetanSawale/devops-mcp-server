#!/usr/bin/env node
/**
 * devops-mcp-server — an MCP server that lets AI assistants manage Linux servers.
 *
 * Tools:
 *   system_stats    host CPU / memory / disk / load / uptime            (read-only)
 *   docker_ps       list running Docker containers                      (read-only)
 *   docker_stats    per-container CPU/memory usage                      (read-only)
 *   service_status  systemd unit active/enabled state                   (read-only)
 *   service_restart restart a systemd service      (WRITE — needs ALLOW_WRITE_ACTIONS=true)
 *   tail_log        last N lines of a file under /var/log               (read-only)
 *   journal_logs    recent journald entries for a unit                 (read-only)
 *   ec2_status      list EC2 instances in a region (needs AWS creds)     (read-only)
 *
 * Transport: stdio (works with Claude Desktop, MCP Inspector, and any MCP client).
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { systemStats } from "./tools/system.js";
import { dockerPs, dockerStats } from "./tools/docker.js";
import { serviceStatus, serviceRestart } from "./tools/services.js";
import { tailLog, journalLogs } from "./tools/logs.js";
import { ec2Status } from "./tools/aws.js";

const server = new McpServer({ name: "devops-mcp-server", version: "0.1.0" });

const asText = (data: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
});

/** Wrap a tool handler: failures come back as readable text flagged with
 *  isError (per the MCP spec) instead of crashing the server. */
const safe =
  (fn: () => Promise<unknown>) =>
  async () => {
    try {
      return asText(await fn());
    } catch (e) {
      return { ...asText({ error: (e as Error).message }), isError: true as const };
    }
  };

server.tool("system_stats", "Get Linux host stats: CPU, memory, disk, load average, uptime.", {}, safe(systemStats));

server.tool("docker_ps", "List running Docker containers (name, image, status, ports).", {}, safe(dockerPs));

server.tool("docker_stats", "Per-container CPU and memory usage (one-shot docker stats).", {}, safe(dockerStats));

server.tool(
  "service_status",
  "Check a systemd service's state (active/enabled).",
  { unit: z.string().describe("systemd unit name, e.g. nginx.service") },
  async ({ unit }) => safe(() => serviceStatus(unit))(),
);

server.tool(
  "service_restart",
  "Restart a systemd service. WRITE ACTION — refused unless ALLOW_WRITE_ACTIONS=true is set.",
  { unit: z.string().describe("systemd unit name, e.g. nginx.service") },
  async ({ unit }) => safe(() => serviceRestart(unit))(),
);

server.tool(
  "tail_log",
  "Read the last N lines of a log file. Path must be under /var/log.",
  {
    path: z.string().describe("Absolute log path, e.g. /var/log/syslog"),
    lines: z.number().min(1).max(500).default(50).describe("How many trailing lines to return"),
  },
  async ({ path, lines }) => safe(() => tailLog(path, lines))(),
);

server.tool(
  "journal_logs",
  "Read recent journald log entries for a systemd unit.",
  {
    unit: z.string().describe("systemd unit name, e.g. nginx.service"),
    lines: z.number().min(1).max(500).default(50).describe("How many trailing lines to return"),
  },
  async ({ unit, lines }) => safe(() => journalLogs(unit, lines))(),
);

server.tool(
  "ec2_status",
  "List EC2 instances in a region via the AWS SDK (uses the standard credential chain).",
  {
    region: z.string().optional().describe("AWS region; defaults to AWS_REGION env or ap-south-1"),
  },
  async ({ region }) => safe(() => ec2Status(region))(),
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("devops-mcp-server running on stdio");
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
