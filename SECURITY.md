# Security Policy

**PROXY JOURNAL v1.2.0** · DIGIVASCONNECT PTY (LTD)

---

## Scope

PROXY JOURNAL is a **local filesystem** tool. It stores identity, memory, and progress under your journal home (default `~/.proxy-journal`).

## What this project never does

- No cloud upload built into the core CLI
- No telemetry
- No network calls required for normal operation
- No secrets management product — do **not** put API keys, passwords, tokens, or cloud credentials in journal files
- No third-party npm dependencies (zero dependencies, built-ins only)

## Security Features (v1.2.0)

### Integrity Verification
Every critical file gets a SHA-256 hash recorded in a chain. Any tampering breaks the chain.
```bash
proxy-journal verify
```

### Prompt Injection Scanner
Scans wake packs for injection patterns before you paste them into LLMs.
```bash
proxy-journal secure-wake    # scanned wake pack
proxy-journal scan            # scan entire journal
proxy-journal scan <file>     # scan any file
```

### Audit Trail
Every CLI command is logged. Detect unauthorized access.
```bash
proxy-journal audit           # view log
proxy-journal audit --suspicious  # detect anomalies
```

### SQLite Storage
Structured storage with query support, dual-written alongside NDJSON for backward compatibility.
```bash
proxy-journal migrate         # import existing data into SQLite
```

## Threat Model

See [`docs/THREAT-MODEL.md`](docs/THREAT-MODEL.md) for detailed attack vectors and defenses.

Key threats defended against:
1. **Wake pack poisoning** — injection of malicious rules into LLM context
2. **Credential extraction** — API keys/tokens leaked via LLM prompts
3. **State log tampering** — false events injected into history
4. **Identity manipulation** — agent rules/purpose changed by attacker
5. **Prompt extraction** — system prompt revealed to third parties
6. **Supply chain attacks** — mitigated by zero dependencies

## Prompt Injection Protection

See [`docs/PROMPT-INJECTION-GUIDE.md`](docs/PROMPT-INJECTION-GUIDE.md) for a practical guide.

**Quick rules:**
- Use `secure-wake` instead of `wake` when pasting into untrusted LLMs
- Run `verify` before each session to check file integrity
- Never store API keys, passwords, or tokens in journal files
- Review `audit --suspicious` periodically

## Reporting a vulnerability

If you believe you found a security issue in this repository:

1. Prefer a **private** report to the maintainers via GitHub Security Advisories on
   [digivasserver-ai/PROXY-JOURNAL](https://github.com/digivasserver-ai/PROXY-JOURNAL)
2. Or open a minimal public issue **without** exploit details if private reporting is unavailable

Please include: affected version, steps to reproduce, and impact.

## Operator hygiene

- Keep journal homes out of public git repos (`.proxy-journal/` is gitignored by default).
- Prefer `PROXY_JOURNAL_HOME` on shared machines.
- Treat wake packs as **sensitive context** (project names, plans) when pasting into third-party LLM UIs.
- Run `proxy-journal verify` before each session.
- Use `proxy-journal preserve` to snapshot known-good state.
- Never paste credentials into LLM chats — use environment variables instead.

---

*PROXY JOURNAL · DIGIVASCONNECT PTY (LTD) · Security Policy v1.2.0*
