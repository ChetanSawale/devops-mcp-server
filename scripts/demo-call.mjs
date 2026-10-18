import { spawn } from "node:child_process";

// One-shot MCP client for demo recordings.
// Usage:
//   node scripts/demo-call.mjs <tool> [json-args]
// Examples:
//   node scripts/demo-call.mjs system_stats
//   node scripts/demo-call.mjs docker_stats
//   node scripts/demo-call.mjs service_status '{"unit":"cron.service"}'
//   node scripts/demo-call.mjs journal_logs '{"unit":"cron.service","lines":5}'
//   node scripts/demo-call.mjs service_restart '{"unit":"cron.service"}'
//   ALLOW_WRITE_ACTIONS=true node scripts/demo-call.mjs service_restart '{"unit":"cron.service"}'
//
// Exits 0 on success. On tool error (isError), prints the error text and exits 1.

const [tool, argsJson] = process.argv.slice(2);
if (!tool) {
  console.error("usage: node scripts/demo-call.mjs <tool> [json-args]");
  process.exit(2);
}
let toolArgs = {};
if (argsJson) {
  try {
    toolArgs = JSON.parse(argsJson);
  } catch {
    console.error("bad JSON args");
    process.exit(2);
  }
}

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
  params: { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "demo-call", version: "0.1.0" } },
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
