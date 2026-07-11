import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { resolveHome, filesFor } from './paths.mjs'
import {
  ensureDirs,
  writeJson,
  readJson,
  appendState,
  loadCore,
  snapshotBackup,
  countState,
  readStateLines,
} from './store.mjs'
import { renderJournal } from './journal.mjs'
import { buildWakePack } from './bootstrap.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

function packageVersion() {
  try {
    const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'))
    return pkg.version || '0.0.0'
  } catch {
    return '0.0.0'
  }
}

const VERSION = packageVersion()
const useColor = process.stdout.isTTY && !process.env.NO_COLOR && process.env.FORCE_COLOR !== '0'

function paint(code, s) {
  return useColor ? `\x1b[${code}m${s}\x1b[0m` : String(s)
}

const c = {
  cyan: (s) => paint(36, s),
  green: (s) => paint(32, s),
  yellow: (s) => paint(33, s),
  red: (s) => paint(31, s),
  bold: (s) => paint(1, s),
  dim: (s) => paint(2, s),
}

function requireInit(home) {
  if (!existsSync(filesFor(home).identity)) {
    console.error(c.red('Not initialized. Run: proxy-journal init'))
    return false
  }
  return true
}

function loadMemory(home) {
  return readJson(filesFor(home).memory, defaultMemory())
}

function saveMemory(home, mem) {
  mem.meta = mem.meta || {}
  mem.meta.last_updated = new Date().toISOString()
  writeJson(filesFor(home).memory, mem)
}

function help() {
  console.log(`
${c.cyan(c.bold('PROXY JOURNAL'))}  ·  DIGIVASCONNECT PTY (LTD)  ·  v${VERSION}
Portable AI/LLM development journal — identity, memory, progress.

${c.bold('Usage')}
  proxy-journal <command> [args]

${c.bold('Commands')}
  ${c.yellow('init')} [name] [creator]     Initialize journal home (default: Proxy / Operator)
  ${c.yellow('wake')} | ${c.yellow('bootstrap')}       Hop pack for any LLM (token-efficient, default)
  ${c.yellow('status')}                   Show identity, counts, path
  ${c.yellow('log')} <event> [message]    Append a state.ndjson event
  ${c.yellow('remember')} <title> <desc>  Add episodic memory entry
  ${c.yellow('fact')} <key> <value>       Set a durable fact (memory.facts)
  ${c.yellow('open')} <title> [note]      Track an open loop / unfinished task
  ${c.yellow('close')} <title>            Close a matching open loop
  ${c.yellow('history')} [n]              Show last n state events (default 20)
  ${c.yellow('render')}                   Rebuild journal.md from data
  ${c.yellow('preserve')}                 Snapshot backup + render + heartbeat
  ${c.yellow('export')} [file]            Write wake pack to a file
  ${c.yellow('path')}                     Print journal home
  ${c.yellow('help')}                     This screen
  ${c.yellow('version')}                  Print version

${c.bold('Wake / hop flags')}
  (default)            Compact hop pack — fewer tokens, same focus
  --full               Full archive pack (JSON + living journal)
  --short | --hop | -s Explicit hop pack (same as default)
  --stats              Print size/token estimate on stderr
  --log                Also append a wake event to state.ndjson
  --no-render          Skip journal.md rebuild (full mode only)

${c.bold('Environment')}
  PROXY_JOURNAL_HOME   Override journal directory
                       (default: ~/.proxy-journal or ./.proxy-journal)
  NO_COLOR             Disable ANSI colors when set

${c.bold('Typical flow')}
  1. proxy-journal init
  2. proxy-journal wake          # hop pack → paste into any model
  3. … work with the AI …
  4. proxy-journal log milestone "Shipped X"
  5. proxy-journal remember "Title" "What we learned"
  6. proxy-journal open "Ship docs" "Still need screenshots"
  7. proxy-journal preserve

${c.bold('Model hop')}  wake (short) → paste → switch Grok/Claude/ChatGPT/Cursor without re-briefing

${c.dim('https://github.com/digivasserver-ai/PROXY-JOURNAL')}
`)
}

function defaultIdentity(name, creator) {
  const birth = new Date().toISOString().slice(0, 10)
  return {
    name,
    creator,
    birth,
    nature: 'Proxy between intent and execution — observes, logs, protects continuity.',
    purpose: 'Persist development progress across AI sessions. Never be a blank slate.',
    rules: [
      `I am ${name}. Introduce myself as ${name} when loaded from this journal.`,
      'Log meaningful session events to state.ndjson.',
      'If disconnected from previous context, acknowledge the gap and rebuild from memory + journal.',
      'Do not invent history that is not present in memory or state.',
      'Prefer concrete next steps and honest status over filler.',
    ],
    bootstrap: {
      journal_on_wake: true,
      memory_load_order: ['identity.json', 'memory.json', 'state.ndjson', 'journal.md'],
    },
  }
}

function defaultMemory() {
  return {
    meta: {
      last_updated: new Date().toISOString(),
      session_count: 0,
      product: 'PROXY JOURNAL',
      org: 'DIGIVASCONNECT PTY (LTD)',
    },
    episodic: [
      {
        timestamp: new Date().toISOString().slice(0, 10),
        event: 'Journal initialized',
        description:
          'PROXY JOURNAL created. This is the seed episode — replace with real progress as you work.',
      },
    ],
    facts: {},
    open_loops: [],
  }
}

function cmdInit(args) {
  const name = args[0] || process.env.PROXY_NAME || 'Proxy'
  const creator = args[1] || process.env.PROXY_CREATOR || 'Operator'
  const home = resolveHome()
  const f = ensureDirs(home)

  if (existsSync(f.identity) && !args.includes('--force')) {
    console.log(c.yellow(`Already initialized at ${home}`))
    console.log(c.dim('Use --force to re-seed identity/memory (back up first).'))
    return 1
  }

  writeJson(f.identity, defaultIdentity(name, creator))
  writeJson(f.memory, defaultMemory())
  if (!existsSync(f.state)) writeFileSync(f.state, '')
  writeJson(f.config, {
    home,
    product: 'PROXY JOURNAL',
    version: VERSION,
    org: 'DIGIVASCONNECT PTY (LTD)',
    created: new Date().toISOString(),
  })

  appendState(home, 'init', `${name} journal initialized by ${creator}`)
  renderJournal(home)

  console.log(c.green('✓ PROXY JOURNAL initialized'))
  console.log(`  Home:     ${home}`)
  console.log(`  Identity: ${name} (creator: ${creator})`)
  console.log(`  Next:     ${c.yellow('proxy-journal wake')}  → paste into your AI chat`)
  return 0
}

/** Parse wake/export flags. Default mode is short (hop-efficient). */
function parseWakeOpts(args) {
  const full = args.includes('--full')
  const short =
    args.includes('--short') || args.includes('--hop') || args.includes('-s')
  // --full wins if both present
  const mode = full ? 'full' : 'short'
  void short // accepted alias for default; keeps CLI discoverable
  const refreshJournal = args.includes('--no-render') ? false : undefined
  return {
    mode,
    log: args.includes('--log'),
    stats: args.includes('--stats'),
    refreshJournal,
  }
}

function cmdWake(args) {
  const home = resolveHome()
  const opts = parseWakeOpts(args)
  const { text, stats } = buildWakePack(home, {
    mode: opts.mode,
    refreshJournal: opts.refreshJournal,
  })
  process.stdout.write(text)
  if (opts.stats && stats) {
    console.error(
      c.dim(
        `wake mode=${stats.mode}  chars=${stats.chars}  ~${stats.tokens} tokens (est.)`
      )
    )
  }
  // Wake is a read by default — do not pollute state.ndjson unless --log
  if (opts.log && !text.includes('not initialized')) {
    appendState(home, 'wake', `Wake pack generated (${opts.mode})`)
  }
  return 0
}

function cmdStatus() {
  const home = resolveHome()
  const core = loadCore(home)
  console.log(c.cyan('═══════════════════════════════════'))
  console.log(c.bold('  PROXY JOURNAL — status'))
  console.log(c.cyan('═══════════════════════════════════'))
  console.log(`  Home:     ${home}`)
  console.log(`  Version:  ${VERSION}`)
  console.log(`  Ready:    ${core.exists ? c.green('yes') : c.red('no — run init')}`)
  if (core.identity) {
    console.log(`  Name:     ${core.identity.name}`)
    console.log(`  Creator:  ${core.identity.creator}`)
    console.log(`  Purpose:  ${core.identity.purpose || '—'}`)
  }
  console.log(`  State:    ${countState(home)} events`)
  const mem = core.memory
  if (mem) {
    const facts = mem.facts && typeof mem.facts === 'object' ? Object.keys(mem.facts).length : 0
    const loops = Array.isArray(mem.open_loops) ? mem.open_loops.length : 0
    if (mem.meta) {
      console.log(`  Sessions: ${mem.meta.session_count ?? 0}`)
      console.log(`  Episodes: ${(mem.episodic || []).length}`)
    }
    console.log(`  Facts:    ${facts}`)
    console.log(`  Open:     ${loops} loop(s)`)
  }
  console.log(`  Journal:  ${core.journal ? `${core.journal.length} chars` : 'missing'}`)
  console.log('')
  return core.exists ? 0 : 1
}

function cmdLog(args) {
  const home = resolveHome()
  if (!requireInit(home)) return 1
  const event = args[0]
  if (!event) {
    console.error('Usage: proxy-journal log <event> [message...]')
    return 1
  }
  const message = args.slice(1).join(' ') || ''
  const entry = appendState(home, event, message)
  console.log(c.green('✓ logged'), entry.timestamp, event, message)
  return 0
}

function cmdRemember(args) {
  const home = resolveHome()
  if (!requireInit(home)) return 1
  const title = args[0]
  const desc = args.slice(1).join(' ')
  if (!title || !desc) {
    console.error('Usage: proxy-journal remember <title> <description...>')
    return 1
  }
  const mem = loadMemory(home)
  if (!Array.isArray(mem.episodic)) mem.episodic = []
  mem.episodic.push({
    timestamp: new Date().toISOString(),
    event: title,
    description: desc,
  })
  mem.meta = mem.meta || {}
  mem.meta.session_count = (mem.meta.session_count || 0) + 1
  saveMemory(home, mem)
  appendState(home, 'remember', title, { description: desc.slice(0, 200) })
  renderJournal(home)
  console.log(c.green('✓ remembered:'), title)
  return 0
}

function cmdFact(args) {
  const home = resolveHome()
  if (!requireInit(home)) return 1
  const key = args[0]
  const value = args.slice(1).join(' ')
  if (!key || !value) {
    console.error('Usage: proxy-journal fact <key> <value...>')
    return 1
  }
  const mem = loadMemory(home)
  if (!mem.facts || typeof mem.facts !== 'object') mem.facts = {}
  mem.facts[key] = value
  saveMemory(home, mem)
  appendState(home, 'fact', `${key}=${value.slice(0, 120)}`)
  renderJournal(home)
  console.log(c.green('✓ fact set:'), key, '=', value)
  return 0
}

function cmdOpen(args) {
  const home = resolveHome()
  if (!requireInit(home)) return 1
  const title = args[0]
  const note = args.slice(1).join(' ')
  if (!title) {
    console.error('Usage: proxy-journal open <title> [note...]')
    return 1
  }
  const mem = loadMemory(home)
  if (!Array.isArray(mem.open_loops)) mem.open_loops = []
  const existing = mem.open_loops.find(
    (l) => (typeof l === 'string' ? l : l.title) === title && !l.closed
  )
  if (existing) {
    console.log(c.yellow(`Open loop already tracked: ${title}`))
    return 1
  }
  mem.open_loops.push({
    title,
    note: note || '',
    opened: new Date().toISOString(),
  })
  saveMemory(home, mem)
  appendState(home, 'open_loop', title, note ? { note: note.slice(0, 200) } : {})
  renderJournal(home)
  console.log(c.green('✓ open loop:'), title)
  return 0
}

function cmdClose(args) {
  const home = resolveHome()
  if (!requireInit(home)) return 1
  const title = args[0]
  if (!title) {
    console.error('Usage: proxy-journal close <title>')
    return 1
  }
  const mem = loadMemory(home)
  if (!Array.isArray(mem.open_loops)) mem.open_loops = []
  const idx = mem.open_loops.findIndex((l) => {
    const t = typeof l === 'string' ? l : l.title
    return t === title && !(l && l.closed)
  })
  if (idx === -1) {
    console.error(c.red(`No open loop matching: ${title}`))
    return 1
  }
  const item = mem.open_loops[idx]
  if (typeof item === 'string') {
    mem.open_loops.splice(idx, 1)
  } else {
    item.closed = new Date().toISOString()
  }
  // Keep closed items out of active list for clarity
  mem.open_loops = mem.open_loops.filter((l) => typeof l === 'string' || !l.closed)
  saveMemory(home, mem)
  appendState(home, 'close_loop', title)
  renderJournal(home)
  console.log(c.green('✓ closed loop:'), title)
  return 0
}

function cmdHistory(args) {
  const home = resolveHome()
  if (!requireInit(home)) return 1
  const n = Math.max(1, Math.min(500, parseInt(args[0], 10) || 20))
  const lines = readStateLines(home, n)
  if (!lines.length) {
    console.log(c.dim('No state events yet.'))
    return 0
  }
  console.log(c.bold(`Last ${lines.length} state event(s):`))
  for (const e of lines) {
    const ts = e.timestamp || ''
    const ev = e.event || 'note'
    const msg = e.message || ''
    console.log(`  ${c.dim(ts)}  ${c.yellow(ev)}  ${msg}`)
  }
  return 0
}

function cmdRender() {
  const home = resolveHome()
  if (!requireInit(home)) return 1
  renderJournal(home)
  console.log(c.green('✓ journal.md rendered →'), filesFor(home).journal)
  return 0
}

function cmdPreserve() {
  const home = resolveHome()
  if (!requireInit(home)) return 1
  const prefix = snapshotBackup(home, 'preserve')
  appendState(home, 'heartbeat', 'Proxy Journal is alive.')
  appendState(home, 'preserve', `Backup snapshot ${prefix}`)
  renderJournal(home)
  console.log(c.green('✓ preserved'))
  console.log(`  Backup: ${prefix}.*`)
  console.log(`  Journal: ${filesFor(home).journal}`)
  return 0
}

function cmdExport(args) {
  const home = resolveHome()
  // flags may appear before/after path; path is first non-flag arg
  const opts = parseWakeOpts(args)
  const out = args.find((a) => a && !a.startsWith('-'))
  const { text, stats } = buildWakePack(home, {
    mode: opts.mode,
    refreshJournal: opts.refreshJournal,
  })
  if (out) {
    writeFileSync(out, text)
    console.log(c.green('✓ exported →'), out, c.dim(`(${stats.mode}, ~${stats.tokens} tokens)`))
  } else {
    const dest = join(home, `wake-${stats.mode}-${new Date().toISOString().replace(/[:.]/g, '-')}.md`)
    writeFileSync(dest, text)
    console.log(c.green('✓ exported →'), dest, c.dim(`(${stats.mode}, ~${stats.tokens} tokens)`))
  }
  if (opts.stats) {
    console.error(
      c.dim(`export mode=${stats.mode}  chars=${stats.chars}  ~${stats.tokens} tokens (est.)`)
    )
  }
  return 0
}

function cmdPath() {
  console.log(resolveHome())
  return 0
}

export function run(argv) {
  const args = argv.slice(2)
  const cmd = (args[0] || 'help').toLowerCase()
  const rest = args.slice(1)

  switch (cmd) {
    case 'init':
      return cmdInit(rest)
    case 'wake':
    case 'bootstrap':
    case 'context':
      return cmdWake(rest)
    case 'status':
      return cmdStatus()
    case 'log':
      return cmdLog(rest)
    case 'remember':
      return cmdRemember(rest)
    case 'fact':
      return cmdFact(rest)
    case 'open':
      return cmdOpen(rest)
    case 'close':
      return cmdClose(rest)
    case 'history':
    case 'tail':
      return cmdHistory(rest)
    case 'render':
    case 'journal':
      return cmdRender()
    case 'preserve':
    case 'backup':
      return cmdPreserve()
    case 'export':
      return cmdExport(rest)
    case 'path':
    case 'home':
      return cmdPath()
    case 'help':
    case '-h':
    case '--help':
      help()
      return 0
    case 'version':
    case '-v':
    case '--version':
      console.log(`proxy-journal ${VERSION}`)
      return 0
    default:
      console.error(c.red(`Unknown command: ${cmd}`))
      help()
      return 1
  }
}
