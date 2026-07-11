# Changelog

All notable changes to PROXY JOURNAL are documented in this file.

## [1.1.0] — 2026-07-11

### Added

- **Hop pack (default `wake`)** — token-efficient context for model hops
- `wake --full` — previous archive-style pack (JSON + living journal)
- `wake --short` / `--hop` / `-s` — explicit hop mode
- `wake --stats` — char + ~token estimate on stderr
- `export` accepts the same wake flags

### Changed

- Default wake no longer dumps full identity/memory JSON or entire `journal.md`
- Hop pack keeps: rules, facts, open loops, recent episodes, recent state lines
- Docs/README market hop efficiency as the primary continuity flow

### Design notes

- Hop mode prioritizes **focus + fewer tokens** without dropping continuity signals
- Full mode remains for handoff, audit, and deep resume

## [1.0.0] — 2026-07-11

### Added

- Initial public release by **DIGIVASCONNECT PTY (LTD)**
- CLI: `init`, `wake`/`bootstrap`, `status`, `log`, `remember`, `render`, `preserve`, `export`, `path`, `help`, `version`
- `fact <key> <value>` for durable truths in `memory.facts`
- `open` / `close` for unfinished work (`memory.open_loops`)
- `history [n]` (alias `tail`) to inspect recent `state.ndjson` events
- Living `journal.md` render with facts + open loops
- Wake pack for any LLM (Markdown + JSON, no vendor lock-in)
- Timestamped `preserve` backups under `backup/`
- Zero runtime dependencies; Node.js 18+
- GitHub Actions CI (Node 18 / 20 / 22)
- `NO_COLOR` support; version read from `package.json`

### Design notes

- `wake` is a **read** by default (does not append to state). Use `wake --log` if you want a wake event recorded.
