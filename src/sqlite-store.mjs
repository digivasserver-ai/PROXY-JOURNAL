/**
 * sqlite-store.mjs — SQLite storage adapter for PROXY JOURNAL
 *
 * Provides a structured query layer over the journal data.
 * Dual-writes to both SQLite and the existing NDJSON/JSON files
 * for backward compatibility.
 *
 * Requires: sqlite3 CLI (no npm dependencies)
 * Created: 2026-07-15 · DIGIVASCONNECT PTY (LTD)
 */

import { execSync } from 'child_process'
import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'

const SQLITE3 = 'sqlite3'

/** Whitelist of allowed table names for aggregate queries. */
const ALLOWED_TABLES = new Set([
  'identity', 'memory', 'state_events',
  'audit_log', 'integrity_hashes', 'security_events',
])

/**
 * Escape a value for safe use in SQL string literals.
 * Handles single quotes and backslashes.
 */
function esc(s) {
  return String(s || '').replace(/\\/g, '\\\\').replace(/'/g, "''")
}

/**
 * Resolve the path to the journal's SQLite database.
 */
export function dbPath(home) {
  return join(home, 'proxy-journal.db')
}

/**
 * Execute a SQL query and return JSON results.
 * Uses sqlite3 CLI with -json output mode.
 */
export function query(home, sql) {
  const db = dbPath(home)
  if (!existsSync(db)) return []
  try {
    const escaped = sql.replace(/"/g, '\\"')
    const result = execSync(`${SQLITE3} -json "${db}" "${escaped}"`, {
      encoding: 'utf8',
      timeout: 5000,
    })
    return JSON.parse(result || '[]')
  } catch {
    return []
  }
}

/**
 * Execute a SQL statement (INSERT, UPDATE, CREATE, etc.).
 * Returns the number of affected rows when applicable.
 */
export function execute(home, sql) {
  const db = dbPath(home)
  if (!existsSync(db)) return 0
  try {
    const escaped = sql.replace(/"/g, '\\"')
    execSync(`${SQLITE3} "${db}" "${escaped}"`, {
      encoding: 'utf8',
      timeout: 5000,
    })
    return 1
  } catch {
    return 0
  }
}

/**
 * Execute multiple SQL statements (for schema creation).
 */
export function execMulti(home, sql) {
  const db = dbPath(home)
  try {
    const escaped = sql.replace(/"/g, '\\"')
    execSync(`${SQLITE3} "${db}" "${escaped}"`, {
      encoding: 'utf8',
      timeout: 10000,
    })
    return true
  } catch {
    return false
  }
}

/**
 * Initialize the SQLite database schema.
 * Safe to call multiple times (uses IF NOT EXISTS).
 */
export function initDatabase(home) {
  const dir = home
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })

  const schema = `
    CREATE TABLE IF NOT EXISTS identity (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS memory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      context TEXT,
      confidence REAL DEFAULT 1.0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      accessed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(category, key)
    );

    CREATE TABLE IF NOT EXISTS state_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      event TEXT NOT NULL,
      message TEXT,
      extra TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      command TEXT NOT NULL,
      args_hash TEXT,
      hostname TEXT,
      result TEXT DEFAULT 'ok',
      details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS integrity_hashes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      file TEXT NOT NULL,
      hash TEXT NOT NULL,
      previous_hash TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS security_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      event_type TEXT NOT NULL,
      severity TEXT DEFAULT 'info',
      details TEXT,
      source TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_state_timestamp ON state_events(timestamp);
    CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_log(timestamp);
    CREATE INDEX IF NOT EXISTS idx_integrity_file ON integrity_hashes(file);
    CREATE INDEX IF NOT EXISTS idx_security_type ON security_events(event_type);
  `

  return execMulti(home, schema)
}

/**
 * Check if the database exists and has the required tables.
 */
export function isInitialized(home) {
  const db = dbPath(home)
  if (!existsSync(db)) return false
  const tables = query(home, "SELECT name FROM sqlite_master WHERE type='table'")
  const names = tables.map((t) => t.name)
  return names.includes('identity') && names.includes('state_events')
}

// ── Identity operations ──

export function setIdentity(home, key, value) {
  return execute(
    home,
    `INSERT OR REPLACE INTO identity (key, value, updated_at) VALUES ('${esc(key)}', '${esc(value)}', datetime('now'))`
  )
}

export function getIdentity(home, key) {
  const rows = query(home, `SELECT value FROM identity WHERE key = '${esc(key)}'`)
  return rows.length ? rows[0].value : null
}

export function getAllIdentity(home) {
  return query(home, 'SELECT key, value FROM identity')
}

// ── Memory operations ──

export function setMemory(home, category, key, value, context = null) {
  const ctx = context ? `'${esc(context)}'` : 'NULL'
  return execute(
    home,
    `INSERT OR REPLACE INTO memory (category, key, value, context, accessed_at)
     VALUES ('${esc(category)}', '${esc(key)}', '${esc(value)}', ${ctx}, datetime('now'))`
  )
}

export function getMemory(home, category, key) {
  const rows = query(
    home,
    `SELECT value, context FROM memory WHERE category = '${esc(category)}' AND key = '${esc(key)}'`
  )
  return rows.length ? rows[0] : null
}

export function getMemoryByCategory(home, category) {
  return query(home, `SELECT key, value, context, created_at FROM memory WHERE category = '${esc(category)}' ORDER BY created_at DESC`)
}

export function searchMemory(home, term) {
  const escaped = esc(term)
  // Escape LIKE wildcards to prevent injection via %
  const safeTerm = escaped.replace(/%/g, '\\%').replace(/_/g, '\\_')
  return query(
    home,
    `SELECT category, key, value, context FROM memory WHERE value LIKE '%${safeTerm}%' OR key LIKE '%${safeTerm}%' ORDER BY created_at DESC`
  )
}

// ── State event operations ──

export function appendStateEvent(home, timestamp, event, message = '', extra = null) {
  const extraJson = extra ? `'${esc(JSON.stringify(extra))}'` : 'NULL'
  return execute(
    home,
    `INSERT INTO state_events (timestamp, event, message, extra)
     VALUES ('${esc(timestamp)}', '${esc(event)}', '${esc(message)}', ${extraJson})`
  )
}

export function getStateEvents(home, limit = 50) {
  const safeLimit = Math.max(1, Math.min(10000, Number(limit) || 50))
  return query(
    home,
    `SELECT timestamp, event, message, extra FROM state_events ORDER BY id DESC LIMIT ${safeLimit}`
  )
}

export function countStateEvents(home) {
  const rows = query(home, 'SELECT COUNT(*) as c FROM state_events')
  return rows.length ? rows[0].c : 0
}

// ── Security event operations ──

export function logSecurityEvent(home, eventType, severity, details, source = null) {
  const src = source ? `'${esc(source)}'` : 'NULL'
  return execute(
    home,
    `INSERT INTO security_events (timestamp, event_type, severity, details, source)
     VALUES (datetime('now'), '${esc(eventType)}', '${esc(severity)}', '${esc(details)}', ${src})`
  )
}

export function getSecurityEvents(home, limit = 50) {
  return query(
    home,
    `SELECT timestamp, event_type, severity, details, source FROM security_events ORDER BY id DESC LIMIT ${limit}`
  )
}

// ── Integrity hash operations ──

export function recordIntegrityHash(home, file, hash, previousHash = null) {
  const prev = previousHash ? `'${esc(previousHash)}'` : 'NULL'
  return execute(
    home,
    `INSERT INTO integrity_hashes (timestamp, file, hash, previous_hash)
     VALUES (datetime('now'), '${esc(file)}', '${esc(hash)}', ${prev})`
  )
}

export function getLatestHash(home, file) {
  const rows = query(
    home,
    `SELECT hash, timestamp FROM integrity_hashes WHERE file = '${esc(file)}' ORDER BY id DESC LIMIT 1`
  )
  return rows.length ? rows[0] : null
}

export function getHashChain(home, file, limit = 20) {
  const safeLimit = Math.max(1, Math.min(10000, Number(limit) || 20))
  return query(
    home,
    `SELECT hash, previous_hash, timestamp FROM integrity_hashes WHERE file = '${esc(file)}' ORDER BY id DESC LIMIT ${safeLimit}`
  )
}

// ── Dashboard / aggregate queries ──

export function getStats(home) {
  const count = (table) => {
    if (!ALLOWED_TABLES.has(table)) return 0
    const rows = query(home, `SELECT COUNT(*) as c FROM ${table}`)
    return rows.length ? rows[0].c : 0
  }
  return {
    identity: count('identity'),
    memory: count('memory'),
    state_events: count('state_events'),
    audit_log: count('audit_log'),
    integrity_hashes: count('integrity_hashes'),
    security_events: count('security_events'),
  }
}

/**
 * Migrate existing JSON/NDJSON files into SQLite.
 * Call after initDatabase(). Non-destructive to source files.
 */
export function migrateFromFiles(home, filesFor, readJson, readStateLines) {
  let migrated = 0

  // Identity
  const idPath = filesFor(home).identity
  if (existsSync(idPath)) {
    const id = readJson(idPath, {})
    for (const [k, v] of Object.entries(id)) {
      if (typeof v === 'string' || typeof v === 'number') {
        setIdentity(home, k, String(v))
        migrated++
      } else if (Array.isArray(v)) {
        setIdentity(home, k, JSON.stringify(v))
        migrated++
      }
    }
  }

  // Memory
  const memPath = filesFor(home).memory
  if (existsSync(memPath)) {
    const mem = readJson(memPath, {})
    if (mem.episodic && Array.isArray(mem.episodic)) {
      for (const ep of mem.episodic) {
        setMemory(home, 'episodic', ep.event || 'unknown', ep.description || '', ep.timestamp)
        migrated++
      }
    }
    if (mem.facts && typeof mem.facts === 'object') {
      for (const [k, v] of Object.entries(mem.facts)) {
        setMemory(home, 'fact', k, String(v))
        migrated++
      }
    }
    if (mem.open_loops && Array.isArray(mem.open_loops)) {
      for (const loop of mem.open_loops) {
        const title = typeof loop === 'string' ? loop : loop.title || 'unknown'
        const note = typeof loop === 'string' ? '' : loop.note || ''
        setMemory(home, 'open_loop', title, note, loop.opened)
        migrated++
      }
    }
  }

  // State events
  const events = readStateLines(home, 10000)
  for (const ev of events) {
    appendStateEvent(home, ev.timestamp || '', ev.event || 'note', ev.message || '', ev)
    migrated++
  }

  return migrated
}
