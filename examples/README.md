# Example Journals

This directory contains sanitized sample journals to help you understand the PROXY JOURNAL format and workflow. **These are teaching aids, not real production history.**

## Minimal Example (`minimal.journal/`)

A small, realistic journal from a hypothetical developer working on API authentication.

### Files

- **`identity.json`** — Who the agent is, rules, purpose
- **`memory.json`** — Episodic memory, durable facts, open loops
- **`state.ndjson`** — Append-only event log
- **`journal.md`** — Auto-generated living document

### How to use this example

1. **Inspect the JSON files** to understand the schema:
   ```bash
   cat minimal.journal/identity.json
   cat minimal.journal/memory.json
   ```

2. **See the wake pack output**:
   ```bash
   cd PROXY-JOURNAL
   export PROXY_JOURNAL_HOME=examples/minimal.journal
   proxy-journal wake
   ```

3. **View the living journal**:
   ```bash
   export PROXY_JOURNAL_HOME=examples/minimal.journal
   proxy-journal status
   cat examples/minimal.journal/journal.md
   ```

4. **Replay the history**:
   ```bash
   export PROXY_JOURNAL_HOME=examples/minimal.journal
   proxy-journal history 10
   ```

---

## Data Schema

### `identity.json`

```json
{
  "name": "ProxyName",
  "creator": "Your Name",
  "birth": "YYYY-MM-DD",
  "nature": "Short tagline",
  "purpose": "What this proxy does",
  "rules": ["Rule 1", "Rule 2"],
  "bootstrap": {
    "journal_on_wake": true,
    "memory_load_order": ["identity.json", "memory.json", "state.ndjson", "journal.md"]
  }
}
```

### `memory.json`

```json
{
  "meta": {
    "last_updated": "ISO8601",
    "session_count": 0,
    "product": "PROXY JOURNAL",
    "org": "DIGIVASCONNECT PTY (LTD)"
  },
  "episodic": [
    {
      "timestamp": "ISO8601",
      "event": "Event title",
      "description": "What happened"
    }
  ],
  "facts": {
    "key": "value"
  },
  "open_loops": [
    {
      "title": "Unfinished task",
      "note": "Optional context",
      "opened": "ISO8601"
    }
  ]
}
```

### `state.ndjson`

Each line is a JSON object (newline-delimited JSON):

```
{"timestamp":"ISO8601","event":"init","message":"..."}
{"timestamp":"ISO8601","event":"log|milestone|remember|fact|open_loop|close_loop|...","message":"...","meta":{...}}
```

### `journal.md`

Auto-generated from identity + memory. Includes:
- Identity summary
- Standing rules
- Durable facts
- Open loops
- Recent episodic memory

Rebuild anytime with:
```bash
proxy-journal render
```

---

## Creating Your Own Journal

Start fresh:

```bash
proxy-journal init "YourProxy" "Your Name"
proxy-journal fact stack "Your tech stack"
proxy-journal remember "First milestone" "What you accomplished"
proxy-journal open "Next task" "What needs doing"
proxy-journal preserve
```

Then inspect the files:
```bash
ls -la ~/.proxy-journal/
cat ~/.proxy-journal/identity.json
```

---

## Privacy Note

These examples are **sanitized** — all real names, project details, and credentials have been replaced. Use them as templates; never ship real customer data or secrets in a public repository.

---

## Questions?

- See [../docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md) for design details
- Read [../README.md](../README.md) for quick-start
- Check [../docs/MODULE-API.md](../docs/MODULE-API.md) for programmatic usage

*PROXY JOURNAL · DIGIVASCONNECT PTY (LTD)*
