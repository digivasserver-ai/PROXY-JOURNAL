import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, readFileSync, existsSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { spawnSync } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const bin = join(root, 'bin/proxy-journal.mjs')

function run(home, args, extraEnv = {}) {
  return spawnSync(process.execPath, [bin, ...args], {
    env: { ...process.env, PROXY_JOURNAL_HOME: home, NO_COLOR: '1', ...extraEnv },
    encoding: 'utf8',
  })
}

test('init → log → remember → wake', () => {
  const home = mkdtempSync(join(tmpdir(), 'pj-'))
  try {
    let r = run(home, ['init', 'Proxy', 'Tester'])
    assert.equal(r.status, 0, r.stderr)

    r = run(home, ['log', 'milestone', 'built tests'])
    assert.equal(r.status, 0, r.stderr)

    r = run(home, ['remember', 'Tests', 'Added node:test smoke coverage'])
    assert.equal(r.status, 0, r.stderr)

    r = run(home, ['status'])
    assert.equal(r.status, 0)
    assert.match(r.stdout, /Proxy/)

    r = run(home, ['wake'])
    assert.equal(r.status, 0)
    assert.match(r.stdout, /Hop Pack/)
    assert.match(r.stdout, /built tests/)
    // hop default must stay compact (no full JSON identity dump)
    assert.ok(!r.stdout.includes('## Identity (JSON)'), 'default wake is hop, not full')

    r = run(home, ['wake', '--full'])
    assert.equal(r.status, 0)
    assert.match(r.stdout, /Wake \/ Bootstrap Pack/)
    assert.match(r.stdout, /Identity \(JSON\)/)

    // hop pack should be smaller than full pack
    const hop = run(home, ['wake'])
    const full = run(home, ['wake', '--full'])
    assert.ok(
      hop.stdout.length < full.stdout.length,
      `hop (${hop.stdout.length}) should be < full (${full.stdout.length})`
    )

    // --stats prints estimate on stderr, not stdout pollution
    r = run(home, ['wake', '--stats'])
    assert.equal(r.status, 0)
    assert.match(r.stderr, /tokens/)

    // wake should not pollute state by default
    const state = readFileSync(join(home, 'state.ndjson'), 'utf8')
    assert.ok(!state.includes('"event":"wake"'), 'wake must not log by default')
  } finally {
    rmSync(home, { recursive: true, force: true })
  }
})

test('fact + open/close + history', () => {
  const home = mkdtempSync(join(tmpdir(), 'pj-'))
  try {
    assert.equal(run(home, ['init', 'Proxy', 'Tester']).status, 0)

    let r = run(home, ['fact', 'stack', 'Node 20 + openEuler'])
    assert.equal(r.status, 0, r.stderr + r.stdout)

    r = run(home, ['open', 'Ship docs', 'Need screenshots'])
    assert.equal(r.status, 0, r.stderr)

    r = run(home, ['status'])
    assert.match(r.stdout, /Open:\s+1/)
    assert.match(r.stdout, /Facts:\s+1/)

    r = run(home, ['wake'])
    assert.match(r.stdout, /Ship docs/)
    assert.match(r.stdout, /Node 20/)

    r = run(home, ['close', 'Ship docs'])
    assert.equal(r.status, 0, r.stderr)

    r = run(home, ['status'])
    assert.match(r.stdout, /Open:\s+0/)

    r = run(home, ['history', '10'])
    assert.equal(r.status, 0)
    assert.match(r.stdout, /fact|open_loop|close_loop/)

    const journal = readFileSync(join(home, 'journal.md'), 'utf8')
    assert.match(journal, /Durable facts/)
    assert.ok(existsSync(join(home, 'identity.json')))
  } finally {
    rmSync(home, { recursive: true, force: true })
  }
})

test('guard rails: uninit, bad args, double init', () => {
  const home = mkdtempSync(join(tmpdir(), 'pj-'))
  try {
    assert.equal(run(home, ['log', 'x']).status, 1)
    assert.equal(run(home, ['init', 'Proxy', 'A']).status, 0)
    assert.equal(run(home, ['init', 'Proxy', 'B']).status, 1)
    assert.equal(run(home, ['log']).status, 1)
    assert.equal(run(home, ['remember', 'only-title']).status, 1)
    assert.equal(run(home, ['notacommand']).status, 1)
    assert.equal(run(home, ['version']).status, 0)
    assert.match(run(home, ['version']).stdout, /proxy-journal \d+\.\d+\.\d+/)
  } finally {
    rmSync(home, { recursive: true, force: true })
  }
})
