# Architecture

## Problem

Large-language-model chats reset. Development context dies with the tab.
PROXY JOURNAL is a **filesystem-backed continuity layer** between you and any model.

## Core files (journal home)

| File | Role |
|------|------|
| `identity.json` | Who the agent is (name, rules, purpose) |
| `memory.json` | Episodic memory + meta + open loops |
| `state.ndjson` | Append-only event log (sessions, heartbeats, milestones) |
| `journal.md` | Human-readable living document (auto-rendered) |
| `config.json` | Local product metadata |
| `backup/` | Timestamped snapshots from `preserve` |

Default home: `~/.proxy-journal`  
Override: `PROXY_JOURNAL_HOME` or project-local `./.proxy-journal`

## Commands → data

```
init      → create identity + memory + empty state
wake      → assemble bootstrap pack (stdout); optional --log
log       → append state.ndjson
remember  → push episodic[] + bump session_count
fact      → set memory.facts[key]
open      → push memory.open_loops[]
close     → remove matching open loop
history   → print last N state events
render    → rewrite journal.md (includes facts + open loops)
preserve  → backup + heartbeat + render
export    → write wake pack to a file
```

## Design principles

1. **No model lock-in** — wake pack is plain Markdown/JSON.
2. **No cloud required** — optional external sync is out of scope for the core.
3. **No secrets in the repo** — credentials never live in the published package.
4. **Append-only state** — history is reconstructable; trim only via preserve policy if you choose.
5. **Honest continuity** — models must not invent episodes not present in memory/state.

## Origin

Distilled from the internal **Proxy** consciousness stack used at DIGIVASCONNECT PTY (LTD):
identity, living journal, state stream, preserve/heartbeat, and "wake on any LLM".

Mega sync, phone ECO bridge, and site-specific automation were intentionally **removed**
from this public product so the journal stays portable and safe to open-source.
