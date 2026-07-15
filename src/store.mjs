import {
  readFileSync,
  writeFileSync,
  appendFileSync,
  existsSync,
  mkdirSync,
  copyFileSync,
} from 'fs'
import { join } from 'path'
import { execSync } from 'child_process'
import { filesFor } from './paths.mjs'

export function readJson(path, fallback = null) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch {
    return fallback
  }
}

export function writeJson(path, data) {
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n', { mode: 0o600 })
}

export function readText(path, fallback = '') {
  try {
    return readFileSync(path, 'utf8')
  } catch {
    return fallback
  }
}

export function appendState(home, event, message = '', extra = {}) {
  const { state } = filesFor(home)
  const entry = {
    timestamp: new Date().toISOString(),
    event,
    message,
    ...extra,
  }
  appendFileSync(state, JSON.stringify(entry) + '\n')

  // Dual-write to SQLite if database exists
  const dbPath = join(home, 'proxy-journal.db')
  if (existsSync(dbPath)) {
    try {
      const esc = (s) => String(s || '').replace(/'/g, "''")
      const extraJson = Object.keys(extra).length ? JSON.stringify(extra) : null
      const sql = `INSERT INTO state_events (timestamp, event, message, extra) VALUES ('${esc(entry.timestamp)}', '${esc(event)}', '${esc(message)}', ${extraJson ? `'${esc(extraJson)}'` : 'NULL'})`
      execSync(`sqlite3 "${dbPath}" "${sql.replace(/"/g, '\\"')}"`, { encoding: 'utf8', timeout: 3000 })
    } catch { /* SQLite write is best-effort */ }
  }

  return entry
}

export function readStateLines(home, limit = 50) {
  const { state } = filesFor(home)
  const raw = readText(state, '')
  const lines = raw.split('\n').filter(Boolean)
  return lines.slice(-limit).map((line) => {
    try {
      return JSON.parse(line)
    } catch {
      return { raw: line }
    }
  })
}

export function countState(home) {
  const { state } = filesFor(home)
  const raw = readText(state, '')
  return raw.split('\n').filter(Boolean).length
}

export function ensureDirs(home) {
  const f = filesFor(home)
  mkdirSync(f.home, { recursive: true })
  mkdirSync(f.backupDir, { recursive: true })
  mkdirSync(f.sessionsDir, { recursive: true })
  return f
}

export function loadCore(home) {
  const f = filesFor(home)
  return {
    files: f,
    identity: readJson(f.identity, null),
    memory: readJson(f.memory, null),
    journal: readText(f.journal, ''),
    stateCount: countState(home),
    recent: readStateLines(home, 30),
    exists: existsSync(f.identity),
  }
}

export function snapshotBackup(home, tag = 'manual') {
  const f = filesFor(home)
  ensureDirs(home)
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const prefix = join(f.backupDir, `${stamp}_${tag}`)
  for (const key of ['identity', 'memory', 'state', 'journal']) {
    const src = f[key]
    if (existsSync(src)) {
      const ext = src.endsWith('.md') ? 'md' : src.endsWith('.ndjson') ? 'ndjson' : 'json'
      copyFileSync(src, `${prefix}.${key}.${ext}`)
    }
  }
  return prefix
}
