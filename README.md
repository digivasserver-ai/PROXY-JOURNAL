# PROXY JOURNAL

**Portable development journal for AI / LLM sessions.**  
Never start from a blank slate again.

<p align="center">
  <strong>DIGIVASCONNECT PTY (LTD)</strong><br/>
  <em>Proxy between intent and execution</em>
</p>

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org/)

---

## What it is

Most AI chats forget you the moment the tab closes.

**PROXY JOURNAL** is a small, local continuity layer:

| Piece | File | Purpose |
|-------|------|---------|
| Identity | `identity.json` | Who the agent is and its rules |
| Memory | `memory.json` | Episodes, facts, open loops |
| State | `state.ndjson` | Append-only progress log |
| Journal | `journal.md` | Living, human-readable summary |

On entering **any** LLM chat (Grok, Claude, ChatGPT, Cursor, Ollama…), you run:

```bash
proxy-journal wake
```

Paste the output as the first message. The model loads who you are, what you last did, and what is still open.

---

## Install

```bash
git clone https://github.com/digivasserver-ai/PROXY-JOURNAL.git
cd PROXY-JOURNAL
npm install -g .
```

Or run without install:

```bash
node bin/proxy-journal.mjs help
```

Requires **Node.js 18+**. Zero runtime dependencies.

---

## Quick start

```bash
# 1. Create your journal home (~/.proxy-journal)
proxy-journal init "Proxy" "YourName"

# 2. Generate a bootstrap pack and paste into your AI chat
proxy-journal wake

# 3. After real work, log progress
proxy-journal log milestone "Shipped auth middleware"
proxy-journal remember "Auth done" "JWT + refresh tokens working on openEuler"
proxy-journal fact stack "Node 20 + openEuler"
proxy-journal open "Write deploy docs" "Need one screenshot"

# 4. Snapshot + refresh the living journal
proxy-journal preserve

# 5. Review recent events
proxy-journal history 10
```

Aliases: `pj` works the same as `proxy-journal` when installed globally.

---

## Commands

| Command | Description |
|---------|-------------|
| `init [name] [creator]` | Initialize journal home |
| `wake` / `bootstrap` | Print full context pack for any LLM |
| `status` | Path, identity, event counts, facts, open loops |
| `log <event> [message]` | Append to `state.ndjson` |
| `remember <title> <desc>` | Add episodic memory |
| `fact <key> <value>` | Set a durable fact (`memory.facts`) |
| `open <title> [note]` | Track unfinished work |
| `close <title>` | Close a matching open loop |
| `history [n]` | Show last *n* state events (alias: `tail`) |
| `render` | Rebuild `journal.md` |
| `preserve` | Backup snapshot + heartbeat + render |
| `export [file]` | Write wake pack to disk |
| `path` | Print journal home |
| `help` / `version` | Usage / version |

Environment:

| Variable | Meaning |
|----------|---------|
| `PROXY_JOURNAL_HOME` | Override journal directory (default `~/.proxy-journal`, or `./.proxy-journal` if present) |
| `NO_COLOR` | Disable ANSI colors when set |

`wake` is a **read** — it does not append to `state.ndjson` unless you pass `wake --log`.

---

## How it fits your workflow

```
┌─────────────┐     wake pack      ┌──────────────────┐
│  Your disk  │ ───────────────►   │  Any LLM / agent │
│  journal    │ ◄─── you log ────  │  Grok Claude …   │
└─────────────┘                    └──────────────────┘
```

1. **Wake** before a session  
2. **Work** with the model  
3. **Log / remember** what changed  
4. **Preserve** so the next model (or you tomorrow) inherits truth  

See [docs/LLM-BOOTSTRAP.md](docs/LLM-BOOTSTRAP.md) and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

---

## What we deliberately left out

This public package is distilled from a larger internal **Proxy** stack.  
Removed for safety and portability:

- Cloud credentials and encrypted Mega keys  
- Machine-specific automation and device bridges  
- Personal case data and private logs  

The **journal** is the product. Bring your own models and optional cloud later.

---

## Example data

Sanitized samples live in [`examples/`](examples/) — use them as a teaching aid, not as production history.

---

## License

MIT © **DIGIVASCONNECT PTY (LTD)**

---

## Author

| | |
|--|--|
| Org | DIGIVASCONNECT PTY (LTD) |
| GitHub | [digivasserver-ai](https://github.com/digivasserver-ai) |
| Product | PROXY JOURNAL |

*Persist. Log. Continue.*
