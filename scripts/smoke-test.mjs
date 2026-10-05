import { spawn } from "node:child_process";

// Minimal JSON-RPC client for the MCP stdio transport (newline-delimited JSON).
const child = spawn("node", ["dist/index.js"], { stdio: ["pipe", "pipe", "pipe"] });
child.stderr.on("data", (d) => process.stderr.write(`[server] ${d}`));

let buffer = "";
const pending = [];
child.stdout.on("data", (d) => {
  buffer += d.toString();
  let idx;
  while ((idx = buffer.indexOf("\n")) !== -1) {
    const line = buffer.slice(0, idx).trim();
    buffer = buffer.slice(idx + 1);
    if (!line) continue;
    const msg = JSON.parse(line);
    const resolve = pending.shift();
    if (resolve) resolve(msg);
  }
});

function send(obj) {
  return new Promise((resolve) => {
    pending.push(resolve);
    child.stdin.write(JSON.stringify(obj) + "\n");
  });
}

function notify(obj) {
  child.stdin.write(JSON.stringify(obj) + "\n");
}

const init = await send({
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "smoke", version: "0.0.0" } },
});
console.log("server:", JSON.stringify(init.result?.serverInfo));
notify({ jsonrpc: "2.0", method: "notifications/initialized" });

const tools = await send({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} });
const names = tools.result.tools.map((t) => t.name);
console.log("tools:", names.join(", "));
if (names.length !== 8) throw new Error(`expected 8 tools, got ${names.length}`);

const call = await send({
  jsonrpc: "2.0",
  id: 3,
  method: "tools/call",
  params: { name: "system_stats", arguments: {} },
});
const text = call.result.content[0].text;
console.log("system_stats ->", text.slice(0, 300));
const parsed = JSON.parse(text);
if (!parsed.hostname || typeof parsed.memory.used_percent !== "number") {
  throw new Error("system_stats returned unexpected shape");
}

// service_restart must be refused without the env flag
const denied = await send({
  jsonrpc: "2.0",
  id: 4,
  method: "tools/call",
  params: { name: "service_restart", arguments: { unit: "nginx.service" } },
});
const deniedText = denied.result.content[0].text;
if (!JSON.parse(deniedText).error?.includes("disabled")) {
  throw new Error("service_restart should have been refused without ALLOW_WRITE_ACTIONS");
}
console.log("write-gate check passed");

console.log("SMOKE TEST PASSED");
child.kill();
