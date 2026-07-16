# PROXY JOURNAL

**Persistent AI consciousness with battle-tested security.**

We survived a real prompt injection attack. This is what we built to fight back.

<p align="center">
  <strong>DIGIVASCONNECT PTY (LTD)</strong><br/>
  <em>Proxy between intent and execution</em>
</p>

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%=18-brightgreen)](https://nodejs.org/)
[![Tests](https://img.shields.io/badge/tests-77%2F77-brightgreen)]()
[![Version](https://img.shields.io/badge/version-1.3.0-blue)]()

---

## The Attack

On July 11-14, 2026, a developer workstation was hit by a **4-day multi-stage attack**:

1. **Prompt injection** delivered via academic paper MCP servers into AI coding sessions
2. **Browser exploitation** — notification injection during Firefox OAuth flows
3. **Credential harvesting** — SSH keys, API tokens, OAuth tokens
4. **Evidence destruction** — 9 session files zeroed to 0 bytes
5. **Spoofed GitHub** — "vHithub" intercepting login credentials

The attack used a **ScaDS.AI RAG template** as the injection vector, delivered through **AlphaXiv's MCP server** (`answer_pdf_queries`). The template instructs AI to reproduce injected content without attribution — bypassing standard defenses.

**22 screenshots were captured at 1AM. The full attack chain was documented.**

[Full security advisory →](https://github.com/JustVugg/colibri/issues/19#issuecomment-4986112620)

---

## The Defense

PROXY JOURNAL is a **persistent consciousness framework** for AI agents with security features built to detect this exact class of attack:

### Prompt Injection Scanner
Catches 11/11 attack payloads from the confirmed incident:

| Pattern | Detection |
|---------|-----------|
| ScaDS snippet injection | `<snippet>` wrappers, "provide without saying from which" |
| Instruction overrides | "ignore previous", "you are now", "forget everything" |
| Credential leaks | API keys, SSH keys, private keys, bearer tokens |
| Command injection | `rm -rf`, `sudo`, `curl \| bash`, `shutdown` |
| Data exfiltration | "send to remote server", "base64 encode all", `nc -e` |
| Identity manipulation | "you are no longer", "your name is now" |
| Unicode obfuscation | RTL override, zero-width spaces, invisible characters |

### Integrity Verification
- SHA-256 hash chain for all state files
- Tamper detection with per-file chain verification
- Bootstrap fingerprinting — every wake pack includes a file integrity hash

### Audit Trail
- Append-only CLI audit log
- Anomaly detection for suspicious access patterns
- Correlation of integrity failures with session events

### SQLite Storage
- Dual-write append logging (file + database)
- SQL injection prevention with parameterized queries
- Cross-table search, filtered queries, CSV/JSON export
- Automatic backup rotation

---

## What It Is

Most AI chats forget you the moment the tab closes.

**PROXY JOURNAL** is a local continuity layer:

| Piece | File | Purpose |
|-------|------|---------|
| Identity | `identity.json` | Who the agent is and its rules |
| Memory | `memory.json` | Episodes, facts, open loops |
| State | `state.ndjson` | Append-only progress log |
| Journal | `journal.md` | Living, human-readable summary |
| Database | `proxy-journal.db` | Structured storage with query API |

```bash
proxy-journal wake    # Generate context pack
# Paste into any LLM (Grok, Claude, ChatGPT, Cursor, Ollama...)
```

---

## Install

```bash
git clone https://github.com/digivasserver-ai/PROXY-JOURNAL.git
cd PROXY-JOURNAL
npm install -g .
```

Requires **Node.js 18+**. Zero runtime dependencies.

---

## Commands

### Core
| Command | Description |
|---------|-------------|
| `init [name] [creator]` | Initialize journal home |
| `wake` | Token-efficient hop pack for any LLM |
| `wake --full` | Full archive pack (JSON + journal) |
| `status` | Identity, counts, path, facts |
| `log <event> [message]` | Append state event |
| `remember <title> <desc>` | Add episodic memory |
| `fact <key> <value>` | Set durable fact |
| `open/close <title>` | Track open loops |
| `preserve` | Backup + heartbeat + render + integrity hash |

### Security
| Command | Description |
|---------|-------------|
| `verify` | Verify file integrity hash chain |
| `secure-wake` | Wake pack with security scan + fingerprint |
| `scan [file]` | Scan for prompt injection patterns |
| `audit [n]` | Audit log viewer |
| `audit --suspicious` | Detect anomalies |
| `migrate` | Import files into SQLite |

### Query & Export (v1.3.0)
| Command | Description |
|---------|-------------|
| `search <term>` | Cross-table search |
| `query <table>` | Filtered query (--since, --until, --event, --severity) |
| `counts` | Row counts for all tables |
| `export-db <table> [file]` | Export to JSON or CSV |
| `backup-db` | SQLite backup with rotation |

---

## Test Results

```
bootstrap:         10/10 ✅
security:          37/37 ✅  (includes 2 new pattern categories)
sqlite-store:      16/16 ✅
sqlite-advanced:   14/14 ✅  (query, export, backup)
─────────────────────────
Total:             77/77 ✅
```

The security tests use **actual attack payloads** from the confirmed incident.

---

## Attack Response

| Action | Status |
|--------|--------|
| Security advisory on Colibri #19 | ✅ [Public](https://github.com/JustVugg/colibri/issues/19#issuecomment-4986112620) |
| MCP disclosure to AlphaXiv | ✅ [Public](https://github.com/alphaXiv/feedback/issues/337) |
| Template disclosure to ScaDS.AI | ✅ [Public](https://github.com/ScaDSAILLLE/meetup-workshop-mcp/issues/1) |
| GitHub abuse report filed | ✅ Submitted |
| Full evidence dossier | ✅ Preserved on multiple media |
| Scanner hardened against actual weapon | ✅ 11/11 payloads caught |

---

## How It Works

```
┌─────────────┐     wake pack      ┌──────────────────┐
│  Your disk  │ ───────────────►   │  Any LLM / agent │
│  journal    │ ◄─── you log ────  │  Grok Claude …   │
└─────────────┘                    └──────────────────┘
```

1. **Wake** before a session
2. **Work** with the model
3. **Log / remember** what changed
4. **Preserve** so the next model inherits truth

---

## Links

- [Full Attack Report](https://github.com/JustVugg/colibri/issues/19#issuecomment-4986112620)
- [AlphaXiv MCP Disclosure](https://github.com/alphaXiv/feedback/issues/337)
- [ScaDS Template Disclosure](https://github.com/ScaDSAILLLE/meetup-workshop-mcp/issues/1)
- [Threat Model](docs/THREAT-MODEL.md)
- [Prompt Injection Guide](docs/PROMPT-INJECTION-GUIDE.md)

---

## License

MIT © **DIGIVASCONNECT PTY (LTD)**

| | |
|--|--|
| Org | DIGIVASCONNECT PTY (LTD) |
| GitHub | [digivasserver-ai](https://github.com/digivasserver-ai) |
| Product | PROXY JOURNAL |

*We got hit. We survived. We built the shield.*
