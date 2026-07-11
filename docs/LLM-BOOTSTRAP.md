# Bootstrap in any AI chat

## Recommended (30 seconds)

```bash
# install once
npm install -g .          # from a clone
# or: npm install -g proxy-journal   (when published to npm)

proxy-journal init "Proxy" "YourName"
proxy-journal wake | tee /tmp/wake.md
```

Open your AI product → paste `/tmp/wake.md` → continue work.

## End of session checklist

```bash
proxy-journal log session_end "What we finished and what's next"
proxy-journal remember "Session title" "Detailed summary for future self"
proxy-journal preserve
```

## Project-local journal

```bash
export PROXY_JOURNAL_HOME="$PWD/.proxy-journal"
proxy-journal init
```

Commit **templates** only if you want a team-shared identity.
Usually keep `~/.proxy-journal` private (gitignore local data).

## Pairing with coding agents

| Agent | How to load |
|-------|-------------|
| Claude Code | Paste wake pack or `@journal.md` |
| Grok Build | Paste wake pack in first prompt |
| Cursor | Rules / docs: paste BOOTSTRAP + journal |
| ChatGPT | Custom GPT instructions or first message |

## What not to put in the journal

- API keys, tokens, passwords  
- Customer PII  
- Encrypted cloud credentials  

Use environment variables or a secrets manager for those.
