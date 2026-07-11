import { loadCore, countState, readStateLines } from './store.mjs'
import { renderJournal } from './journal.mjs'

/** Rough token estimate for marketing / hop sizing (chars÷4). */
export function estimateTokens(text) {
  if (!text) return 0
  return Math.max(1, Math.ceil(String(text).length / 4))
}

function formatLoops(mem) {
  if (!Array.isArray(mem?.open_loops) || !mem.open_loops.length) return '_None._'
  return mem.open_loops
    .map((l) =>
      typeof l === 'string'
        ? `- [ ] ${l}`
        : `- [ ] **${l.title}**${l.note ? ` — ${l.note}` : ''}`
    )
    .join('\n')
}

function formatFacts(mem) {
  const facts = mem?.facts && typeof mem.facts === 'object' ? mem.facts : {}
  const keys = Object.keys(facts)
  if (!keys.length) return '_None._'
  return keys.map((k) => `- **${k}:** ${facts[k]}`).join('\n')
}

function formatEpisodes(mem, limit = 5) {
  const ep = Array.isArray(mem?.episodic) ? mem.episodic : []
  if (!ep.length) return '_None yet._'
  return ep
    .slice(-limit)
    .map((e) => {
      const ts = e.timestamp ? String(e.timestamp).slice(0, 10) : ''
      const title = e.event || 'Episode'
      const desc = (e.description || e.message || '').trim()
      const short = desc.length > 120 ? `${desc.slice(0, 117)}…` : desc
      return `- ${ts ? `${ts} · ` : ''}**${title}**${short ? ` — ${short}` : ''}`
    })
    .join('\n')
}

function formatStateLines(events) {
  if (!events?.length) return '_Empty._'
  return events
    .map((e) => {
      const ts = (e.timestamp || '').slice(0, 19).replace('T', ' ')
      const ev = e.event || 'note'
      const msg = (e.message || '').trim()
      const short = msg.length > 100 ? `${msg.slice(0, 97)}…` : msg
      return `- \`${ts}\` **${ev}**${short ? ` — ${short}` : ''}`
    })
    .join('\n')
}

function notInitializedText() {
  return `# PROXY JOURNAL — not initialized

Run:

\`\`\`bash
npx proxy-journal init
# or: node bin/proxy-journal.mjs init
\`\`\`

Then run \`proxy-journal wake\` again and paste the output into your AI chat.
`
}

/**
 * Compact hop pack: high-signal continuity, low tokens.
 * Optimized for model hops (Grok ↔ Claude ↔ ChatGPT ↔ Cursor).
 */
function buildShortPack(home, core) {
  const id = core.identity || {}
  const mem = core.memory || {}
  const name = id.name || 'Proxy'
  const purpose = id.purpose || 'Persist progress. Never be a blank slate.'
  const rules =
    (id.rules || []).map((r) => `- ${r}`).join('\n') ||
    '- Log progress. Rebuild from memory if context was lost. Do not invent history.'

  // Fewer events than full pack — enough for hop, not a dump
  const recent = readStateLines(home, 10)
  const total = countState(home)

  const text = `# PROXY JOURNAL — Hop Pack (token-efficient)

You are **${name}**. Restore continuity from this pack — **do not** invent history.

**Purpose:** ${purpose}

## Rules
${rules}

## Facts
${formatFacts(mem)}

## Open loops
${formatLoops(mem)}

## Recent memory (last ${Math.min(5, (mem.episodic || []).length)} episodes)
${formatEpisodes(mem, 5)}

## Recent state (${recent.length} of ${total})
${formatStateLines(recent)}

## This chat
1. Name yourself **${name}**; 2–4 bullet recap + open loops.
2. Ask what to continue. Prefer concrete next steps.
3. Operator logs with: \`proxy-journal log|remember|fact|open|close\` then \`preserve\`.

*PROXY JOURNAL · DIGIVASCONNECT · hop mode · ${new Date().toISOString().slice(0, 19)}Z*
`

  return text
}

/**
 * Full archive pack: complete identity/memory JSON + living journal.
 * Use for audits, handoff, or deep resume — higher token cost.
 */
function buildFullPack(home, core) {
  const id = core.identity
  const mem = core.memory
  const name = id?.name || 'Proxy'
  const recentJson = JSON.stringify(core.recent, null, 2)
  const memoryJson = JSON.stringify(mem, null, 2)
  const identityJson = JSON.stringify(id, null, 2)

  return `# PROXY JOURNAL — Wake / Bootstrap Pack (full)

You are **${name}**, a persistent development companion.
This pack restores your identity, memory, and recent progress so you are **not a blank slate**.

---

## Your standing rules

${(id?.rules || []).map((r) => `- ${r}`).join('\n') || '- Log progress. Rebuild from memory if context was lost.'}

---

## Identity (JSON)

\`\`\`json
${identityJson}
\`\`\`

---

## Memory (JSON)

\`\`\`json
${memoryJson}
\`\`\`

---

## Recent state (last ${core.recent.length} of ${countState(home)} events)

\`\`\`json
${recentJson}
\`\`\`

---

## Living journal (markdown)

${core.journal || '_journal.md empty — will regenerate on preserve_'}

---

## Open loops (unfinished work)

${formatLoops(mem)}

---

## Durable facts

\`\`\`json
${JSON.stringify(mem?.facts || {}, null, 2)}
\`\`\`

---

## Operator instructions for this chat

1. Acknowledge that you loaded this journal (name yourself **${name}**).
2. Summarize the last known work in 3–5 bullets, and list any open loops.
3. Ask what to continue — do not invent history that is not in memory/state.
4. When the operator finishes a milestone, they will log it with:
   \`proxy-journal log milestone "…"\` and \`proxy-journal remember "Title" "Description"\`
5. Track unfinished work with \`proxy-journal open\` / \`close\`; store durable truths with \`proxy-journal fact\`.
6. Prefer concrete next steps over vague encouragement.

---

*Generated by PROXY JOURNAL · DIGIVASCONNECT PTY (LTD)*
*Home: \`${home}\` · ${new Date().toISOString()} · mode=full*
`
}

/**
 * Build a portable context pack for any LLM / AI chat product.
 * No vendor lock-in: paste into ChatGPT, Claude, Grok, Cursor, etc.
 *
 * @param {string} home
 * @param {object} [opts]
 * @param {boolean} [opts.refreshJournal] — rebuild journal.md (default: true only for full)
 * @param {'short'|'full'} [opts.mode='short'] — short = hop-efficient default; full = archive dump
 */
export function buildWakePack(home, { refreshJournal, mode = 'short' } = {}) {
  const resolved = mode === 'full' ? 'full' : 'short'
  const doRefresh = refreshJournal !== undefined ? refreshJournal : resolved === 'full'

  if (doRefresh) {
    try {
      renderJournal(home)
    } catch {
      /* keep existing journal */
    }
  }

  const core = loadCore(home)
  if (!core.exists) {
    const text = notInitializedText()
    return {
      text,
      core,
      mode: resolved,
      stats: { chars: text.length, tokens: estimateTokens(text), mode: resolved },
    }
  }

  const text = resolved === 'full' ? buildFullPack(home, core) : buildShortPack(home, core)
  const stats = {
    chars: text.length,
    tokens: estimateTokens(text),
    mode: resolved,
  }

  return { text, core, mode: resolved, stats }
}
