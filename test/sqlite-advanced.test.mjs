/**
 * sqlite-advanced.test.mjs — Tests for v1.3.0 query/export/backup features
 * PROXY JOURNAL v1.3.0 · DIGIVASCONNECT PTY (LTD)
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { writeFileSync, mkdirSync, rmSync, existsSync, readdirSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import {
  initDatabase,
  isInitialized,
  setIdentity,
  setMemory,
  appendStateEvent,
  logSecurityEvent,
  recordIntegrityHash,
  searchAll,
  queryStateEvents,
  queryAuditLog,
  querySecurityEvents,
  getTableCounts,
  exportTableJSON,
  exportTableCSV,
  backupDatabase,
  dbPath,
  execute,
} from '../src/sqlite-store.mjs'

function makeTestHome() {
  const dir = join(tmpdir(), `proxy-journal-test-adv-${Date.now()}-${Math.random().toString(36).slice(2)}`)
  mkdirSync(dir, { recursive: true })
  initDatabase(dir)
  return dir
}

// ── searchAll ──

describe('searchAll — cross-table search', () => {
  it('finds matching content across tables', () => {
    const home = makeTestHome()
    setIdentity(home, 'name', 'Proxy-Test')
    setMemory(home, 'fact', 'ssh_server', '192.168.1.86')
    appendStateEvent(home, '2026-07-16T10:00:00Z', 'deploy', 'Deployed v1.3.0 to production')
    logSecurityEvent(home, 'scan_complete', 'info', 'Security scan passed', 'test')

    const results = searchAll(home, 'Proxy')
    assert.ok(results.identity.length > 0, 'should find in identity')
    assert.ok(results.identity[0].value.includes('Proxy'))
    rmSync(home, { recursive: true, force: true })
  })

  it('returns empty for no matches', () => {
    const home = makeTestHome()
    const results = searchAll(home, 'zzzznonexistent')
    assert.equal(results.identity.length, 0)
    assert.equal(results.memory.length, 0)
    assert.equal(results.state_events.length, 0)
    rmSync(home, { recursive: true, force: true })
  })
})

// ── queryStateEvents ──

describe('queryStateEvents — filtered queries', () => {
  it('filters by event type', () => {
    const home = makeTestHome()
    appendStateEvent(home, '2026-07-16T10:00:00Z', 'init', 'Journal started')
    appendStateEvent(home, '2026-07-16T11:00:00Z', 'deploy', 'Shipped v1.3.0')
    appendStateEvent(home, '2026-07-16T12:00:00Z', 'init', 'Re-initialized')

    const rows = queryStateEvents(home, { event: 'deploy' })
    assert.equal(rows.length, 1)
    assert.equal(rows[0].event, 'deploy')
    rmSync(home, { recursive: true, force: true })
  })

  it('filters by time range', () => {
    const home = makeTestHome()
    appendStateEvent(home, '2026-07-15T10:00:00Z', 'init', 'Day before')
    appendStateEvent(home, '2026-07-16T10:00:00Z', 'init', 'Today')
    appendStateEvent(home, '2026-07-17T10:00:00Z', 'init', 'Tomorrow')

    const rows = queryStateEvents(home, { since: '2026-07-16', until: '2026-07-16T23:59:59' })
    assert.ok(rows.length >= 1)
    assert.ok(rows.every((r) => r.timestamp >= '2026-07-16'))
    rmSync(home, { recursive: true, force: true })
  })

  it('respects limit', () => {
    const home = makeTestHome()
    for (let i = 0; i < 20; i++) {
      appendStateEvent(home, `2026-07-16T${String(i).padStart(2, '0')}:00:00Z`, 'tick', `Event ${i}`)
    }
    const rows = queryStateEvents(home, { limit: 5 })
    assert.equal(rows.length, 5)
    rmSync(home, { recursive: true, force: true })
  })
})

// ── queryAuditLog ──

describe('queryAuditLog — filtered queries', () => {
  it('filters by command', () => {
    const home = makeTestHome()
    execute(home, `INSERT INTO audit_log (timestamp, command, result, details) VALUES ('2026-07-16T10:00:00Z', 'preserve', 'ok', 'backup created')`)
    execute(home, `INSERT INTO audit_log (timestamp, command, result, details) VALUES ('2026-07-16T11:00:00Z', 'scan', 'ok', 'clean')`)

    const rows = queryAuditLog(home, { command: 'preserve' })
    assert.ok(rows.length >= 1)
    assert.ok(rows.every((r) => r.command === 'preserve'))
    rmSync(home, { recursive: true, force: true })
  })
})

// ── querySecurityEvents ──

describe('querySecurityEvents — severity filtering', () => {
  it('filters by severity', () => {
    const home = makeTestHome()
    logSecurityEvent(home, 'scan', 'info', 'Clean scan', 'test')
    logSecurityEvent(home, 'injection', 'critical', 'Attack detected', 'scanner')
    logSecurityEvent(home, 'warning', 'warning', 'Suspicious pattern', 'scanner')

    const rows = querySecurityEvents(home, { severity: 'critical' })
    assert.ok(rows.length >= 1)
    assert.ok(rows.every((r) => r.severity === 'critical'))
    rmSync(home, { recursive: true, force: true })
  })
})

// ── getTableCounts ──

describe('getTableCounts', () => {
  it('returns counts for all tables', () => {
    const home = makeTestHome()
    setIdentity(home, 'name', 'Test')
    appendStateEvent(home, '2026-07-16T10:00:00Z', 'init', 'Started')

    const counts = getTableCounts(home)
    assert.ok(typeof counts.identity === 'number')
    assert.ok(typeof counts.state_events === 'number')
    assert.ok(counts.identity >= 1)
    assert.ok(counts.state_events >= 1)
    rmSync(home, { recursive: true, force: true })
  })
})

// ── exportTableJSON ──

describe('exportTableJSON', () => {
  it('exports valid JSON', () => {
    const home = makeTestHome()
    setIdentity(home, 'name', 'Export Test')
    setIdentity(home, 'creator', 'JP')

    const json = exportTableJSON(home, 'identity')
    assert.ok(json)
    const parsed = JSON.parse(json)
    assert.ok(Array.isArray(parsed))
    assert.ok(parsed.length >= 2)
    rmSync(home, { recursive: true, force: true })
  })

  it('returns null for invalid table', () => {
    const home = makeTestHome()
    const result = exportTableJSON(home, 'nonexistent_table')
    assert.equal(result, null)
    rmSync(home, { recursive: true, force: true })
  })
})

// ── exportTableCSV ──

describe('exportTableCSV', () => {
  it('exports valid CSV with headers', () => {
    const home = makeTestHome()
    setIdentity(home, 'name', 'CSV Test')

    const csv = exportTableCSV(home, 'identity')
    assert.ok(csv)
    const lines = csv.split('\n')
    assert.ok(lines[0].includes('key'), 'first line should be headers')
    assert.ok(lines.length >= 2, 'should have header + data')
    rmSync(home, { recursive: true, force: true })
  })

  it('handles commas in values', () => {
    const home = makeTestHome()
    setIdentity(home, 'address', '123 Main St, Apt 4')

    const csv = exportTableCSV(home, 'identity')
    const lines = csv.split('\n')
    const dataLine = lines.find((l) => l.includes('123 Main'))
    assert.ok(dataLine, 'should find the data line')
    assert.ok(dataLine.includes('"123 Main St, Apt 4"'), 'comma value should be quoted')
    rmSync(home, { recursive: true, force: true })
  })
})

// ── backupDatabase ──

describe('backupDatabase', () => {
  it('creates a backup file', () => {
    const home = makeTestHome()
    setIdentity(home, 'name', 'Backup Test')

    const dest = backupDatabase(home, 3)
    assert.ok(dest)
    assert.ok(existsSync(dest))
    assert.ok(dest.includes('proxy-journal-'))
    assert.ok(dest.endsWith('.db'))
    rmSync(home, { recursive: true, force: true })
  })

  it('rotates old backups', () => {
    const home = makeTestHome()
    setIdentity(home, 'name', 'Rotation Test')

    // Create 7 backups
    for (let i = 0; i < 7; i++) {
      backupDatabase(home, 3)
    }

    // Check backup directory
    const backupDir = join(home, 'backups')
    const files = readdirSync(backupDir).filter((f) => f.endsWith('.db'))
    assert.ok(files.length <= 3, `should keep at most 3, got ${files.length}`)
    rmSync(home, { recursive: true, force: true })
  })
})
