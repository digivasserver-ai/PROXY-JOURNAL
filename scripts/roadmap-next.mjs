#!/usr/bin/env node
/**
 * Seed automation: print next open tasks from docs/roadmap/TIMELINE.yml
 * Later project: docs/FUTURE-TIMELINE-AUTOMATION.md
 *
 * Usage:
 *   node scripts/roadmap-next.mjs
 *   node scripts/roadmap-next.mjs --all
 *   node scripts/roadmap-next.mjs --json
 */
import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const TIMELINE = join(ROOT, 'docs/roadmap/TIMELINE.yml')

const args = process.argv.slice(2)
const showAll = args.includes('--all')
const asJson = args.includes('--json')
const trackIdx = args.indexOf('--track')
const trackFilter =
  trackIdx >= 0 && args[trackIdx + 1] ? args[trackIdx + 1].toLowerCase() : null
const TRACKS = new Set(['product', 'brand', 'company', 'automation'])

function parseSimpleYaml(text) {
  // Minimal YAML subset for this file only (no external deps).
  // Prefer full yaml parser later if schema grows.
  const phases = []
  let phase = null
  let task = null
  let inPhases = false
  let inTasks = false

  for (const raw of text.split('\n')) {
    const line = raw.replace(/\t/g, '  ')
    if (/^\s*#/.test(line) || !line.trim()) continue

    if (/^phases:\s*$/.test(line)) {
      inPhases = true
      continue
    }
    if (!inPhases) continue

    const phaseStart = line.match(/^  - id:\s*["']?([^"'\n]+)["']?\s*$/)
    if (phaseStart) {
      phase = {
        id: phaseStart[1],
        name: '',
        status: 'pending',
        track: 'product',
        goal: '',
        brief: '',
        depends_on: [],
        tasks: [],
      }
      phases.push(phase)
      inTasks = false
      task = null
      continue
    }
    if (!phase) continue

    const taskStart = line.match(/^      - id:\s*["']?([^"'\n]+)["']?\s*$/)
    if (taskStart) {
      inTasks = true
      task = { id: taskStart[1], title: '', status: 'pending' }
      phase.tasks.push(task)
      continue
    }

    const kv = line.match(/^    (\w+):\s*(.*)$/)
    if (kv && !line.match(/^      /)) {
      const key = kv[1]
      let val = kv[2].trim()
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1)
      }
      if (key === 'tasks') {
        inTasks = true
        task = null
        if (!Array.isArray(phase.tasks)) phase.tasks = []
        continue
      }
      if (key === 'depends_on') {
        // e.g. ["1.1"]
        const m = val.match(/\[(.*)\]/)
        phase.depends_on = m
          ? m[1]
              .split(',')
              .map((s) => s.trim().replace(/^["']|["']$/g, ''))
              .filter(Boolean)
          : []
        continue
      }
      if (['name', 'status', 'goal', 'brief', 'id', 'track'].includes(key)) {
        phase[key] = val
        inTasks = false
      }
      continue
    }

    const tkv = line.match(/^        (\w+):\s*(.*)$/)
    if (tkv && task) {
      const key = tkv[1]
      let val = tkv[2].trim()
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1)
      }
      if (key === 'title' || key === 'status' || key === 'id') task[key] = val
    }
  }
  return phases
}

function isOpen(status) {
  return status === 'pending' || status === 'active' || status === 'blocked'
}

function main() {
  if (!existsSync(TIMELINE)) {
    console.error('Missing timeline:', TIMELINE)
    process.exit(1)
  }
  const phases = parseSimpleYaml(readFileSync(TIMELINE, 'utf8'))
  const openPhases = phases.filter((p) => isOpen(p.status) || showAll)
  const nextTasks = []

  if (trackFilter && !TRACKS.has(trackFilter)) {
    console.error('Unknown --track. Use: product | brand | company | automation')
    process.exit(1)
  }

  for (const p of phases) {
    if (trackFilter && (p.track || 'product') !== trackFilter) continue
    if (p.status === 'later' && !showAll) continue
    if (p.status === 'done' && !showAll) continue
    for (const t of p.tasks) {
      const taskOpen =
        t.status === 'pending' ||
        t.status === 'active' ||
        t.status === 'blocked' ||
        (showAll && t.status !== 'done')
      if (taskOpen) {
        nextTasks.push({
          phase: p.id,
          phase_name: p.name,
          phase_status: p.status,
          track: p.track || 'product',
          task: t.id,
          title: t.title,
          status: t.status,
          brief: p.brief || '',
        })
      }
    }
  }

  // Prefer active phase tasks first
  nextTasks.sort((a, b) => {
    const rank = (s) => (s === 'active' ? 0 : s === 'pending' ? 1 : s === 'blocked' ? 2 : 3)
    return rank(a.phase_status) - rank(b.phase_status) || a.phase.localeCompare(b.phase)
  })

  if (asJson) {
    console.log(
      JSON.stringify(
        {
          timeline: TIMELINE,
          next: nextTasks.filter((t) => t.status !== 'done' && t.status !== 'later').slice(0, 5),
          open_count: nextTasks.filter((t) => t.status === 'pending' || t.status === 'active').length,
        },
        null,
        2
      )
    )
    return
  }

  console.log('DIGIVASCONNECT / PROXY JOURNAL — multi-rail roadmap')
  console.log('Source:', TIMELINE)
  if (trackFilter) console.log('Track filter:', trackFilter)
  console.log('Rails: product | brand | company | automation')
  console.log('')

  const activeNow = nextTasks.filter(
    (t) => t.status === 'pending' || t.status === 'active' || t.status === 'blocked'
  )
  const view = showAll ? nextTasks.filter((t) => t.status !== 'done') : activeNow
  if (!view.length) {
    console.log('No tasks in this view. Try: --all   or   --track brand --all')
    return
  }

  const focus = view.slice(0, 12)
  console.log(showAll ? 'Roadmap (including later):' : 'Next up (active/pending):')
  for (const t of focus) {
    console.log(`  [${t.track}] [${t.phase}/${t.task}] (${t.status}) ${t.title}`)
    if (t.brief) console.log(`             brief: ${t.brief}`)
  }
  console.log('')
  const byTrack = {}
  for (const t of view) {
    byTrack[t.track] = (byTrack[t.track] || 0) + 1
  }
  console.log('By track in view:', byTrack)
  console.log(`Shown: ${focus.length}  (view total ${view.length}, active now ${activeNow.length})`)
  console.log('Brand+company: docs/FUTURE-BRAND-AND-COMPANY.md')
  console.log('Automation:    docs/FUTURE-TIMELINE-AUTOMATION.md')
  console.log('Tip: node scripts/roadmap-next.mjs --track brand --all')
}

main()
