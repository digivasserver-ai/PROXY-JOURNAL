# Later track: Brand awareness + DIGIVASCONNECT expansion

**Status:** Saved on automation timeline · not started as active sprint  
**Org:** DIGIVASCONNECT PTY (LTD)  
**GitHub:** digivasserver-ai  
**Flagship open product (now):** PROXY JOURNAL  

This track runs **alongside** product phases (1.1 hop, cloud sync, etc.).  
Automation timeline (`TIMELINE.yml` + `roadmap-next`) should surface **product + brand + company** work, not only code.

---

## Why three rails

| Rail | Job |
|------|-----|
| **Product** | Ship tools people can install and trust (CI, hop pack, cloud) |
| **Brand** | Look and sound like a real studio when discovered |
| **Company** | Expand DIGIVASCONNECT as the dev house behind the work |

Without brand/company rails, green CI stays invisible. Without product, brand is empty.

---

## Brand awareness (what “done” looks like)

### Assets (have / need)

| Asset | Local status | Public goal |
|-------|--------------|-------------|
| Logo mark + lockups | `brand/logos/` | On GitHub + profile |
| Social covers (X, LinkedIn, IG, YT, OG) | `brand/social/` | Uploaded to accounts |
| Letterheads | `brand/letterheads/` | Used for outreach PDF |
| Colors / usage | `brand/BRAND-COLORS.css`, `brand/README.md` | Linked from org profile |
| Press strip | `brand/export/` | Media kit zip |

### Awareness milestones

| ID | Milestone |
|----|-----------|
| **BA1** | Brand kit on GitHub (`brand/` or separate media repo) |
| **BA2** | digivasserver-ai profile: avatar, banner, bio, pin PROXY-JOURNAL |
| **BA3** | Consistent naming: DIGIVASCONNECT PTY (LTD) + digivasserver-ai |
| **BA4** | README visuals (hero, hop GIF, badge) |
| **BA5** | One public launch thread (X / LinkedIn / Dev.to) with hop --stats |
| **BA6** | Recurring presence: weekly or biweekly technical note |
| **BA7** | Letterhead used once for real outreach (partner, collab, job, client) |

### Voice (keep simple)

- Portable, honest, no hype stack  
- **Hop pack** = switch models without re-briefing  
- **Cloud journal** (later) = switch devices without losing continuity  
- Built by a real registered-style studio identity: DIGIVASCONNECT  

---

## Company expansion (dev house growth)

DIGIVASCONNECT is not only one repo — expansion means **capability + surface area**.

### Pillars

| Pillar | Expansion moves |
|--------|-----------------|
| **Open source** | PROXY JOURNAL 1.1 → 1.6; more small tools under digivasserver-ai |
| **Trust** | Green CI, MIT, SECURITY, clean Activity history |
| **Presence** | GitHub org/profile polish; social; optional site later |
| **Delivery** | Repeatable install paths; Termux/mobile story; client-ready letterhead |
| **Talent/story** | Portfolio narrative for jobs/clients: ship + brand + roadmap automation |
| **Pipeline** | Issues/roadmap public; “what’s next” always answerable |

### Company milestones

| ID | Milestone |
|----|-----------|
| **CX1** | Org/profile README: who we are, products, contact |
| **CX2** | PROXY JOURNAL as flagship pin + topics |
| **CX3** | Second public micro-tool or template (shows more than one product) |
| **CX4** | Standard project template (LICENSE, CI, SECURITY, brand hook) |
| **CX5** | Optional: digivasconnect site or Linktree-style hub |
| **CX6** | Optional: npm org / packages under digivas* |
| **CX7** | Process: TIMELINE.yml drives week focus (automation track) |

---

## How this rides the automation timeline

```
TIMELINE.yml
  track: product | brand | company | automation
       │
       ▼
roadmap-next.mjs  →  next 5 tasks across rails
       │
       ▼
proxy-journal fact/open  →  human focus
       │
       ▼
(later) weekly reminder  →  brand + company tasks not forgotten
```

**Rule:** After Phase 1.1 ships, weekly focus should always include **at least one brand or company task**, not only code.

---

## Suggested order (after 1.1)

1. **BA1–BA2** — brand public + profile (awareness foundation)  
2. **CX1–CX2** — company face matches product  
3. **BA4–BA5** — launch hop story with visuals  
4. **1.2 / BA6** — sustain awareness  
5. **1.6 cloud** + **CX3** — mobility story + second artifact  
6. **auto M2–M3** — keep all rails on the automated timeline  

---

## Success criteria (brand + company)

- [ ] Stranger can open GitHub and understand DIGIVASCONNECT in 30 seconds  
- [ ] PROXY JOURNAL looks intentional (logo, cover, hop story)  
- [ ] Timeline automation lists brand/company tasks next to product  
- [ ] One outbound use of letterhead or branded post exists  
- [ ] Roadmap answers “what is the company building next?”  

---

## Related files

| File | Role |
|------|------|
| `docs/roadmap/TIMELINE.yml` | Machine timeline (all rails) |
| `docs/FUTURE-TIMELINE-AUTOMATION.md` | Automate the timeline |
| `docs/FUTURE-CLOUD-SYNC.md` | Device hop product |
| `docs/NEXT-PROJECT-1.1.md` | Active hop ship |
| `brand/` | Asset kit (local) |
| `Notes/GitHub/PROJECT-BRAND-COMPANY-EXPANSION.txt` | Host pointer |

*DIGIVASCONNECT PTY (LTD) · brand awareness + company expansion track*
