# DevOps MCP Server — Demo Video Script (recording-ready)

Target: **under 3 minutes** (hackathon requirement), one continuous terminal recording with voiceover.
Built for the Amazon *Build, Ship, Shape* Developer Hackathon (Alexa+ track). Submission deadline **Oct 23, 2026**.

---

## Before you hit record (5 min)

- [ ] `cd ~/workspace/devops-mcp-server && npm run build && npm run smoke` → must print **SMOKE TEST PASSED**
- [ ] One terminal window, large font, hide bookmarks/other tabs, 1080p
- [ ] Have Docker running if you want the `docker_stats` beat (if no containers are up, the tool returns empty — see fallback below)
- [ ] Do one dry run of each section so commands land first try
- [ ] Test your mic once — quiet room, phone on silent

## Narration (~300 words, ~2:20 at a normal pace)

Read the cues in [brackets] — they are screen actions, not spoken.

**[0:00] [Terminal open, repo README visible]**
"Managing a Linux server still means SSH-ing in and typing commands — or pasting an AI's guesses into the shell. This is a DevOps MCP server: eight tools that let an AI assistant read and manage a real Linux box with natural language. 'Which containers are eating the most memory?' — the assistant calls a tool and answers from live data."

**[0:25] [Run: npm run smoke]**
"Watch it start. Eight tools: system stats, Docker containers and per-container usage, systemd service status, logs, journald, and EC2 instances via the AWS SDK. The smoke test lists them all, calls system stats, and passes."

**[0:50] [Write + run a one-liner that calls docker_stats via stdio, or show README demo section]**
"'Which containers are using the most memory?' — docker_stats returns per-container CPU and memory, ranked. No shell, no copy-paste, no parsing docker CLI output by hand."

*Fallback: if Docker has no running containers, the beat becomes "docker_ps returns an empty list — the point is the assistant can ask the server, not that this laptop is busy."*

**[1:10] [service_status + journal_logs for a unit, e.g. cron or docker]**
"'Is the service healthy?' — service_status checks the systemd unit, and journal_logs pulls its recent journald entries. Triage in two calls instead of three SSH commands."

**[1:30] [Call service_restart WITHOUT the env flag → refusal shown]**
"Here's the design decision I'm proudest of. Ask it to restart a service — and it refuses. Write actions are off by default. Nothing mutates your server unless you explicitly opt in."

**[1:50] [Re-run with ALLOW_WRITE_ACTIONS=true → restart confirmed active]**
"Set one environment variable, and it restarts and confirms. The same assistant, the same tool — but the blast radius is yours to grant."

**[2:05] [Show README 'Security model' section]**
"Every command runs through execFile with an argument list — no shell, so no injection. Unit names are validated, log reads are fenced to /var/log. It's a small server you can actually trust."

**[2:20] [Close on repo]**
"DevOps MCP server — ask your servers questions in plain English. Open source on GitHub, built with Node and TypeScript for the Amazon Build, Ship, Shape hackathon. Link in the description."

---

## Upload + filing checklist

- [ ] Upload to **YouTube as Unlisted** (Loom works too)
- [ ] Title: `DevOps MCP Server — ask your servers questions (<3 min demo)`
- [ ] Description: one-liner + repo link `https://github.com/ChetanSawale/devops-mcp-server` + "Built for the Amazon 'Build, Ship, Shape' Developer Hackathon (Alexa+ track)"
- [ ] Product feedback on the Amazon tools used (MCP / Alexa+ docs) — required hackathon item, keep notes while building
- [ ] Devpost submission (standing permission to use his Devpost account is already granted)
- [ ] Deadline: **Oct 23, 2026** — the reminder fires Oct 19 morning; record this weekend and the filing is a formality
