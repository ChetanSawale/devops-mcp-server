# DevOps MCP Server

An MCP (Model Context Protocol) server that lets an AI assistant **manage Linux servers with natural language** — built for the Amazon *Build, Ship, Shape* Developer Hackathon (Alexa+ track).

Ask things like *"which containers are eating the most memory?"*, *"is nginx running?"*, or *"show me the last 50 lines of the syslog"* — the assistant calls these tools and answers from live server data.

## Tools

| Tool | What it does | Mode |
|---|---|---|
| `system_stats` | CPU, memory, disk, load average, uptime | read-only |
| `docker_ps` | Running containers (name, image, status, ports) | read-only |
| `docker_stats` | Per-container CPU/memory usage | read-only |
| `service_status` | systemd unit active/enabled state | read-only |
| `service_restart` | Restart a systemd service | **write — gated** |
| `tail_log` | Last N lines of a file under `/var/log` | read-only |
| `journal_logs` | Recent journald entries for a unit | read-only |
| `ec2_status` | EC2 instances in a region (AWS SDK) | read-only |

### Security model

- **No shell** — every command runs via `execFile` with an argument list (no shell-injection surface), with timeouts.
- **Validated inputs** — systemd unit names must match `^[A-Za-z0-9@._-]+$`; log reads are restricted to `/var/log`.
- **Write actions are off by default** — `service_restart` refuses unless `ALLOW_WRITE_ACTIONS=true` is set.

## Quickstart

```bash
npm install
npm run build
npm start
```

Run the smoke test (spawns the server over stdio, lists tools, calls `system_stats`):

```bash
npm run smoke
```

## Use with Claude Desktop

Add to your Claude Desktop config:

```json
{
  "mcpServers": {
    "devops": {
      "command": "node",
      "args": ["/absolute/path/to/devops-mcp-server/dist/index.js"],
      "env": { "ALLOW_WRITE_ACTIONS": "false" }
    }
  }
}
```

## Docker

```bash
docker build -t devops-mcp-server .
# read-only mode (recommended for demo):
docker run -i --rm -v /var/run/docker.sock:/var/run/docker.sock devops-mcp-server
# to allow restarts inside the container's own namespace:
docker run -i --rm -e ALLOW_WRITE_ACTIONS=true devops-mcp-server
```

## AWS

`ec2_status` uses the standard credential chain (`AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`, `~/.aws/credentials`, or an IAM role). Set `AWS_REGION` or pass `region` per call (defaults to `ap-south-1`).

## Demo ideas (for the <3 min video)

1. *"Is my server healthy?"* → `system_stats` → spoken summary of CPU/RAM/disk.
2. *"Which Docker containers are using the most memory?"* → `docker_stats` → ranked answer.
3. *"Nginx looks down — check it and show me its recent logs"* → `service_status` + `journal_logs`.
4. *"Restart it"* → `service_restart` (with `ALLOW_WRITE_ACTIONS=true`) → confirm it's active again.

## Hackathon submission checklist

- [ ] Working project (this repo)
- [ ] GitHub repository (public)
- [ ] Demo video under 3 minutes
- [ ] Product feedback on the Amazon tools used (MCP / Alexa+ docs)
- [ ] Devpost submission before the deadline
