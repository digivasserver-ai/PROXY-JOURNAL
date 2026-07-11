# Module API Reference

**PROXY JOURNAL** exports a small, focused set of utilities. Most users interact via the CLI (`proxy-journal` command); developers who want to embed the journal in Node.js code can import these modules.

---

## `src/cli.mjs`

Main entry point for the CLI. Called by `bin/proxy-journal.mjs`.

### `run(argv: string[]): number`

Execute a CLI command and return an exit code.

**Parameters:**
- `argv` — process.argv (e.g., `['node', 'bin/proxy-journal.mjs', 'wake', '--stats']`)

**Returns:**
- Exit code: `0` on success, `1` on error

**Example:**
```javascript
import { run } from './src/cli.mjs'
const code = run(['node', 'bin/proxy-journal.mjs', 'init', 'MyProxy', 'Me'])
process.exit(code)
```

---

## `src/bootstrap.mjs`

Wake pack generation. Used to create portable context for LLM hops.

### `buildWakePack(home: string, opts?: object): { text, core, mode, stats }`

Build a continuity pack (hop or full mode).

**Parameters:**
- `home` — Journal home directory (e.g., `~/.proxy-journal`)
- `opts.mode` — `'short'` (default, token-efficient) or `'full'` (archive)
- `opts.refreshJournal` — Rebuild `journal.md` before packing (default: true for full, false for short)

**Returns:**
- `text` — Markdown pack ready to paste into an LLM
- `core` — Loaded identity, memory, journal (object)
- `mode` — Resolved mode (`'short'` or `'full'`)
- `stats` — `{ chars, tokens, mode }` — estimated token count

**Example:**
```javascript
import { buildWakePack } from './src/bootstrap.mjs'
const { text, stats } = buildWakePack('~/.proxy-journal')
console.log(`Pack: ${stats.tokens} tokens (~${stats.chars} chars)`)
console.log(text)
```

### `estimateTokens(text: string): number`

Rough token estimate (chars ÷ 4).

**Parameters:**
- `text` — String to estimate

**Returns:**
- Approximate token count

---

## `src/store.mjs`

Filesystem persistence. Read/write identity, memory, state, and journal.

### `ensureDirs(home: string): object`

Create journal home directory structure if it doesn't exist.

**Parameters:**
- `home` — Journal home path

**Returns:**
- Object with keys: `{ identity, memory, state, journal, config, backup }`

### `readJson(path: string, fallback?: object): object`

Read a JSON file; return fallback if missing or corrupted.

**Parameters:**
- `path` — File path
- `fallback` — Default if file doesn't exist or is invalid JSON

**Returns:**
- Parsed JSON or fallback

### `writeJson(path: string, obj: object): void`

Write an object as pretty-printed JSON (2-space indent).

### `appendState(home: string, event: string, message?: string, meta?: object): object`

Append an event to `state.ndjson`.

**Parameters:**
- `home` — Journal home
- `event` — Event type (e.g., `'log'`, `'remember'`, `'wake'`)
- `message` — Optional message
- `meta` — Optional metadata object

**Returns:**
- Written entry: `{ timestamp, event, message, meta }`

**Example:**
```javascript
import { appendState } from './src/store.mjs'
appendState('~/.proxy-journal', 'milestone', 'Shipped auth module')
```

### `loadCore(home: string): { exists, identity, memory, journal, recent }`

Load all core files for a journal.

**Parameters:**
- `home` — Journal home

**Returns:**
- `exists` — Boolean (all required files present)
- `identity` — Parsed `identity.json` or null
- `memory` — Parsed `memory.json` or null
- `journal` — Content of `journal.md` or null
- `recent` — Last 50 entries from `state.ndjson`

### `countState(home: string): number`

Count total lines in `state.ndjson`.

### `readStateLines(home: string, n: number): object[]`

Read last *n* lines from `state.ndjson`, parsed as JSON.

**Parameters:**
- `home` — Journal home
- `n` — Number of lines (max 500)

**Returns:**
- Array of state entries

### `snapshotBackup(home: string, prefix?: string): string`

Create timestamped backups of all core files under `backup/`.

**Parameters:**
- `home` — Journal home
- `prefix` — Backup prefix (default: `'backup'`)

**Returns:**
- Backup file prefix (e.g., `'backup.20260711T052821Z'`)

---

## `src/journal.mjs`

Living journal rendering. Auto-generates `journal.md` from facts, open loops, and episodic memory.

### `renderJournal(home: string): void`

Rebuild `journal.md` from current identity, memory, and state.

**Parameters:**
- `home` — Journal home

**Side effects:**
- Writes to `${home}/journal.md`

**Example:**
```javascript
import { renderJournal } from './src/journal.mjs'
renderJournal('~/.proxy-journal')
```

---

## `src/paths.mjs`

Path utilities.

### `resolveHome(): string`

Resolve the journal home directory in order of precedence:
1. `PROXY_JOURNAL_HOME` environment variable
2. `./.proxy-journal` (if present in current directory)
3. `~/.proxy-journal` (user home)

**Returns:**
- Resolved path

### `filesFor(home: string): object`

Get standard filenames for a journal home.

**Parameters:**
- `home` — Journal home path

**Returns:**
```javascript
{
  identity: '~/.proxy-journal/identity.json',
  memory: '~/.proxy-journal/memory.json',
  state: '~/.proxy-journal/state.ndjson',
  journal: '~/.proxy-journal/journal.md',
  config: '~/.proxy-journal/config.json',
  backup: '~/.proxy-journal/backup'
}
```

---

## Example: Custom Integration

```javascript
import { resolveHome, filesFor } from './src/paths.mjs'
import { loadCore, appendState } from './src/store.mjs'
import { buildWakePack } from './src/bootstrap.mjs'

// Get journal home
const home = resolveHome()
console.log(`Journal home: ${home}`)

// Load current state
const core = loadCore(home)
console.log(`Name: ${core.identity?.name}`)
console.log(`Open loops: ${core.memory?.open_loops?.length}`)

// Log a custom event
appendState(home, 'custom', 'Did something interesting', { extra: 'metadata' })

// Generate and output wake pack
const { text } = buildWakePack(home, { mode: 'short' })
console.log(text)
```

---

## Zero Dependencies

All modules use only Node.js built-ins:
- `fs` (read/write files)
- `path` (path manipulation)
- `os` (home directory)

No external npm packages required.
