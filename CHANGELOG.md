# Changelog

## v1.3.0 — July 16, 2026

### New: Query & Export API
- `searchAll(term)` — Cross-table search across identity, memory, state_events, audit_log, security_events
- `queryStateEvents(opts)` — Filter by event type, time range, limit
- `queryAuditLog(opts)` — Filter by command, result, time range
- `querySecurityEvents(opts)` — Filter by severity, event type, time range
- `getTableCounts()` — Row counts for all tables
- `exportTableJSON(table, opts)` — Export any table to JSON
- `exportTableCSV(table, opts)` — Export any table to CSV with proper escaping

### New: CLI Commands
- `proxy-journal search <term>` — Search across all tables
- `proxy-journal query <table> [opts]` — Query with filters (--since, --until, --event, --severity, --limit)
- `proxy-journal counts` — Show row counts for all tables
- `proxy-journal export-db <table> [file]` — Export to JSON or CSV (auto-detects by extension)
- `proxy-journal backup-db` — Backup SQLite database with rotation (keeps last 5)

### New: Database Backup Rotation
- `backupDatabase(home, keep)` — Creates timestamped backups in `backups/` directory
- Automatic rotation — keeps only the last N backups (default 5)
- Called automatically during `proxy-journal preserve`

### Security (continued from v1.2.1)
- `snippet_injection` pattern category — Detects ScaDS RAG template, `<snippet>`/`<context>` wrappers, attribution bypass
- `unicode_obfuscation` pattern category — Detects RTL override, zero-width characters, invisible formatting
- 11/11 attack payloads from confirmed DevStation hack detected
- 63 unit tests (now 77 with advanced queries)

### Attack Response
- Security advisory posted to JustVugg/colibri#19
- MCP disclosure posted to alphaXiv/feedback#337
- ScaDS disclosure posted to ScaDSAILLLE/meetup-workshop-mcp#1
- GitHub abuse report filed against ZacharyZcR

---

## v1.2.1 — July 16, 2026

### Security
- Added `snippet_injection` pattern category (7 patterns)
- Added `unicode_obfuscation` pattern category (8 patterns)
- Penetration test against confirmed attack: 11/11 payloads caught

---

## v1.2.0 — July 15, 2026

### Security
- SHA-256 hash chain integrity verification
- Prompt injection scanner (6 categories)
- Append-only audit trail with anomaly detection
- SQLite dual-write storage
- Secure wake pack generation with fingerprinting

### CLI
- `verify` — Integrity check
- `secure-wake` — Security-scanned wake pack
- `scan` — File/journal injection scan
- `audit` — Audit log viewer
- `migrate` — JSON/NDJSON to SQLite migration
