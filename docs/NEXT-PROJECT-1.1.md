# Next project: PROXY JOURNAL 1.1 — Hop Pack

**Owner:** digivasserver-ai / DIGIVASCONNECT PTY (LTD)  
**Status:** Implementation local · **not shipped to GitHub yet**  
**Goal:** Ship token-efficient default wake as the product’s model-hop story.

---

## Why this project

| Problem | Solution |
|---------|----------|
| Full wake packs burn tokens on every model switch | Default **hop pack** (rules, facts, open loops, recent work) |
| Continuity vs cost tradeoff | `--full` keeps archive path for handoff/audit |
| Hard to prove the win | `wake --stats` + measured ~token estimate |

**Marketing line:**  
*Model-hop efficiency — restore focus in a fraction of the tokens.*

---

## Scope

### In (this project)

1. Ship **v1.1.0** hop pack code already built locally  
2. Green CI on `main` after push  
3. Docs/README already describe hop vs full  
4. Optional: short hero blurb + badge-friendly “hop pack” note  
5. Optional: push selected **brand** assets (avatar + cover only) if publicity is same sprint  

### Out (later projects)

- Auto-logging from agents  
- Cloud sync  
- State rotation / compaction policy  
- npm publish  
- Brand full kit + letterheads (can be Project 1.2)

---

## Current state (facts)

| Item | State |
|------|--------|
| Code (hop pack, flags, tests) | Done locally |
| package.json version | `1.1.0` |
| GitHub `main` | Still **1.0.0** era (`dfbac48` last known) |
| Local tests | 3/3 pass |
| Sample savings | Hop ~416 tokens vs full ~1577 (~74% smaller) |
| Brand kit | Local under `brand/` (not required for 1.1 code ship) |

---

## Work breakdown (ordered)

### Phase A — Ship the code (must)

| # | Task | Done when |
|---|------|-----------|
| A1 | Review local diff vs remote HEAD | You know every file changing |
| A2 | Push 1.1.0 files to `digivasserver-ai/PROXY-JOURNAL` `main` | Remote has hop pack + version 1.1.0 |
| A3 | Confirm CI green (Node 22/24) | Actions success on ship commit |
| A4 | Tag `v1.1.0` (optional but clean) | Tag points at ship commit |
| A5 | Smoke from clean clone | `wake` = Hop Pack; `wake --full` works |

**Files to ship (minimum):**

```
src/bootstrap.mjs
src/cli.mjs
test/store.test.mjs
package.json
CHANGELOG.md
README.md
docs/ARCHITECTURE.md
docs/LLM-BOOTSTRAP.md
docs/NEXT-PROJECT-1.1.md   # this brief
```

### Phase B — Make it noticeable (should)

| # | Task | Done when |
|---|------|-----------|
| B1 | README top: 2–3 lines on hop efficiency + `wake` / `wake --full` | Visitors see the hook in 5 seconds |
| B2 | GitHub About: topics `ai`, `llm`, `cli`, `nodejs`, `memory` | Discoverable |
| B3 | Pin repo on digivasserver-ai profile | Profile shows the project |
| B4 | One public post (X / LinkedIn / Dev.to) | Link + hop vs full demo with `--stats` |
| B5 | Optional GIF: init → log → wake --stats | README visual |

### Phase C — Close the loop (nice)

| # | Task | Done when |
|---|------|-----------|
| C1 | Dogfood hop pack for 3 real model hops | Note friction in journal |
| C2 | Open 2–3 GitHub Issues as roadmap | Public “next” visible |
| C3 | Decide Project 1.2 (brand push / npm / short wake levels) | Written decision |

---

## Success criteria

**Ship is successful if all are true:**

- [ ] `main` reports version **1.1.0**
- [ ] Default `proxy-journal wake` outputs **Hop Pack**
- [ ] `proxy-journal wake --full` still has full JSON / journal path
- [ ] CI **success** on ship commit
- [ ] Clean clone: tests pass, no MODULE_NOT_FOUND
- [ ] One external mention or pin (publicity minimum)

---

## Risks & mitigations

| Risk | Mitigation |
|------|------------|
| Hop under-briefs after long gap | Docs: “cold resume → `wake --full` once” |
| Token estimate misread as exact | Label as **estimate** (`chars/4`) |
| Partial MCP upload races | Prefer git SSH push now that key works |
| Scope creep (brand + npm same day) | Phase A only until CI green |

---

## Suggested next projects (after 1.1)

| ID | Project | Why |
|----|---------|-----|
| **1.2** | Brand kit on GitHub + README visuals | Publicity step-up |
| **1.3** | `wake --tiny` (facts + open loops only) | Even leaner hops |
| **1.4** | Atomic writes + state trim on preserve | Robustness |
| **1.5** | npm package publish | Install in one line |
| **1.6 / 2.x** | **Cloud journal sync (device hop)** | Termux ↔ laptop ↔ desktop — see `docs/FUTURE-CLOUD-SYNC.md` |
| **BA** | **Brand awareness** | Logos, social, profile, posts, letterhead — `docs/FUTURE-BRAND-AND-COMPANY.md` |
| **CX** | **DIGIVASCONNECT expansion** | Studio growth, pins, second tools, hub — same brief |
| **auto** | **Automate multi-rail timeline** | Product + brand + company on one YAML road — `docs/FUTURE-TIMELINE-AUTOMATION.md` |
| **2.0** | Optional agent auto-log adapter | Bigger product bet |

**Device hop:** `docs/FUTURE-CLOUD-SYNC.md`  
**Brand + company:** `docs/FUTURE-BRAND-AND-COMPANY.md`  
**Timeline data:** `docs/roadmap/TIMELINE.yml` · `scripts/roadmap-next.mjs`

---

## Daily checklist (copy)

```
[ ] A1 review diff
[ ] A2 push 1.1.0
[ ] A3 CI green
[ ] A4 tag v1.1.0 (optional)
[ ] A5 clean clone smoke
[ ] B1 README hero
[ ] B2 topics
[ ] B3 pin
[ ] B4 one post
[ ] C1 dogfood note
```

---

## Command cheat sheet (after ship)

```bash
git clone git@github.com:digivasserver-ai/PROXY-JOURNAL.git
cd PROXY-JOURNAL
node bin/proxy-journal.mjs init "Proxy" "YourName"
node bin/proxy-journal.mjs wake --stats          # hop (default)
node bin/proxy-journal.mjs wake --full --stats   # archive
npm test
```

---

*Project brief for DIGIVASCONNECT · PROXY JOURNAL 1.1 Hop Pack*
