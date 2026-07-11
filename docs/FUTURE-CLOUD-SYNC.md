# Future project: Cloud journal sync (device hop)

**Status:** Planned · not in core 1.x ship  
**Product:** PROXY JOURNAL · DIGIVASCONNECT PTY (LTD)  
**Problem:** Same continuity on phone (Termux), laptop, and desktop when you move.

---

## Why

| Hop type | Solved by |
|----------|-----------|
| **Model hop** (Grok ↔ Claude ↔ ChatGPT) | Hop pack (`wake` default) — shipped / shipping as 1.1 |
| **Device hop** (Termux ↔ laptop ↔ desktop) | Optional cloud / folder sync — **this project** |

Local-only journals die when you change machines. Mobile + Termux is a first-class DIGIVAS story.

---

## Principles (do not break)

1. **Local-first** — CLI works offline with zero cloud config.  
2. **Opt-in** — sync is never required for `init` / `wake` / `log`.  
3. **No secrets** — never sync API keys/tokens; journal is continuity, not a vault.  
4. **Preserve before pull** — always snapshot before merging remote state.  
5. **Model packs stay paste-based** — cloud syncs *journal home*, not the LLM vendor.

---

## Target UX

```bash
# once per device
export PROXY_JOURNAL_HOME="$HOME/.proxy-journal"   # or project-local

proxy-journal sync init      # choose backend + remote id
proxy-journal sync push      # upload journal home
proxy-journal sync pull      # download + merge
proxy-journal sync status    # last push/pull, conflict?

# then normal flow on any device
proxy-journal wake --stats
proxy-journal log milestone "from Termux"
proxy-journal preserve
proxy-journal sync push
```

### Device matrix

| Device | Role |
|--------|------|
| Desktop | Primary authoring, full preserve |
| Laptop | Same home via sync |
| Phone Termux | Wake + log + open/close; push often |

---

## Backend options (pick in design spike)

| Option | Pros | Cons |
|--------|------|------|
| **A. Syncthing / folder sync** | Zero new server code; works offline mesh | Not a branded product surface |
| **B. Private git remote** | Familiar; history | Merge conflicts; ops skill |
| **C. WebDAV / Nextcloud** | Self-host friendly | Auth + partial-file pain |
| **D. S3-compatible object** | Simple push/pull tarball or file set | Need credentials UX |
| **E. DIGIVASCONNECT mini API** | Product control, accounts | Build + host cost |

**Recommended path:**  
- **MVP:** document folder-sync layout + `PROXY_JOURNAL_HOME` on synced dir (Syncthing/Nextcloud).  
- **v1 product:** `sync push|pull` over S3-compatible or WebDAV.  
- **Later:** optional DIGIVAS hosted endpoint.

---

## Data model for sync

Sync **journal home** contents:

```
identity.json
memory.json
state.ndjson      # append-only — merge by line / timestamp
journal.md        # regenerated after merge (render)
config.json
backup/           # optional: last N only, or exclude from mobile pull
```

### Conflict rules (draft)

| File | Rule |
|------|------|
| `state.ndjson` | Union of lines; sort by `timestamp`; dedupe identical JSON lines |
| `memory.json` | Merge facts (prefer newer `meta.last_updated`); open_loops by title; episodic append + cap |
| `identity.json` | Last-write-wins + backup of loser to `backup/` |
| `journal.md` | Always re-`render` after merge |

---

## Security

- TLS for any network backend  
- Credentials in env (`PROXY_JOURNAL_SYNC_*`) or OS keyring — never in repo  
- Optional client-side encrypt of blob before upload (stretch)  
- `.gitignore` / docs: do not publish journal homes  

See also `SECURITY.md`.

---

## Milestones

| Milestone | Deliverable |
|-----------|-------------|
| **M0** | This doc + roadmap issue |
| **M1** | Guide: put `PROXY_JOURNAL_HOME` on Syncthing/Nextcloud path (no code) |
| **M2** | `proxy-journal sync status|push|pull` + one backend (S3 or WebDAV) |
| **M3** | Termux install notes + smoke checklist |
| **M4** | Conflict tests + preserve-on-pull |
| **M5** | Optional hosted DIGIVAS endpoint |

---

## Success criteria

- [ ] Same open loops/facts after phone → desktop pull  
- [ ] Offline `wake` still works with no network  
- [ ] `preserve` runs before destructive pull  
- [ ] Termux documented and tested once  
- [ ] SECURITY.md updated for sync threats  

---

## Non-goals (for first cloud drop)

- Real-time multiplayer editing  
- Replacing hop pack  
- Storing LLM API keys in the journal  
- Mandatory accounts for basic CLI use  

---

## Marketing pairing

- **Hop pack** → switch *models* without re-briefing  
- **Cloud journal** → switch *devices* without losing continuity  

---

## Related

- Hop pack project: `docs/NEXT-PROJECT-1.1.md`  
- Architecture: `docs/ARCHITECTURE.md`  
- Security: `SECURITY.md`  

*DIGIVASCONNECT PTY (LTD) · PROXY JOURNAL future track*
