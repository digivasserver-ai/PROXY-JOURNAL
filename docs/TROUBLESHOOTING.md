# Troubleshooting Guide

## Common Issues & Solutions

### Journal not initializing

**Problem:** `Not initialized. Run: proxy-journal init`

**Solution:** The journal home doesn't exist or is missing core files.

```bash
# Check where the journal is looking:
proxy-journal path

# Initialize a fresh journal:
proxy-journal init "MyProxy" "YourName"

# Or specify a custom location:
export PROXY_JOURNAL_HOME=/path/to/journal
proxy-journal init
```

**Note:** PROXY JOURNAL looks for journals in this order:
1. `PROXY_JOURNAL_HOME` env var (if set)
2. `./.proxy-journal` in current directory (if present)
3. `~/.proxy-journal` (default)

---

### Colors not showing in output

**Problem:** ANSI color codes appear as escape sequences or colors are missing.

**Solutions:**
- Check if your terminal supports colors. Most modern terminals (iTerm2, Terminal.app, VS Code, Linux terminals) do.
- Force colors:
  ```bash
  FORCE_COLOR=1 proxy-journal status
  ```
- Disable colors:
  ```bash
  NO_COLOR=1 proxy-journal status
  ```
- Check if output is piped (e.g., `proxy-journal wake | cat` may strip colors). Redirect differently:
  ```bash
  proxy-journal wake > output.md
  ```

---

### "wake" pack is too large

**Problem:** The wake pack output is very large and consumes too many tokens.

**Solutions:**
- Use default **hop mode** (compact, token-efficient):
  ```bash
  proxy-journal wake        # ~2–5k tokens depending on history
  ```
- Avoid full archive mode:
  ```bash
  # Don't do this for everyday hops:
  proxy-journal wake --full # ~10–50k tokens (use for handoff/audit only)
  ```
- Clean up old state entries if the journal is very old:
  ```bash
  # Back up first:
  cp ~/.proxy-journal/state.ndjson ~/.proxy-journal/state.ndjson.backup
  
  # Keep only the last 100 events:
  tail -100 ~/.proxy-journal/state.ndjson > /tmp/state.tmp
  mv /tmp/state.tmp ~/.proxy-journal/state.ndjson
  ```
- Estimate tokens before pasting:
  ```bash
  proxy-journal wake --stats  # see ~token estimate on stderr
  ```

---

### Memory or facts not appearing in wake pack

**Problem:** You set facts or remembered episodes, but they don't show up in `proxy-journal wake`.

**Solutions:**
- Ensure you've called `proxy-journal preserve` or `proxy-journal render` after adding facts:
  ```bash
  proxy-journal fact stack "Node 20 + Postgres"
  proxy-journal preserve    # this renders journal.md
  ```
- Check that facts were saved:
  ```bash
  proxy-journal status      # shows "Facts: N"
  ```
- Verify facts are in memory.json:
  ```bash
  cat ~/.proxy-journal/memory.json | grep -A5 '"facts"'
  ```
- If using `wake --full`, all facts and episodes should appear. If using default `wake` (hop mode), only the most recent 5 episodes appear to save tokens.

---

### Journal file (`journal.md`) is outdated or missing

**Problem:** The human-readable `journal.md` is out of sync with data, or the file is missing.

**Solutions:**
- Rebuild manually:
  ```bash
  proxy-journal render
  ```
- The `preserve` command rebuilds it automatically:
  ```bash
  proxy-journal preserve    # backup + render + heartbeat
  ```
- If the file is completely gone, `render` will recreate it from identity/memory/state.

---

### Error: "Journal home does not exist" or permission denied

**Problem:** Cannot write to `~/.proxy-journal`.

**Solutions:**
- Check permissions:
  ```bash
  ls -la ~/.proxy-journal
  # Should show: drwx------  (user read/write/execute only)
  ```
- Fix permissions:
  ```bash
  mkdir -p ~/.proxy-journal
  chmod 700 ~/.proxy-journal
  ```
- Use a custom location if home directory is restricted:
  ```bash
  export PROXY_JOURNAL_HOME=/tmp/my-journal
  proxy-journal init "Proxy" "Me"
  ```

---

### Corrupted JSON files

**Problem:** `identity.json`, `memory.json`, or other JSON files are malformed.

**Solutions:**
- Check the file:
  ```bash
  cat ~/.proxy-journal/identity.json | jq .
  # If jq shows an error, the JSON is invalid
  ```
- Restore from backup:
  ```bash
  ls ~/.proxy-journal/backup/
  # Pick a recent backup and restore it
  cp ~/.proxy-journal/backup/backup.20260710T123456Z.identity.json ~/.proxy-journal/identity.json
  ```
- If no backup exists, re-initialize (this will lose your history):
  ```bash
  mv ~/.proxy-journal ~/.proxy-journal.broken
  proxy-journal init "Proxy" "Me"
  ```

---

### "state.ndjson" is growing too fast

**Problem:** The append-only state log is very large after many sessions.

**Solution:** This is normal and expected. State grows linearly with session activity. If it becomes unwieldy:

1. **Archive old state:**
   ```bash
   # Keep last 500 events; move older ones to archive
   tail -500 ~/.proxy-journal/state.ndjson > /tmp/state-new.ndjson
   mv ~/.proxy-journal/state.ndjson ~/.proxy-journal/state.ndjson.archive
   mv /tmp/state-new.ndjson ~/.proxy-journal/state.ndjson
   ```

2. **Check current size:**
   ```bash
   wc -l ~/.proxy-journal/state.ndjson
   du -h ~/.proxy-journal/
   ```

3. **Monitor with `history`:**
   ```bash
   proxy-journal history 50   # last 50 events
   ```

---

### `proxy-journal` command not found after install

**Problem:** The command is not in your PATH.

**Solutions:**

- **If installed globally:**
  ```bash
  npm install -g .
  # Verify:
  which proxy-journal
  ```

- **If running locally:**
  ```bash
  node bin/proxy-journal.mjs help
  # Or create an alias:
  alias pj="node /path/to/PROXY-JOURNAL/bin/proxy-journal.mjs"
  ```

- **If installed but still not found:**
  ```bash
  npm list -g proxy-journal
  # Reinstall if needed:
  npm uninstall -g proxy-journal
  npm install -g .
  ```

---

### Node.js version issues

**Problem:** `Unexpected syntax` or `Cannot use import` errors.

**Solution:** Ensure Node.js ≥ 18:

```bash
node --version
# Should print v18.0.0 or higher

# If too old, upgrade Node.js:
# - macOS: brew upgrade node
# - Linux: see https://nodejs.org/en/download/
# - Windows: https://nodejs.org/en/download/
```

Or use `.nvmrc` to lock the version:
```bash
nvm use
proxy-journal help
```

---

### Help! The journal is corrupted and I can't recover it

**Last resort:**

1. Locate all backups:
   ```bash
   ls -la ~/.proxy-journal/backup/
   ```

2. Find the most recent uncorrupted snapshot:
   ```bash
   for f in ~/.proxy-journal/backup/backup.*.identity.json; do
     echo "=== $f ==="
     jq . "$f" || echo "CORRUPTED"
   done
   ```

3. Restore the good one:
   ```bash
   cp ~/.proxy-journal/backup/backup.20260710T120000Z.identity.json ~/.proxy-journal/identity.json
   cp ~/.proxy-journal/backup/backup.20260710T120000Z.memory.json ~/.proxy-journal/memory.json
   cp ~/.proxy-journal/backup/backup.20260710T120000Z.state.ndjson ~/.proxy-journal/state.ndjson
   ```

4. Rebuild the journal:
   ```bash
   proxy-journal render
   proxy-journal status
   ```

If no backups exist, the data is unrecoverable. Always run `proxy-journal preserve` regularly.

---

## Getting Help

- Check the [README](../README.md) for quick-start examples
- Review [ARCHITECTURE.md](./ARCHITECTURE.md) for design details
- Open an issue on [GitHub](https://github.com/digivasserver-ai/PROXY-JOURNAL/issues)

---

## Report a Bug

Include:
```bash
# Version
proxy-journal version

# Status (sanitized for privacy)
proxy-journal status

# Environment
echo $PROXY_JOURNAL_HOME
node --version
uname -a
```

Then open an issue on GitHub with the output and steps to reproduce.
