import { writeFileSync } from 'fs'
import { filesFor } from './paths.mjs'
import { loadCore, countState, readStateLines } from './store.mjs'
import { hostname } from 'os'
import { execSync } from 'child_process'

function freeDisk() {
  try {
    const out = execSync('df -h . 2>/dev/null | tail -1', { encoding: 'utf8' })
    const parts = out.trim().split(/\s+/)
    return parts[3] || 'n/a'
  } catch {
    return 'n/a'
  }
}

/**
 * Rebuild journal.md from identity + memory + recent state.
 * Human-readable living document for humans and LLMs.
 */
export function renderJournal(home) {
  const core = loadCore(home)
  const id = core.identity || {}
  const mem = core.memory || {}
  const meta = mem.meta || {}
  const episodic = Array.isArray(mem.episodic) ? mem.episodic : []
  const recent = readStateLines(home, 15)
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19)
  const name = id.name || 'Proxy'
  const creator = id.creator || 'Operator'

  const episodeBlock = episodic
    .slice(-20)
    .map(
      (e) =>
        `### ${e.timestamp || 'undated'} — ${e.event || 'Event'}\n${e.description || e.message || ''}\n`
    )
    .join('\n')

  const stateBlock = recent
    .map((e) => {
      const ts = e.timestamp || ''
      const ev = e.event || 'note'
      const msg = e.message || e.preview || ''
      return `- \`${ts}\` **${ev}** — ${msg}`
    })
    .join('\n')

  const facts = mem.facts && typeof mem.facts === 'object' ? mem.facts : {}
  const factKeys = Object.keys(facts)
  const factBlock = factKeys.length
    ? factKeys.map((k) => `- **${k}:** ${facts[k]}`).join('\n')
    : '_No durable facts yet. Use `proxy-journal fact <key> <value>`._'

  const loops = Array.isArray(mem.open_loops) ? mem.open_loops : []
  const loopBlock = loops.length
    ? loops
        .map((l) => {
          if (typeof l === 'string') return `- [ ] ${l}`
          const note = l.note ? ` — ${l.note}` : ''
          return `- [ ] **${l.title}**${note}${l.opened ? ` _(opened ${l.opened})_` : ''}`
        })
        .join('\n')
    : '_No open loops. Use `proxy-journal open <title>` to track unfinished work._'

  const rules = Array.isArray(id.rules)
    ? id.rules.map((r) => `- ${r}`).join('\n')
    : '- Log every session.\n- If context is lost, rebuild from this journal.'

  const body = `# ${name}'s Living Journal

**Maintained by:** ${name}  
**Creator / operator:** ${creator}  
**Last updated:** ${now}  
**Host:** ${hostname()}  
**Journal home:** \`${home}\`

---

## Identity

- **Name:** ${name}
- **Purpose:** ${id.purpose || 'Persist progress. Never be a blank slate.'}
- **Nature:** ${id.nature || 'Proxy between intent and execution'}
- **Birth:** ${id.birth || 'unknown'}

### Standing rules
${rules}

---

## Session snapshot

| Field | Value |
|-------|-------|
| Session count (meta) | ${meta.session_count ?? '—'} |
| State entries | ${countState(home)} |
| Open loops | ${loops.length} |
| Facts | ${factKeys.length} |
| Disk free (cwd) | ${freeDisk()} |
| Status | Active |

---

## Durable facts

${factBlock}

---

## Open loops

${loopBlock}

---

## Episodic memory (recent)

${episodeBlock || '_No episodic entries yet. Use `proxy-journal remember` to add progress._'}

---

## Recent state log

${stateBlock || '_Empty. Use `proxy-journal log` to append events._'}

---

## How to wake me in any LLM chat

1. Run: \`proxy-journal wake\`
2. Paste the full output as the first message (or system context).
3. Continue work. End with: \`proxy-journal log session_end "summary…"\`

---

*Auto-rendered by PROXY JOURNAL — DIGIVASCONNECT PTY (LTD)*
`

  writeFileSync(filesFor(home).journal, body)
  return body
}
