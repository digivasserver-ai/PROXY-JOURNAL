import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import {
  ensureDirs,
  writeJson,
  readJson,
  appendState,
  loadCore,
  countState,
  readStateLines,
  snapshotBackup,
} from '../src/store.mjs'

test('store: ensureDirs creates directory structure', () => {
  const home = mkdtempSync(join(tmpdir(), 'pj-test-'))
  try {
    const files = ensureDirs(home)
    assert.ok(files.identity)
    assert.ok(files.memory)
    assert.ok(files.state)
    assert.ok(files.journal)
  } finally {
    rmSync(home, { recursive: true, force: true })
  }
})

test('store: writeJson and readJson round-trip', () => {
  const home = mkdtempSync(join(tmpdir(), 'pj-test-'))
  try {
    const data = { name: 'Test', value: 42, nested: { key: 'value' } }
    const path = join(home, 'test.json')
    writeJson(path, data)
    const read = readJson(path)
    assert.deepEqual(read, data)
  } finally {
    rmSync(home, { recursive: true, force: true })
  }
})

test('store: readJson returns fallback for missing file', () => {
  const fallback = { default: true }
  const result = readJson('/nonexistent/path/file.json', fallback)
  assert.deepEqual(result, fallback)
})

test('store: readJson returns fallback for corrupted JSON', () => {
  const home = mkdtempSync(join(tmpdir(), 'pj-test-'))
  try {
    const path = join(home, 'bad.json')
    writeFileSync(path, 'not valid json {]')
    const fallback = { recovered: true }
    const result = readJson(path, fallback)
    assert.deepEqual(result, fallback)
  } finally {
    rmSync(home, { recursive: true, force: true })
  }
})

test('store: appendState writes to ndjson', () => {
  const home = mkdtempSync(join(tmpdir(), 'pj-test-'))
  try {
    ensureDirs(home)
    const entry = appendState(home, 'test', 'message', { meta: 'data' })
    assert.ok(entry.timestamp)
    assert.equal(entry.event, 'test')
    assert.equal(entry.message, 'message')
  } finally {
    rmSync(home, { recursive: true, force: true })
  }
})

test('store: countState returns line count', () => {
  const home = mkdtempSync(join(tmpdir(), 'pj-test-'))
  try {
    ensureDirs(home)
    assert.equal(countState(home), 0)
    appendState(home, 'e1', 'msg')
    assert.equal(countState(home), 1)
    appendState(home, 'e2', 'msg')
    assert.equal(countState(home), 2)
  } finally {
    rmSync(home, { recursive: true, force: true })
  }
})

test('store: readStateLines returns recent entries', () => {
  const home = mkdtempSync(join(tmpdir(), 'pj-test-'))
  try {
    ensureDirs(home)
    for (let i = 0; i < 5; i++) {
      appendState(home, `event${i}`, `message ${i}`)
    }
    const lines = readStateLines(home, 3)
    assert.equal(lines.length, 3)
    assert.ok(lines.every((l) => l.event && l.message))
  } finally {
    rmSync(home, { recursive: true, force: true })
  }
})

test('store: loadCore returns correct structure', () => {
  const home = mkdtempSync(join(tmpdir(), 'pj-test-'))
  try {
    const files = ensureDirs(home)
    const identity = { name: 'Test', purpose: 'test' }
    const memory = { facts: {}, open_loops: [] }
    writeJson(files.identity, identity)
    writeJson(files.memory, memory)
    writeFileSync(files.state, '{"event":"test"}\n')
    writeFileSync(files.journal, '# Journal')

    const core = loadCore(home)
    assert.ok(core.exists)
    assert.deepEqual(core.identity, identity)
    assert.deepEqual(core.memory, memory)
    assert.ok(core.journal)
    assert.ok(Array.isArray(core.recent))
  } finally {
    rmSync(home, { recursive: true, force: true })
  }
})

test('store: loadCore.exists is false for uninitialized', () => {
  const home = mkdtempSync(join(tmpdir(), 'pj-test-'))
  try {
    const core = loadCore(home)
    assert.equal(core.exists, false)
  } finally {
    rmSync(home, { recursive: true, force: true })
  }
})

test('store: snapshotBackup creates timestamped copies', () => {
  const home = mkdtempSync(join(tmpdir(), 'pj-test-'))
  try {
    const files = ensureDirs(home)
    writeJson(files.identity, { name: 'Test' })
    writeJson(files.memory, { facts: {} })
    writeFileSync(files.state, '{"event":"test"}\n')

    const prefix = snapshotBackup(home, 'backup')
    assert.ok(prefix, 'snapshotBackup returns a prefix')
    assert.ok(prefix.includes('backup'), `prefix should include 'backup': ${prefix}`)
    
    // Check that backup files were actually created
    const identityBackup = `${prefix}.identity.json`
    assert.ok(existsSync(identityBackup), `backup file should exist: ${identityBackup}`)
    const content = readFileSync(identityBackup, 'utf8')
    assert.ok(content.includes('Test'), 'backup should contain original data')
  } finally {
    rmSync(home, { recursive: true, force: true })
  }
})
