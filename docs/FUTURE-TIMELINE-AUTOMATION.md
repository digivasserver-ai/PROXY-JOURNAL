# Later project: Automate the multi-rail timeline

**ID:** PJ-AUTO-TIMELINE  
**Status:** Saved · seed live · full automation later  
**Org:** DIGIVASCONNECT PTY (LTD)  

## Goal

Drive **one timeline** that covers:

| Rail | Focus |
|------|--------|
| **product** | PROXY JOURNAL ship (hop, cloud, npm, robustness) |
| **brand** | Awareness — logos, social, posts, letterhead |
| **company** | DIGIVASCONNECT expansion — profile, pins, second products |
| **automation** | This system (YAML, next-task, reminders, journal bridge) |

Not only code. **Brand awareness and company expansion ride the same automated road.**

---

## Source of truth

| File | Role |
|------|------|
| `docs/roadmap/TIMELINE.yml` | All rails + tasks + status |
| `docs/FUTURE-BRAND-AND-COMPANY.md` | Brand + company strategy |
| `docs/FUTURE-CLOUD-SYNC.md` | Device hop product |
| `docs/NEXT-PROJECT-1.1.md` | Active hop ship |
| `scripts/roadmap-next.mjs` | Print next tasks |

---

## Vision

```
TIMELINE.yml  (product | brand | company | automation)
        │
        ▼
roadmap-next.mjs [--track brand]
        │
        ├── proxy-journal open/fact/log
        ├── weekly Grok/cron reminder (all rails)
        └── session brief: hop pack + “this week’s company/brand task”
```

**Balance rule:** After 1.1 is active/done, any weekly digest must include  
≥1 **brand** or **company** task — expansion does not wait for “when code is free.”

---

## Deliverables

### Done (seed)

- [x] Multi-rail `TIMELINE.yml` v2  
- [x] Brand + company strategy doc  
- [x] `roadmap-next.mjs` next-task printer  
- [x] Notes pointer  

### Later

- [ ] `--track product|brand|company|automation` filter  
- [ ] Journal bridge per rail  
- [ ] Weekly reminder multi-rail  
- [ ] `roadmap-session.mjs`  
- [ ] Optional GitHub Issues by track label  

---

## Success criteria

- [ ] Next-task output can show brand/company work, not only product  
- [ ] Weekly automation never drops brand/company for 3+ weeks  
- [ ] DIGIVASCONNECT expansion milestones visible in same file as hop pack  
- [ ] New hire/collaborator can read TIMELINE.yml and see the studio plan  

---

## Related

- Brand + company: `docs/FUTURE-BRAND-AND-COMPANY.md`  
- Data: `docs/roadmap/TIMELINE.yml`  
- Script: `scripts/roadmap-next.mjs`  

*DIGIVASCONNECT · automate product + brand + company along one road*
