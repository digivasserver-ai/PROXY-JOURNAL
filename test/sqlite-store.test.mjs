/**
 * sqlite-store.test.mjs — Tests for SQLite storage adapter
 * PROXY JOURNAL v1.2.0 · DIGIVASCONNECT PTY (LTD)
 */
import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { rmSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import {
  initDatabase,
  isInitialized,
  dbPath,
  setIdentity,
  getIdentity,
  getAllIdentity,
  setMemory,
  getMemory,
  getMemoryByCategory,
  appendStateEvent,
  getStateEvents,
  countStateEvents,
  logSecurityEvent,
  getSecurityEvents,
  recordIntegrityHash,
  getLatestHash,
  getStats,
} from '../src/sqlite-store.mjs'

const TEST_HOME = join(tmpdir(), 'proxy-journal-test-sqlite')

before(() => {
  mkdirSync(TEST_HOME, { recursive: true })
})

after(() => {
  rmSync(TEST_HOME, { recursive: true, force: true })
})

// ── Database initialization ──

describe('sqlite-store — initDatabase', () => {
  it('creates the database file', () => {
    const result = initDatabase(TEST_HOME)
    assert.ok(existsSync(dbPath(TEST_HOME)))
  })

  it('is idempotent (safe to call multiple times)', () => {
    assert.doesNotThrow(() => initDatabase(TEST_HOME))
    assert.doesNotThrow(() => initDatabase(TEST_HOME))
  })
})

describe('sqlite-store — isInitialized', () => {
  it('returns true after init', () => {
    assert.equal(isInitialized(TEST_HOME), true)
  })

  it('returns false for non-existent directory', () => {
    assert.equal(isInitialized('/tmp/nonexistent-proxy-journal-test'), false)
  })
})

// ── Identity operations ──

describe('sqlite-store — identity', () => {
  it('setIdentity and getIdentity', () => {
    setIdentity(TEST_HOME, 'name', 'TestProxy')
    assert.equal(getIdentity(TEST_HOME, 'name'), 'TestProxy')
  })

  it('getAllIdentity returns all entries', () => {
    setIdentity(TEST_HOME, 'creator', 'Tester')
    const all = getAllIdentity(TEST_HOME)
    assert.ok(all.length >= 2)
    const names = all.map((r) => r.key)
    assert.ok(names.includes('name'))
    assert.ok(names.includes('creator'))
  })

  it('handles special characters in values', () => {
    setIdentity(TEST_HOME, 'desc', "It's a test with 'quotes'")
    assert.equal(getIdentity(TEST_HOME, 'desc'), "It's a test with 'quotes'")
  })

  it('survives SQL injection attempt in key name', () => {
    const maliciousKey = "'; DROP TABLE identity; --"
    setIdentity(TEST_HOME, maliciousKey, 'should-survive')
    assert.equal(getIdentity(TEST_HOME, maliciousKey), 'should-survive')
    // Verify identity table still exists
    assert.ok(isInitialized(TEST_HOME))
  })

  it('survives SQL injection attempt in value', () => {
    const maliciousValue = "'); DROP TABLE identity; --"
    setIdentity(TEST_HOME, 'safe-key', maliciousValue)
    assert.equal(getIdentity(TEST_HOME, 'safe-key'), maliciousValue)
    assert.ok(isInitialized(TEST_HOME))
  })
})

// ── Memory operations ──

describe('sqlite-store — memory', () => {
  it('setMemory and getMemory', () => {
    setMemory(TEST_HOME, 'fact', 'coffee', 'black')
    const result = getMemory(TEST_HOME, 'fact', 'coffee')
    assert.ok(result)
    assert.equal(result.value, 'black')
  })

  it('getMemoryByCategory returns all in category', () => {
    setMemory(TEST_HOME, 'fact', 'tea', 'green')
    const results = getMemoryByCategory(TEST_HOME, 'fact')
    assert.ok(results.length >= 2)
  })
})

// ── State events ──

describe('sqlite-store — state events', () => {
  it('appendStateEvent and getStateEvents', () => {
    appendStateEvent(TEST_HOME, new Date().toISOString(), 'test', 'hello world')
    const events = getStateEvents(TEST_HOME, 10)
    assert.ok(events.length >= 1)
    assert.equal(events[0].event, 'test')
    assert.equal(events[0].message, 'hello world')
  })

  it('countStateEvents returns correct count', () => {
    const before = countStateEvents(TEST_HOME)
    appendStateEvent(TEST_HOME, new Date().toISOString(), 'count_test', 'msg')
    const after = countStateEvents(TEST_HOME)
    assert.equal(after, before + 1)
  })
})

// ── Security events ──

describe('sqlite-store — security events', () => {
  it('logSecurityEvent and getSecurityEvents', () => {
    logSecurityEvent(TEST_HOME, 'test_event', 'info', 'test details', 'test.mjs')
    const events = getSecurityEvents(TEST_HOME, 10)
    assert.ok(events.length >= 1)
    assert.equal(events[0].event_type, 'test_event')
    assert.equal(events[0].severity, 'info')
  })
})

// ── Integrity hashes ──

describe('sqlite-store — integrity hashes', () => {
  it('recordIntegrityHash and getLatestHash', () => {
    recordIntegrityHash(TEST_HOME, 'identity', 'abc123', null)
    recordIntegrityHash(TEST_HOME, 'identity', 'def456', 'abc123')
    const latest = getLatestHash(TEST_HOME, 'identity')
    assert.ok(latest)
    assert.equal(latest.hash, 'def456')
  })
})

// ── Stats ──

describe('sqlite-store — getStats', () => {
  it('returns counts for all tables', () => {
    const stats = getStats(TEST_HOME)
    assert.ok(typeof stats.identity === 'number')
    assert.ok(typeof stats.memory === 'number')
    assert.ok(typeof stats.state_events === 'number')
    assert.ok(typeof stats.audit_log === 'number')
    assert.ok(typeof stats.integrity_hashes === 'number')
    assert.ok(typeof stats.security_events === 'number')
  })
})
