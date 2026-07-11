# PROXY JOURNAL

**Portable AI/LLM development journal** — identity, memory, and progress that travels with you across models and machines.

Built by **DIGIVASCONNECT PTY (LTD)** · published as open source for the community.

[![CI](https://github.com/digivasserver-ai/PROXY-JOURNAL/actions/workflows/ci.yml/badge.svg)](https://github.com/digivasserver-ai/PROXY-JOURNAL/actions/workflows/ci.yml)

## Why this exists

Long AI sessions lose context. PROXY JOURNAL keeps a small, honest **home** for:

- **Identity** — who the agent is, who created it, purpose
- **Memory** — episodic notes you choose to keep
- **State** — append-only event log of milestones and work
- **Wake pack** — a single pasteable context block for any LLM chat

No cloud lock-in. No required API keys. Dependency-free Node.js CLI.

## Quick start

```bash
git clone https://github.com/digivasserver-ai/PROXY-JOURNAL.git
cd PROXY-JOURNAL
node bin/proxy-journal.mjs init "Proxy" "YourName"
node bin/proxy-journal.mjs wake
```

Paste the wake output into Grok, Claude, ChatGPT, Cursor, or any assistant — then work as usual.

```bash
node bin/proxy-journal.mjs log milestone "Shipped first release"
node bin/proxy-journal.mjs remember "Lesson" "What we learned"
node bin/proxy-journal.mjs preserve
```

## Commands

| Command | Description |
|---------|-------------|
| `init [name] [creator]` | Initialize journal home |
| `wake` / `bootstrap` | Print context pack for LLM paste |
| `status` | Identity, counts, path |
| `log <event> [message]` | Append state.ndjson event |
| `remember <title> <desc>` | Add episodic memory |
| `render` | Rebuild journal.md |
| `preserve` | Snapshot + render + heartbeat |
| `export [file]` | Write wake pack to file |
| `path` | Print journal home |
| `help` | Help |

## Environment

| Variable | Meaning |
|----------|---------|
| `PROXY_JOURNAL_HOME` | Override journal directory (default `~/.proxy-journal`) |

## License

MIT — see [LICENSE](LICENSE).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).
