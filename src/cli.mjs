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
import {
  initDatabase,
  isInitialized as dbReady,
  migrateFromFiles,
  getStats,
  logSecurityEvent,
  searchAll,
  queryStateEvents,
  queryAuditLog,
  querySecurityEvents,
  getTableCounts,
  exportTableJSON,
  exportTableCSV,
  backupDatabase,
} from './sqlite-store.mjs'
import {
  recordIntegrity,
  fullIntegrityCheck,
  generateFingerprint,
  verifyFingerprint,
} from './integrity.mjs'
import {
  auditLog,
  getAuditLog,
  detectSuspicious,
  auditSummary,
} from './audit.mjs'
import {
  scanText,
  scanWakePack,
  securityReport,
  buildSecureWakePack,
} from './security.mjs'

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
  ${c.yellow('preserve')}                 Snapshot backup + render + heartbeat + integrity hash
  ${c.yellow('export')} [file]            Write wake pack to a file
  ${c.yellow('path')}                     Print journal home

${c.bold('Security')}
  ${c.yellow('verify')}                   Verify file integrity hash chain
  ${c.yellow('secure-wake')}              Generate wake pack with security scan + fingerprint
  ${c.yellow('scan')} [file]              Scan file for prompt injection patterns
  ${c.yellow('audit')} [n]                Show audit log (last n entries)
  ${c.yellow('audit --suspicious')}       Detect anomalies in audit log
  ${c.yellow('migrate')}                  Import JSON/NDJSON files into SQLite

${c.bold('Query & Export')}
  ${c.yellow('search')} <term>            Search across all tables for a term
  ${c.yellow('query')} <table> [opts]     Query a table (state_events, audit_log, security_events)
  ${c.yellow('counts')}                   Show row counts for all tables
  ${c.yellow('export-db')} <table> [file] Export table to JSON or CSV (.json/.csv extension)
  ${c.yellow('backup-db')}               Backup SQLite database with rotation

${c.bold('Other')}
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

  // Initialize SQLite database and record integrity hashes
  initDatabase(home)
  if (dbReady(home)) {
    recordIntegrity(home)
  }

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
  const sqliteReady = dbReady(home)
  console.log(c.cyan('═══════════════════════════════════'))
  console.log(c.bold('  PROXY JOURNAL — status'))
  console.log(c.cyan('═══════════════════════════════════'))
  console.log(`  Home:     ${home}`)
  console.log(`  Version:  ${VERSION}`)
  console.log(`  Ready:    ${core.exists ? c.green('yes') : c.red('no — run init')}`)
  console.log(`  SQLite:   ${sqliteReady ? c.green('active') : c.yellow('not migrated')}`)
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
  if (sqliteReady) {
    const stats = getStats(home)
    console.log(`  DB:       ${stats.identity} identity / ${stats.memory} memory / ${stats.audit_log} audit / ${stats.security_events} security`)
  }
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

  // Record integrity hashes after preserve
  if (dbReady(home)) {
    const { recorded } = recordIntegrity(home)
    auditLog(home, 'preserve', [], 'ok', `backup=${prefix} hashes=${recorded}`)
  }

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

// ── Security commands ──

function cmdVerify() {
  const home = resolveHome()
  if (!requireInit(home)) return 1

  console.log(c.cyan('═══════════════════════════════════'))
  console.log(c.bold('  PROXY JOURNAL — integrity verify'))
  console.log(c.cyan('═══════════════════════════════════'))

  const report = fullIntegrityCheck(home)

  for (const r of report.results) {
    const icon =
      r.status === 'ok' ? c.green('✓') :
      r.status === 'tampered' ? c.red('✗ TAMPERED') :
      r.status === 'chain-broken' ? c.red('✗ CHAIN BROKEN') :
      r.status === 'missing' ? c.yellow('? MISSING') :
      c.yellow('? UNTRACKED')
    console.log(`  ${icon}  ${r.file}`)
    if (r.currentHash) {
      console.log(`       hash: ${r.currentHash.slice(0, 16)}...`)
    }
    if (r.lastRecordedHash && r.status !== 'ok') {
      console.log(`       expected: ${r.lastRecordedHash.slice(0, 16)}...`)
    }
  }

  console.log('')
  if (report.allGood) {
    console.log(c.green('  All files verified. Integrity intact.'))
  } else {
    console.log(c.red('  Integrity issues detected!'))
    console.log(c.dim('  Run proxy-journal preserve to record current state.'))
  }

  if (report.fingerprint) {
    console.log(c.dim(`  Fingerprint: ${report.fingerprint}`))
  }

  auditLog(home, 'verify', [], report.allGood ? 'ok' : 'warning', `allGood=${report.allGood}`)
  return report.allGood ? 0 : 1
}

function cmdSecureWake(args) {
  const home = resolveHome()
  if (!requireInit(home)) return 1

  const opts = parseWakeOpts(args)
  const { text } = buildWakePack(home, {
    mode: opts.mode,
    refreshJournal: opts.refreshJournal,
  })

  const { text: secureText, scan, fingerprint } = buildSecureWakePack(home, text)

  process.stdout.write(secureText)

  if (opts.stats) {
    console.error(c.dim(`secure-wake  mode=${opts.mode}  chars=${secureText.length}  ~${Math.ceil(secureText.length / 4)} tokens (est.)`))
    if (scan.stats.total > 0) {
      console.error(c.yellow(`  ⚠ ${scan.stats.total} pattern(s) detected: ${scan.findings.map((f) => f.category).join(', ')}`))
    } else {
      console.error(c.green('  ✓ Scan clean — no injection patterns detected'))
    }
  }

  auditLog(home, 'secure-wake', args, scan.clean ? 'ok' : 'warning',
    `fingerprint=${fingerprint?.slice(0, 16) || 'none'} findings=${scan.stats.total}`)
  return 0
}

function cmdScan(args) {
  const home = resolveHome()

  // If a file path is given, scan that file
  if (args[0] && !args[0].startsWith('-')) {
    const filePath = args[0]
    if (!existsSync(filePath)) {
      console.error(c.red(`File not found: ${filePath}`))
      return 1
    }
    try {
      const content = readFileSync(filePath, 'utf8')
      const result = scanText(content)

      console.log(c.cyan(`═══ Scan: ${filePath} ═══`))
      if (result.clean) {
        console.log(c.green('✓ Clean — no injection patterns detected'))
      } else {
        console.log(c.red(`⚠ ${result.stats.total} pattern(s) detected:`))
        for (const f of result.findings) {
          console.log(`  ${f.severity === 'critical' ? c.red('●') : f.severity === 'high' ? c.yellow('●') : c.dim('●')} [${f.severity}] ${f.description}`)
          console.log(`    match: ${c.dim(f.match)}`)
        }
      }
      auditLog(home, 'scan', [filePath], result.clean ? 'ok' : 'warning', `findings=${result.stats.total}`)
      return result.clean ? 0 : 1
    } catch (e) {
      console.error(c.red(`Read error: ${e.message}`))
      return 1
    }
  }

  // No file — scan the full journal
  if (!requireInit(home)) return 1

  console.log(c.cyan('═══════════════════════════════════'))
  console.log(c.bold('  PROXY JOURNAL — security scan'))
  console.log(c.cyan('═══════════════════════════════════'))

  const report = securityReport(home)

  for (const [fileType, result] of Object.entries(report.files)) {
    const icon = result.clean ? c.green('✓') : c.red('⚠')
    console.log(`  ${icon}  ${fileType}: ${result.findings.length} finding(s)`)
    for (const f of result.findings) {
      console.log(`      [${f.severity}] ${f.description}: ${c.dim(f.match)}`)
    }
  }

  console.log('')
  if (report.overallClean) {
    console.log(c.green('  All clean — no injection patterns detected'))
  } else {
    console.log(c.red(`  ${report.totalFindings} finding(s) across journal files`))
  }

  auditLog(home, 'scan', [], report.overallClean ? 'ok' : 'warning', `findings=${report.totalFindings}`)
  return report.overallClean ? 0 : 1
}

function cmdAudit(args) {
  const home = resolveHome()
  if (!dbReady(home)) {
    console.error(c.red('SQLite database not initialized. Run: proxy-journal migrate'))
    return 1
  }

  if (args.includes('--suspicious') || args.includes('-s')) {
    console.log(c.cyan('═══════════════════════════════════'))
    console.log(c.bold('  PROXY JOURNAL — suspicious activity'))
    console.log(c.cyan('═══════════════════════════════════'))

    const result = detectSuspicious(home)
    if (!result.suspicious) {
      console.log(c.green('  No suspicious activity detected'))
      console.log(c.dim(`  Analyzed ${result.totalAnalyzed} entries`))
    } else {
      console.log(c.red(`  ${result.entries.length} suspicious entry/entries found:`))
      for (const e of result.entries) {
        const sev = e.severity === 'critical' ? c.red('CRIT') : e.severity === 'warning' ? c.yellow('WARN') : c.dim('INFO')
        console.log(`  [${sev}] ${e.timestamp}  ${e.command}  ${e.reason}`)
      }
    }
    return result.suspicious ? 1 : 0
  }

  if (args.includes('--summary')) {
    const summary = auditSummary(home)
    if (!summary) {
      console.error(c.red('No audit data available'))
      return 1
    }
    console.log(c.cyan('═══════════════════════════════════'))
    console.log(c.bold('  PROXY JOURNAL — audit summary'))
    console.log(c.cyan('═══════════════════════════════════'))
    console.log(`  Total entries:  ${summary.total}`)
    console.log(`  Last 24h:       ${summary.last24h}`)
    console.log('')
    console.log(c.bold('  By command:'))
    for (const r of summary.byCommand) {
      console.log(`    ${c.yellow(r.command.padEnd(16))} ${r.count}`)
    }
    console.log('')
    console.log(c.bold('  By result:'))
    for (const r of summary.byResult) {
      console.log(`    ${r.result.padEnd(16)} ${r.count}`)
    }
    return 0
  }

  // Default: show last N entries
  const n = Math.max(1, Math.min(500, parseInt(args[0], 10) || 20))
  const entries = getAuditLog(home, n)

  console.log(c.cyan('═══════════════════════════════════'))
  console.log(c.bold(`  PROXY JOURNAL — audit log (last ${entries.length})`))
  console.log(c.cyan('═══════════════════════════════════'))

  if (!entries.length) {
    console.log(c.dim('  No audit entries yet'))
    return 0
  }

  for (const e of entries) {
    const icon = e.result === 'ok' ? c.green('·') : e.result === 'error' ? c.red('✗') : c.yellow('!')
    console.log(`  ${icon} ${c.dim(e.timestamp)}  ${c.yellow(e.command.padEnd(16))} ${e.hostname || '?'}  [${e.result}]`)
    if (e.details) console.log(`    ${c.dim(e.details)}`)
  }
  return 0
}

function cmdMigrate() {
  const home = resolveHome()
  if (!requireInit(home)) return 1

  console.log(c.cyan('═══════════════════════════════════'))
  console.log(c.bold('  PROXY JOURNAL — migrate to SQLite'))
  console.log(c.cyan('═══════════════════════════════════'))

  // Initialize database
  console.log(c.dim('  Initializing SQLite database...'))
  initDatabase(home)

  if (!dbReady(home)) {
    console.error(c.red('  Failed to initialize SQLite database'))
    console.error(c.dim('  Is sqlite3 CLI installed? (apt install sqlite3)'))
    return 1
  }

  console.log(c.green('  ✓ Database initialized'))

  // Migrate data
  console.log(c.dim('  Migrating files to SQLite...'))
  const count = migrateFromFiles(home, filesFor, readJson, readStateLines)
  console.log(c.green(`  ✓ Migrated ${count} records`))

  // Record initial integrity hashes
  console.log(c.dim('  Recording integrity hashes...'))
  const { recorded } = recordIntegrity(home)
  console.log(c.green(`  ✓ Recorded ${recorded} file hashes`))

  // Log the migration
  auditLog(home, 'migrate', [], 'ok', `migrated=${count} records, ${recorded} hashes`)
  logSecurityEvent(home, 'migration_complete', 'info', `Migrated ${count} records to SQLite`, 'cli.mjs')

  console.log('')
  console.log(c.green('  Migration complete. SQLite is now active.'))
  console.log(c.dim('  Original JSON/NDJSON files are preserved.'))
  return 0
}

// ── Query & Export commands (v1.3.0) ──

function cmdSearch(args) {
  const home = resolveHome()
  if (!dbReady(home)) {
    console.error(c.red('SQLite not initialized. Run: proxy-journal migrate'))
    return 1
  }
  const term = args.join(' ')
  if (!term) {
    console.error('Usage: proxy-journal search <term>')
    return 1
  }

  console.log(c.cyan(`═══ Search: "${term}" ═══`))
  const results = searchAll(home, term)
  let total = 0

  for (const [table, rows] of Object.entries(results)) {
    if (rows.length > 0) {
      console.log(`\n  ${c.bold(table)} (${rows.length} result${rows.length > 1 ? 's' : ''}):`)
      for (const row of rows.slice(0, 10)) {
        const preview = Object.values(row).join(' | ').slice(0, 100)
        console.log(`    ${c.dim(preview)}`)
      }
      if (rows.length > 10) console.log(`    ${c.dim(`... and ${rows.length - 10} more`)}`)
      total += rows.length
    }
  }

  if (total === 0) console.log(c.dim('  No results found.'))
  else console.log(`\n  ${c.green(`${total} total result${total > 1 ? 's' : ''}`)}`)

  auditLog(home, 'search', [term], 'ok', `results=${total}`)
  return 0
}

function cmdQuery(args) {
  const home = resolveHome()
  if (!dbReady(home)) {
    console.error(c.red('SQLite not initialized. Run: proxy-journal migrate'))
    return 1
  }

  const table = args[0]
  if (!table) {
    console.error('Usage: proxy-journal query <table> [--since DATE] [--until DATE] [--event TYPE] [--limit N]')
    console.error('Tables: state_events, audit_log, security_events, identity, memory, integrity_hashes')
    return 1
  }

  // Parse flags
  const opts = {}
  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--since' && args[i + 1]) opts.since = args[++i]
    else if (args[i] === '--until' && args[i + 1]) opts.until = args[++i]
    else if (args[i] === '--event' && args[i + 1]) opts.event = args[++i]
    else if (args[i] === '--command' && args[i + 1]) opts.command = args[++i]
    else if (args[i] === '--result' && args[i + 1]) opts.result = args[++i]
    else if (args[i] === '--severity' && args[i + 1]) opts.severity = args[++i]
    else if (args[i] === '--type' && args[i + 1]) opts.eventType = args[++i]
    else if (args[i] === '--limit' && args[i + 1]) opts.limit = parseInt(args[++i], 10)
  }

  let rows
  if (table === 'state_events') rows = queryStateEvents(home, opts)
  else if (table === 'audit_log') rows = queryAuditLog(home, opts)
  else if (table === 'security_events') rows = querySecurityEvents(home, opts)
  else {
    console.error(c.red(`Query supports: state_events, audit_log, security_events`))
    return 1
  }

  console.log(c.cyan(`═══ ${table} (${rows.length} rows) ═══`))
  for (const row of rows) {
    const ts = row.timestamp || ''
    const summary = Object.entries(row)
      .filter(([k]) => k !== 'timestamp' && k !== 'extra')
      .map(([k, v]) => `${k}=${v}`)
      .join('  ')
    console.log(`  ${c.dim(ts)}  ${summary}`)
  }
  return 0
}

function cmdCounts() {
  const home = resolveHome()
  if (!dbReady(home)) {
    console.error(c.red('SQLite not initialized. Run: proxy-journal migrate'))
    return 1
  }

  console.log(c.cyan('═══════════════════════════════════'))
  console.log(c.bold('  PROXY JOURNAL — table counts'))
  console.log(c.cyan('═══════════════════════════════════'))

  const counts = getTableCounts(home)
  let total = 0
  for (const [table, count] of Object.entries(counts)) {
    console.log(`  ${c.yellow(table.padEnd(20))} ${count}`)
    total += count
  }
  console.log(`  ${'─'.repeat(30)}`)
  console.log(`  ${c.bold('total'.padEnd(20))} ${total}`)
  return 0
}

function cmdExportDb(args) {
  const home = resolveHome()
  if (!dbReady(home)) {
    console.error(c.red('SQLite not initialized. Run: proxy-journal migrate'))
    return 1
  }

  const table = args[0]
  const outFile = args[1]
  if (!table) {
    console.error('Usage: proxy-journal export-db <table> [output-file]')
    console.error('Tables: identity, memory, state_events, audit_log, integrity_hashes, security_events')
    return 1
  }

  // Determine format from extension or default to JSON
  const isCSV = outFile && outFile.endsWith('.csv')
  const data = isCSV ? exportTableCSV(home, table) : exportTableJSON(home, table)

  if (data === null) {
    console.error(c.red(`Invalid table: ${table}`))
    return 1
  }

  if (outFile) {
    writeFileSync(outFile, data)
    console.log(c.green(`✓ Exported ${table} → ${outFile}`))
    console.log(c.dim(`  ${isCSV ? 'CSV' : 'JSON'} format`))
  } else {
    process.stdout.write(data + '\n')
  }

  auditLog(home, 'export-db', [table, outFile || 'stdout'], 'ok', `format=${isCSV ? 'csv' : 'json'}`)
  return 0
}

function cmdBackupDb() {
  const home = resolveHome()
  if (!dbReady(home)) {
    console.error(c.red('SQLite not initialized. Run: proxy-journal migrate'))
    return 1
  }

  console.log(c.cyan('═══════════════════════════════════'))
  console.log(c.bold('  PROXY JOURNAL — database backup'))
  console.log(c.cyan('═══════════════════════════════════'))

  const dest = backupDatabase(home, 5)
  if (dest) {
    console.log(c.green(`✓ Backup created: ${dest}`))
    console.log(c.dim('  Rotation: keeping last 5 backups'))
  } else {
    console.error(c.red('  No database found to backup'))
    return 1
  }

  auditLog(home, 'backup-db', [], 'ok', `dest=${dest}`)
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
    case 'verify':
      return cmdVerify()
    case 'secure-wake':
      return cmdSecureWake(rest)
    case 'scan':
      return cmdScan(rest)
    case 'audit':
      return cmdAudit(rest)
    case 'migrate':
      return cmdMigrate()
    case 'search':
      return cmdSearch(rest)
    case 'query':
      return cmdQuery(rest)
    case 'counts':
      return cmdCounts()
    case 'export-db':
      return cmdExportDb(rest)
    case 'backup-db':
      return cmdBackupDb()
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
