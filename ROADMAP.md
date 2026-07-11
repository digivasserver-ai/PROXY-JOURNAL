# PROXY JOURNAL Roadmap

Public roadmap for upcoming features and improvements. See also [`docs/NEXT-PROJECT-1.1.md`](docs/NEXT-PROJECT-1.1.md) for 1.1.x planning details.

---

## Released

### ✓ v1.1.0 (2026-07-11)

- **Hop pack** (default `wake`) — token-efficient context for model hops
- `wake --full` — previous archive-style pack (JSON + living journal)
- `wake --stats` — character and ~token estimate
- `export` command with mode flags
- Optimized boot time and memory efficiency

### ✓ v1.0.0 (2026-07-11)

- Initial public release
- Core CLI: `init`, `wake`, `status`, `log`, `remember`, `fact`, `open`, `close`, `history`, `preserve`, `export`, `render`, `path`
- Zero dependencies; Node.js 18+
- Living `journal.md` rendering
- Append-only state log
- Portable wake packs (any LLM)

---

## In Progress

### 1.1.x — Quality & Stability

- [ ] Extended test coverage (store, bootstrap, journal unit tests)
- [ ] File permission hardening (0o700 on journal home)
- [ ] JSON validation and corruption recovery
- [ ] Edge case handling (very large state, permission errors)
- [ ] GitHub Actions CI (Node 18/20/22, coverage)
- [ ] Module API documentation (for embedding)
- [ ] Troubleshooting guide
- [ ] Example sanitized journals

---

## Planned

### 1.2 — Features

- [ ] **Multi-journal support** — `proxy-journal list` / `proxy-journal switch <name>` to manage multiple personas
- [ ] **Search & grep** — `proxy-journal search <keyword>` across state/memory
- [ ] **Diff / history replay** — `proxy-journal diff <timestamp> <timestamp>` to see what changed
- [ ] **Custom templates** — `PROXY_JOURNAL_TEMPLATES` env to override pack format
- [ ] **Sync hooks** — `preserve --hook-post` to run custom scripts (e.g., upload to S3, git push)

### 2.0 — Cloud & Sync (Optional)

*See [`docs/FUTURE-CLOUD-SYNC.md`](docs/FUTURE-CLOUD-SYNC.md)*

- [ ] **Cloud backup** — Encrypted sync to S3 / Azure Blob / Backblaze
- [ ] **Multi-device** — Keep journals in sync across laptops
- [ ] **Version history** — Full history of edits (like Git for your journal)
- [ ] **Access tokens** — Share read-only or read-write journals with teammates
- [ ] **Web viewer** — Simple dashboard to browse journeyed (opt-in, privacy-first)

### 2.0+ — Automation (Optional)

*See [`docs/FUTURE-TIMELINE-AUTOMATION.md`](docs/FUTURE-TIMELINE-AUTOMATION.md)*

- [ ] **Timeline builder** — Auto-render timeline views of episodic memory
- [ ] **Scheduled preservation** — `cron` or systemd timer to auto-preserve at intervals
- [ ] **Smart facts** — LLM-powered fact extraction from conversations
- [ ] **Slack integration** — Post milestones to Slack
- [ ] **Calendar sync** — Export open loops to calendar as tasks

### Future — Brand & Vision

*See [`docs/FUTURE-BRAND-AND-COMPANY.md`](docs/FUTURE-BRAND-AND-COMPANY.md)*

- [ ] **Proxy IDE** — Lightweight IDE for journal editing + model interaction
- [ ] **Marketplace** — Share journal templates, automation scripts, integrations
- [ ] **Enterprise** — Team journals, org-wide memory, audit logs
- [ ] **Hardware** — Proxy device as a local LLM proxy + journal server

---

## Not Planned

These are explicitly out of scope for the core product (by design):

- **Cloud credentials in the package** — Bring your own integrations
- **Machine-specific automation** — This is a *portable* journal, not a shell
- **Personal case data** — Never ship real customer data or logs
- **Vendor lock-in** — Wake packs remain plain text
- **User accounts / SaaS** — Stay CLI-first; cloud is optional

---

## How to Contribute

See [CONTRIBUTING.md](CONTRIBUTING.md). Priority areas:

1. **Test coverage** — Add unit tests for uncovered modules
2. **Performance** — Benchmark and optimize large journals
3. **Docs** — Improve examples, troubleshooting, API reference
4. **Integrations** — Prove out 1.2 features (search, multi-journal, hooks) as third-party tools first
5. **Security** — Audit and harden file permissions, JSON validation

---

## Questions?

- Open an issue on [GitHub](https://github.com/digivasserver-ai/PROXY-JOURNAL/issues)
- Read [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for design rationale
- Check [`docs/NEXT-PROJECT-1.1.md`](docs/NEXT-PROJECT-1.1.md) for detailed 1.1.x planning

*PROXY JOURNAL · DIGIVASCONNECT PTY (LTD) · Persist. Log. Continue.*
