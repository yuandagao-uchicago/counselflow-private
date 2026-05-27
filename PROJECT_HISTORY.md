# CounselFlow — Project History & Reference

*Snapshot at commit `4e82f2c` · 2026-05-26 · 59 commits since `59ff1c4` initial.*

A living reference covering what CounselFlow is, what's been built, how it's organized, and what's left. Synthesized from the product spec (`docs/CounselFlow Instruction Report 2.pdf`), git history, and the current codebase. Update as features ship.

---

## 1 · Product overview

**Core thesis.** *"We are building the operating system around a great counselor, not trying to replace the counselor."*

CounselFlow is a counselor-in-the-loop workflow system for private / independent college counselors. It is **not** a chatbot — counselors work through student records, tasks, briefs, and approvals. Chat is a helper, not the main product.

**Three value pillars:**

| Pillar | What it means in product |
|---|---|
| **Memory** | Remembers student state across sessions, meetings, documents, communications |
| **Orchestration** | Keeps workflow moving — milestones, tasks, reminders, review queue |
| **Preparation** | Turns raw materials (transcripts, docs, conversation) into counselor-ready outputs (briefs, drafts, summaries) |

**Critical product guardrails** (enforced in code, not just policy):

- Agent must **not** make final school-list decisions, write/edit essays, submit applications, send communications without counselor approval, or generate unsupported claims.
- Every AI output writes an `AIOutput` row recording: `sourceBasis`, `confidence`, `modelId`, `tokenUsage`, `humanReviewRequired`. Helper: `src/ai/provenance.ts → createAIOutput()`.
- Three autonomy modes (`AutonomyMode` enum): **Suggest**, **Draft**, **Execute with approval**. MVP stays in Suggest/Draft only.
- All externally-meaningful AI outputs (parent emails, recommender requests, summaries the student sees) pass through `ReviewQueueItem` before any action is taken.
- Tenant isolation: every student belongs to a `counselorId`. All queries filter by `counselorId`. Helper: `src/server/lib/tenant.ts → verifyStudentOwnership()`.

**Why this market.** Private counselors spend **51%** of workday on admissions work (vs. 22% in public school). ~50–65% of the workflow is AI-augmentable at the *operations* layer (not the strategy layer). Source: `docs/CounselFlow Instruction Report 2.pdf` (20 pages).

---

## 2 · Tech stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js 15 (App Router) + TypeScript strict | React 19, Turbopack dev |
| Database | PostgreSQL (Neon) + Prisma 6 | 24 models |
| API | tRPC v11 | 16 routers, see §5 |
| UI | Tailwind CSS v4 + shadcn/ui + Base UI (`@base-ui/react`) | Almanac design system (§6) |
| Auth | Clerk (`@clerk/nextjs`) | Migrated from Better Auth in commit `77016e5` |
| AI | Gemini 2.5 Flash Lite (primary) via `@google/generative-ai` | Migrated from Claude in `b87b3e0`; lite primary since `0654a25`; retry + fallback in `06d3420` |
| File Storage | Vercel Blob | Upload allowlist + SSRF guard in `794014e` |
| Background Jobs | Inngest | |
| Email | Resend | |
| Meetings | Recall.ai bots + Zoom cloud-recording import + manual `.vtt` upload | `9cf4c77`, `6c86f2a`, `99d3778` |
| Rate Limit | Upstash Redis (`@upstash/ratelimit`) | Fail-closed in prod (`794014e`); KV_* env var support (`ad7bbc3`) |
| Deployment | Vercel | Free hobby tier currently |
| Error tracking | **None yet** | Sentry deferred — see §10 |

---

## 3 · Project structure

```
counselFlow/
├── prisma/
│   ├── schema.prisma          # 24 models, 25 enums — full domain
│   └── seed.ts                # Milestone templates + sample students
├── scripts/
│   ├── seed-demo-content.ts   # Comprehensive MVP demo seed (ce90f9e)
│   ├── seed-demo-extra.ts     # Demo seed round 2 (39078e6)
│   ├── seed-demo-applications.mjs
│   ├── seed-test-students.ts
│   └── test-scholarship-search.ts
├── docs/
│   └── CounselFlow Instruction Report 2.pdf  # 20-page product spec
├── public/
│   └── hero.mp4               # Landing hero video (4.8 MB)
├── src/
│   ├── app/
│   │   ├── page.tsx                          # Cinematic landing hero (anonymous)
│   │   ├── (app)/                            # Authenticated app shell
│   │   │   ├── dashboard/                    # Counselor home
│   │   │   ├── students/                     # List + [id] case file + journey + apps + meetings
│   │   │   ├── approvals/                    # Review queue
│   │   │   ├── readiness/                    # Application readiness across students
│   │   │   └── settings/
│   │   ├── sign-in / sign-up / respond /
│   │   └── api/                              # tRPC, Clerk, Inngest, blob, webhooks
│   ├── server/
│   │   ├── routers/                          # 16 tRPC routers (§5)
│   │   ├── lib/                              # Tenant helpers, context
│   │   └── trpc.ts                           # tRPC init + auth + AI throttle
│   ├── ai/
│   │   ├── client.ts                         # Gemini SDK singleton + retry/fallback
│   │   ├── prompts/
│   │   ├── schemas/                          # Zod schemas for structured outputs
│   │   └── provenance.ts                     # createAIOutput()
│   ├── components/
│   │   ├── ui/                               # shadcn primitives
│   │   ├── layout/                           # Sidebar, top bar
│   │   ├── student/                          # Case file pieces, guardians, scholarships, header
│   │   ├── application/                      # Readiness bar, checklists, app cards
│   │   ├── journey/                          # Header, callout, node, complete
│   │   ├── meeting/                          # Prep brief, summary, recall panel, zoom import
│   │   ├── approval/                         # Review queue UI
│   │   ├── dashboard/                        # Counselor home tiles
│   │   ├── shared/                           # ProgressRing, EmptyState, SchoolLogo, SectionDivider
│   │   ├── marketing/                        # landing-hero.tsx
│   │   ├── auth/                             # auth-shell.tsx
│   │   └── scheduling/                       # request-meeting-dialog
│   ├── lib/
│   │   ├── phase.ts                          # Student-phase color tokens
│   │   ├── prisma.ts                         # Singleton client
│   │   ├── auth-server.ts                    # Clerk + DB user sync
│   │   ├── rate-limit.ts
│   │   ├── trpc.ts                           # React client
│   │   └── scholarship/                      # Catalog + ranking + profile
│   └── middleware.ts                         # Clerk public-route matcher
├── AGENTS.md                                 # Agent deny list, never-touch rules
├── CLAUDE.md                                 # Project instructions for Claude Code
└── PROJECT_HISTORY.md                        # ← this file
```

---

## 4 · Data domain (Prisma)

24 models. Roughly grouped:

**People & access**
- `User` — counselor (Clerk-synced); root of tenant isolation
- `Integration` — per-counselor third-party tokens (Zoom, Recall, etc.)
- `Student` — case (belongs to counselor)
- `Guardian` — parent / sponsor contact info
- `StudentRecommender` — teacher/counselor recs being requested

**Schools & applications**
- `School` — catalog entry (curated, shared across counselors)
- `SchoolRequirement` — checklist template per school
- `Application` — student-to-school link with type (EA/ED/RD), platform, status
- `ApplicationRequirementItem` — per-app instance of a SchoolRequirement
- `Activity` — extracurricular / résumé item
- `EssayArtifact` — essay drafts (status tracked, never AI-written)
- `SubmissionEvent` — audit log of what got submitted when

**Workflow**
- `Milestone` + `MilestoneTemplate` — application-cycle checkpoints (research, testing, app, essays, recs, financial aid). Reconciler runs in `milestone.ts`.
- `Task` — small action items, can be AI-extracted from meetings
- `Meeting` — recorded/imported meeting; holds prep brief + post-meeting summary
- `MeetingRequest` + `MeetingRequestSlot` — magic-link scheduling (`7da20eb`)
- `Communication` — outbound messages (parent updates, recommender requests)
- `Document` — uploaded student docs (résumé, transcript, etc.) with AI extraction
- `RiskFlag` — counselor-flaggable concerns on a student

**AI & review**
- `AIOutput` — provenance row for every AI generation (model, tokens, confidence, source basis)
- `ReviewQueueItem` — counselor review pipeline for externally-facing outputs

**Scholarships**
- `SavedScholarship` — counselor-bookmarked match for a student (`771a875`)

---

## 5 · tRPC routers (feature surface)

`src/server/routers/`:

| Router | What it owns |
|---|---|
| `student.ts` | CRUD, profile, phase transitions, ownership-checked queries |
| `guardian.ts` | Parent/sponsor CRUD on a student (`6a25602`) |
| `school.ts` | School catalog read |
| `application.ts` | Application + requirement items, readiness derivation |
| `milestone.ts` | Templates, seed for student, reconciler, status updates |
| `meeting.ts` | Recall bot + Zoom cloud import + .vtt import + prep brief + summary |
| `meetingRequest.ts` | Magic-link scheduling internal API |
| `publicMeeting.ts` | Public-token RSVP endpoint (consumed by `/respond/[token]`) |
| `document.ts` | Blob upload completion, AI extraction, confirm SSRF-safe |
| `recommender.ts` | Brag sheets + recommender request emails + review queue |
| `review.ts` | Approve / reject AI outputs from the review queue |
| `scholarship.ts` | Per-student ranked match with explainable scoring |
| `weeklyUpdate.ts` | Drafts the weekly parent/student update (`d2eccca`) |
| `dashboard.ts` | Counselor-home aggregates (`7909654`) |
| `integration.ts` | Zoom + Recall connection state |
| `index.ts` | App router composition |

---

## 6 · Design system — "The Almanac"

Established in commit **`b4f6587 feat(ui): The Almanac — full design language reset (wave D)`**. Source of truth lives in `src/app/globals.css` (CSS custom properties under `:root` and `.dark`) and `src/lib/phase.ts` (phase-color tokens).

**Palette (light theme):**

| Token | Meaning | Color |
|---|---|---|
| `--background` | parchment cream | `oklch(0.962 0.018 80)` |
| `--foreground` | deep ink | `oklch(0.18 0.022 30)` |
| `--almanac-oxblood` | primary accent | `oklch(0.34 0.13 25)` |
| `--almanac-brass` | secondary accent | `oklch(0.66 0.15 75)` |
| `--almanac-sage` | tertiary accent | `oklch(0.46 0.09 155)` |
| `--almanac-paper` | surface | `oklch(0.962 0.018 80)` |

**Phase tokens** (`src/lib/phase.ts`, used on student avatars, pills, milestone nodes):

| Phase | Light theme | Visual |
|---|---|---|
| `EXPLORATION` | brass | warm yellow-orange |
| `LIST_BUILDING` | navy | cool deep blue |
| `TESTING` | terracotta | warm red-orange |
| `APPLICATIONS` | oxblood | deep red-brown |
| `ESSAYS` | oxblood-soft | brighter red-brown |
| `SUBMISSIONS` | navy-deep | very dark blue |
| `DECISIONS` | brass-deep | darker brass |
| `ENROLLMENT` | sage | muted green |

**Typography:**

| Var | Font | Use |
|---|---|---|
| `--font-sans` | DM Sans (variable, opsz axis) | Body, UI |
| `--font-display` | Bodoni Moda (variable, opsz axis) | Display headlines (Didone drama) |
| `--font-serif` | Instrument Serif | Editorial italic pulls |
| `--font-mono` | JetBrains Mono | Tabular data only |

**Utility classes** (selected, in `globals.css`):

- `.paper-grain` — fractal noise texture for tactile warmth
- `.ambient-backdrop` — three soft radial pools behind content
- `.topo-bg` — topographic line texture for "instrument panel" surfaces
- `.ledger-lines` — engraved horizontal ruling for almanac feel
- `.almanac-border` — double-rule book-frame border
- `.glass-card`, `.glow-card`, `.gradient-text`, `.shimmer`, `.pulse-glow`
- `.under-draw` — animated underline on hover for editorial links
- `.stroke-draw` — SVG path drawing animation
- `.stagger-rise` — list entrance animation using `--i` index custom property
- `.count-in` — number-card mount animation
- `.journey-spine-grow` — central-line draw for journey page (`4e82f2c`)

**Landing-specific utilities** (added in `4e82f2c`, scoped to marketing hero only):
- `.liquid-glass` — gradient-border glass pill for the CTA
- `.animate-fade-rise(/-delay/-delay-2/-delay-3/-delay-4)` — staggered entrance
- `.word-wrap` + `.word-inner` + `@keyframes word-rise` — per-word clip reveal on the headline
- `.status-dot` — eyebrow pulse
- `.hero-video-breathe` — slow Ken Burns scale on the background video
- `.text-scrim` — soft text-shadow halo for legibility over video
- `.cta-arrow`, `.sign-in-link` underline grow

---

## 7 · UI rollout history (waves)

| Wave | Commit | What changed |
|---|---|---|
| Pre-wave | `de27bca`, `5af01c5` | Student case file (Apple × Netflix dark theme), light + dark toggle, PandaScore-style polish |
| **A** | `17fe0cc feat(ui): editorial case-file student page` | Student `[id]` page recast as editorial "case file" with phase tones |
| **B** | `21f4404 feat(ui): polish pass — logos, empty states, sidebar, stat cards` | School-logo component, empty-state component, sidebar refinements, stat cards |
| **C** | `c0a01cd feat(ui): branded landing page + auth shell` | Full marketing landing (Header / Hero / PullQuote / FeatureGrid / ClosingCTA / Footer) + auth shell. **Replaced 2026-05-26 by `4e82f2c`** — wave-C marketing content recoverable via `git show c0a01cd:src/app/page.tsx`. |
| **D** | `b4f6587 feat(ui): The Almanac — full design language reset` | Parchment cream + oxblood + sage + brass palette, Bodoni Moda + Instrument Serif typography, double-rule borders, paper-grain texture, topographic backgrounds — all of §6 |
| D-polish | `0f83bd6 fix(ui): consistency pass — phase tones, dark mode, sidebar mark` | Cross-component phase-tone usage cleanup |

**Dark-mode iterations** (sub-pillar of wave D):

| Commit | Theme name | Vibe |
|---|---|---|
| `750e31f` | **Midnight Atlas** | Cool navy + brass |
| `0ec6aea` | **Highlighter** | Spotify-style, signature warm yellow |
| `4f03109` | **Late Library** *(current)* | Natural muted tones — sage, terracotta, dusty teal, mulled wine, ochre at low chroma; honey signature; tinted chips (15% bg + full-saturation text) instead of solid pills |

**Latest landing** (`4e82f2c`, this session — 2026-05-26): Cinematic single-screen hero, navy + Instrument Serif, looping whale-fall video, glass CTA, per-word headline reveal, "Private Beta · Summer 2026" eyebrow status tag, "Join the early circle" CTA. Replaces the wave-C marketing page (recoverable from `c0a01cd`).

---

## 8 · Feature inventory (MVP-1 complete)

MVP-1 closed **2026-05-12** at commit `d2eccca`. The 8-feature scope band from `docs/CounselFlow Instruction Report 2.pdf`:

| # | Feature | Lead commit(s) |
|---|---|---|
| 1 | Student case file + profile ingestion | `de27bca`, `17fe0cc`, `461b0d0` (AI doc upload + profile extraction) |
| 2 | Meeting prep brief | `99d3778`, `3eb506b` (one-click), `9cf4c77` (Recall), `9985eeb` |
| 3 | Post-meeting summary + task extraction | `99d3778`, `3c6ff4b` (task refresh), `6c86f2a` (.vtt import) |
| 4 | Milestone tracker (with reconciler) | `d41dcc3`, `9985eeb` (engine + queue), `7da20eb` |
| 5 | Requirement tracker | `7da20eb` |
| 6 | Application readiness dashboard | `7da20eb` |
| 7 | Draft-only weekly parent/student updates | `d2eccca` |
| 8 | Recommendation request workflow | `b54b822` (brag sheets, request emails, review queue) |

**Beyond MVP-1, also shipped:**

- **Guardian CRUD** on student page (`6a25602`)
- **Scholarship matcher** — per-student ranked, explainable scoring, savable (`771a875`)
- **AI document upload + profile extraction** (`461b0d0`)
- **Zoom cloud recording import** + **Recall.ai meeting bot** (`9cf4c77`)
- **`.vtt` transcript import** (Zoom/Meet/Teams) (`6c86f2a`)
- **Magic-link scheduling** — student RSVP via emailed token (`7da20eb`)
- **Counselor dashboard** — wired to real data (`7909654`)
- **AI retry + fallback model** on Gemini 503/429/5xx (`06d3420`)
- **Task delete** on each card (`23d42a8`)
- **Two demo seed scripts** (`ce90f9e`, `39078e6`) — diverse roster for review-queue lighting

---

## 9 · Security hardening (2026-05-12 audit pass)

A 7-layer security audit ran 2026-05-12, closing 4 Highs and several Mediums in commit **`794014e`**. `npm audit` went from 11 vulns → 0.

**Closed in `794014e` and earlier:**

- Rate limiter **fail-closed** in production (was fail-open silently if Upstash was unreachable)
- Blob upload **ownership check** — uploads can't be claimed by another counselor
- `document.confirmUpload` **SSRF guard** — Vercel Blob host allowlist
- Recall webhook **HMAC length guard**
- `@clerk/nextjs` CVE bump
- Next 16.2.4 → 16.2.6 (middleware-bypass + cache-poisoning advisories)
- `postcss` override for transitive XSS
- **CI workflow** at `.github/workflows/ci.yml`
- **`AGENTS.md` deny list** — never-touch rules for agent collaborators

**Deferred (in order of priority):**

1. **Sentry / error tracking** — production has zero error tracking; relies on Vercel function logs (no alerting, low retention). Needs an account + DSN from the user. *Alternatives:* Axiom, Logflare, Better Stack.
2. **Per-call Gemini token caps + daily $-budget kill switch** — wrapper has retries but no `maxOutputTokens` cap and no daily spend cap. Cost-runaway protection.
3. **Husky pre-commit hooks** — CI catches the same things on push; lower priority.
4. **Webhook AI throttle by counselorId** — `processMeetingNotes` from the Recall webhook path bypasses the per-user AI throttle. A misbehaving Recall integration could fan out AI calls.
5. **Per-user daily AI usage alerts** — token usage is already logged to `AIOutput.tokenUsage`; just needs a daily Inngest cron summing per counselor + threshold alert.

---

## 10 · Operations

**Commands (`package.json`):**

```bash
npm run dev          # next dev --turbopack
npm run build        # prisma generate && next build
npm run lint
npm run db:push      # prisma db push
npm run db:migrate   # prisma migrate dev
npm run db:generate
npm run db:seed      # npx tsx prisma/seed.ts
npm run db:studio
```

**Demo seeds (manual run):**

```bash
npx tsx scripts/seed-demo-content.ts        # ce90f9e — full MVP demo
npx tsx scripts/seed-demo-extra.ts          # 39078e6 — round 2 (review queue items)
npx tsx scripts/seed-test-students.ts
```

**Env vars required** (`.env.example` template at `bc711bc`):

| Var | Source |
|---|---|
| `DATABASE_URL` | Neon Postgres |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` + `CLERK_SECRET_KEY` | Clerk |
| `GEMINI_API_KEY` | Google AI Studio (free tier) |
| `RESEND_API_KEY` | Resend |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob |
| `RECALL_API_KEY` + `RECALL_WEBHOOK_SECRET` | Recall.ai |
| `ZOOM_CLIENT_SECRET` | Zoom |
| `KV_REST_API_URL` + `KV_REST_API_TOKEN` *or* `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` | Vercel KV / Upstash Redis (rate limit) |

`AGENTS.md` is the deny list — never log or print env values.

**Branches:**

- `master` — production / deployed
- `wip/landing-cinematic-experiment` (local, commit `7c2c078`) — pre-pull sandbox of the cinematic landing iteration; superseded by `4e82f2c`. Safe to delete with `git branch -D wip/landing-cinematic-experiment` when no longer wanted.

---

## 11 · MVP-2 candidate features (ranked)

From the product report §5, in rough priority order:

1. **Activity description assistant** (§6.4) — normalize raw activity text, flag vague descriptions, check cross-document consistency. IECA rules forbid inflated claims → must *flag*, not rewrite.
2. **Document consistency checker** — catch contradictions across résumé / essays / activities (e.g. "200 hours" vs "100 hours").
3. **Application assembly engine** (§6.7) — map student data to Common App fields, detect missing fields, detect contradictions.
4. **Proactive dashboard "chief of staff" surface** (§10.4) — synthesis over existing data ("3 students need attention today", "1 application missing testing data").
5. **Testing strategy assistant** (§6.5) — requirements, timelines, study plans, English-proficiency tracking.
6. **Essay-process operations layer** — status tracking and reminders, **not** writing/editing.

---

## 12 · Full commit timeline

Newest first. Subject only — see `git log` for full bodies.

```
4e82f2c  feat(ui): cinematic landing hero + journey page polish        [2026-05-26 — this session]
39078e6  chore(scripts): demo seed round 2 — diverse roster + review queue lighting
ce90f9e  chore(scripts): comprehensive demo seed for the MVP presentation
4f03109  fix(ui): dark mode → "Late Library" — natural muted tones + tinted chips
0ec6aea  fix(ui): dark mode → "Highlighter" — Spotify-style w/ signature yellow
750e31f  fix(ui): dark mode pivot — Midnight Atlas (cool navy + brass)
0f83bd6  fix(ui): consistency pass — phase tones, dark mode, sidebar mark
b4f6587  feat(ui): The Almanac — full design language reset (wave D)
f0bf537  fix(layout): drop weight prop on Fraunces so axes work
c0a01cd  feat(ui): branded landing page + auth shell (wave C)
21f4404  feat(ui): polish pass — logos, empty states, sidebar, stat cards (wave B)
17fe0cc  feat(ui): editorial case-file student page (wave A)
e1c3a66  fix(quick-actions): remove stub Draft Update + Quick Note buttons
771a875  feat(scholarship): per-student matcher with explainable ranking
6a25602  feat(guardian): CRUD UI on the student page
36587e2  chore(deps): pin protobufjs ^8.2.0 under otlp-transformer to clear audit
ad7bbc3  fix(rate-limit): accept Vercel KV_* env vars from Marketplace Upstash
d2eccca  feat: weekly parent/student update drafter — closes MVP-1   [2026-05-12]
794014e  fix: security audit pass — rate-limit fail-closed, blob ownership, SSRF guard, CI
3301a2e  fix: bugs found via end-to-end browser testing
1e9c40f  fix: revert middleware CSP — was blocking Clerk JS in production
b54b822  feat: recommendation workflow — brag sheets, request emails, review queue
b324532  fix: comprehensive security audit and logic bug fixes
7da20eb  feat: application readiness, magic-link scheduling, milestone reconciler
ceed383  fix: audit pass — atomicity, pagination, race safety, defense-in-depth
f040d70  chore: log blob token minting steps for easier diagnosis
67dbab6  fix: surface real error when Vercel Blob store isn't connected
3c6ff4b  fix: refresh student tasks after AI extracts action items
a726b6b  fix: show correct phase during document upload
23d42a8  feat(tasks): add delete button on each task card
6084cb7  chore: trigger redeploy with correct author email
0654a25  perf(ai): swap primary model to gemini-2.5-flash-lite
f8290ec  fix(ai): resilient meeting creation + handle deleted-while-running
06d3420  feat(ai): retry + fallback model on Gemini 503/429/5xx
bc711bc  docs: add .env.example template
f8e8901  build: generate Prisma client on install + before next build
461b0d0  feat: AI document upload + profile extraction
5863c08  fix(button): silence base-ui nativeButton warning when render=<Link>
3b808c1  fix(theme): switch to one-click toggle, improve reliability
5af01c5  feat(style): light + dark theme toggle, cinematic PandaScore-style polish
d41dcc3  feat: Journey page + integration status rework
03a2206  fix: comprehensive logic audit — fix 14 issues across the app
9985eeb  feat: profile editor + milestone engine + approval queue
9cf4c77  feat: Zoom cloud recording import + Recall.ai meeting bot
6c86f2a  feat: import meeting transcripts from .vtt files (Zoom/Meet/Teams)
123951c  fix: comprehensive logic audit — fix 14 issues across the app
e1a4d82  fix: add meeting delete, fix dashboard upcoming meetings
7909654  feat: wire dashboard to real data
3eb506b  fix: generate prep brief in one click, no dialog
8ee9e25  feat: wire up quick action buttons on student case page
b87b3e0  refactor: switch AI from Claude to Gemini 2.0 Flash (free tier)
05e35b8  feat: add Framer Motion animations throughout the app
99d3778  feat: add AI meeting workflow (prep briefs + post-meeting summaries)
804c5aa  style: switch to Inter + Space Grotesk fonts
de27bca  feat: add student case file page with Apple x Netflix dark theme
77016e5  refactor: switch from Better Auth to Clerk
5ca5e28  feat: set up CounselFlow MVP foundation
6769bd4  feat: initial commit
59ff1c4  Initial commit from Create Next App
```

---

## 13 · How to keep this doc current

This is a snapshot, not a generated artifact. The honest minimum:

- After each significant shipped feature: add a bullet under **§8 Feature inventory** with the commit hash.
- After each design pass: add a row under **§7 UI rollout history**.
- After each security fix: update **§9**.
- When a security follow-up gets closed: move it out of the "deferred" list into the "closed" list.
- The commit timeline (§12) is regeneratable from `git log --oneline` — refresh it once every ~10 commits or whenever you're updating the doc anyway.

This doc lives next to `CLAUDE.md` and `AGENTS.md`. It is **not** a substitute for reading the schema or routers when you need ground truth — it's a map, not the territory.
