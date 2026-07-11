# Security Policy

## Scope

PROXY JOURNAL is a **local filesystem** tool. It stores identity, memory, and progress under your journal home (default `~/.proxy-journal`).

## What this project never does

- No cloud upload built into the core CLI  
- No telemetry  
- No network calls required for normal operation  
- No secrets management product — do **not** put API keys, passwords, tokens, or cloud credentials in journal files  

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
