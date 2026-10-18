import { spawn } from "node:child_process";

// One-shot MCP client for demo recordings.
// Short form (recommended for video):
//   npm run stats                  -> system_stats
//   npm run docker                 -> docker_ps
//   npm run dstats                 -> docker_stats
//   npm run svc -- <unit>          -> service_status   (e.g. npm run svc -- cron)
//   npm run logs -- <unit> [n]      -> journal_logs
//   npm run log -- <path> [n]      -> tail_log         (path must be under /var/log)
//   npm run restart -- <unit>      -> service_restart  (refused unless ALLOW_WRITE_ACTIONS=true)
//   npm run ec2 -- [region]        -> ec2_status
//
// Long form also works:
//   node scripts/demo-call.mjs <tool> '{"json":"args"}'
//
// Exits 0 on success. On tool error (isError), prints the error text and exits 1.

const ALIASES = {
  stats: ["system_stats", {}],
  docker: ["docker_ps", {}],
  dstats: ["docker_stats", {}],
  ec2: ["ec2_status", {}],
};

function parseArgs(argv) {
  const [name, ...rest] = argv;
  if (ALIASES[name]) {
    const [tool, base] = ALIASES[name];
    const args = { ...base };
    if (name === "ec2" && rest[0]) args.region = rest[0];
    return [tool, args];
  }
  // service-style tools: svc <unit>, logs <unit> [n], log <path> [n], restart <unit>
  if (name === "svc" && rest[0]) return ["service_status", { unit: rest[0] }];
  if (name === "logs" && rest[0])
    return ["journal_logs", { unit: rest[0], ...(rest[1] ? { lines: Number(rest[1]) } : {}) }];
  if (name === "log" && rest[0])
    return ["tail_log", { path: rest[0], ...(rest[1] ? { lines: Number(rest[1]) } : {}) }];
  if (name === "restart" && rest[0]) return ["service_restart", { unit: rest[0] }];
  // long form: full tool name + optional JSON
  if (rest[0]?.startsWith("{")) {
    try {
      return [name, JSON.parse(rest[0])];
    } catch {
      console.error("bad JSON args");
      process.exit(2);
    }
  }
  if (rest.length === 0) return [name, {}];
  console.error(`unknown command: ${name}`);
  process.exit(2);
}

const [tool, toolArgs] = parseArgs(process.argv.slice(2));

const child = spawn("node", ["dist/index.js"], { stdio: ["pipe", "pipe", "inherit"] });

let buffer = "";
const pending = [];
child.stdout.on("data", (d) => {
  buffer += d.toString();
  let idx;
  while ((idx = buffer.indexOf("\n")) !== -1) {
    const line = buffer.slice(0, idx).trim();
    buffer = buffer.slice(idx + 1);
    if (!line) continue;
    const resolve = pending.shift();
    if (resolve) resolve(JSON.parse(line));
  }
});

const send = (obj) =>
  new Promise((resolve) => {
    pending.push(resolve);
    child.stdin.write(JSON.stringify(obj) + "\n");
  });

await send({
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "demo-call", version: "0.2.0" } },
});
child.stdin.write(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) + "\n");

const res = await send({
  jsonrpc: "2.0",
  id: 2,
  method: "tools/call",
  params: { name: tool, arguments: toolArgs },
});

const result = res.result ?? {};
const text = (result.content ?? []).map((c) => c.text ?? "").join("\n");
console.log(text);
child.kill();
process.exit(result.isError ? 1 : 0);
