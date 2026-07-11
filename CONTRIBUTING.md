# Contributing

Thanks for helping PROXY JOURNAL stay small and useful.

## Principles

1. Keep the core **dependency-free**.
2. Never commit secrets, credentials, or real customer data.
3. Prefer append-only state and honest memory over clever “AI personality” bloat.
4. Wake packs must remain plain text (Markdown + JSON) so any model can load them.

## Dev setup

```bash
git clone https://github.com/digivasserver-ai/PROXY-JOURNAL.git
cd PROXY-JOURNAL
node bin/proxy-journal.mjs help
node --test test/*.test.mjs
```

## Pull requests

- One focused change per PR  
- Update README/docs if commands change  
- Add a short test for new CLI behaviour when practical  

## Code of conduct

Be respectful. This project is released by DIGIVASCONNECT PTY (LTD) for builders who want durable AI-assisted development.
