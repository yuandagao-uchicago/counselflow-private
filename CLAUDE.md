# CounselFlow

AI-powered workflow operating system for private/independent college counselors.

## Project Overview

CounselFlow is a counselor-in-the-loop workflow system. The AI agent handles repetitive operational tasks (remembering student state, drafting communications, tracking milestones, preparing meeting briefs) so counselors can focus on strategy, nuance, and relationship-heavy advising.

**Core design principle:** The counselor communicates with the agent by working through student records, tasks, briefs, and approvals -- chat is a helper, not the main product.

**Core product sentence:** "We are building the operating system around a great counselor, not trying to replace the counselor."

## Tech Stack

- **Framework:** Next.js 15 (App Router) + TypeScript (strict)
- **Database:** PostgreSQL (Neon) + Prisma
- **API:** tRPC v11
- **UI:** Tailwind CSS v4 + shadcn/ui
- **Auth:** Better Auth (Prisma adapter, email+password + Google)
- **AI:** Claude API (@anthropic-ai/sdk) with structured outputs + prompt caching
- **File Storage:** Vercel Blob
- **Background Jobs:** Inngest
- **Deployment:** Vercel

## Project Structure

```
counselFlow/
├── prisma/
│   ├── schema.prisma          # Domain model (all entities)
│   └── seed.ts                # Seed milestone templates + sample data
├── src/
│   ├── app/                   # Next.js App Router pages
│   │   ├── (auth)/            # Login, register (no sidebar)
│   │   ├── (app)/             # Authenticated app (sidebar layout)
│   │   │   ├── dashboard/     # Counselor home
│   │   │   ├── students/      # Student list + [studentId]/ case pages
│   │   │   ├── approvals/     # Review queue
│   │   │   └── settings/      # Account settings
│   │   └── api/               # tRPC, auth, inngest endpoints
│   ├── server/
│   │   ├── routers/           # tRPC routers (one per domain)
│   │   ├── lib/               # Tenant query helpers, context
│   │   └── trpc.ts            # tRPC init + auth middleware
│   ├── ai/
│   │   ├── client.ts          # Anthropic SDK singleton
│   │   ├── prompts/           # Prompt templates per feature
│   │   ├── schemas/           # Zod schemas for structured AI outputs
│   │   └── provenance.ts      # AIOutput record creation helper
│   ├── lib/
│   │   ├── prisma.ts          # Prisma singleton
│   │   ├── auth.ts            # Better Auth server config
│   │   ├── auth-client.ts     # Better Auth client hooks
│   │   └── utils.ts           # Shared utilities (already created by shadcn)
│   ├── components/
│   │   ├── ui/                # shadcn/ui primitives (auto-generated)
│   │   ├── layout/            # Sidebar, top bar, app shell
│   │   ├── student/           # Student-related components
│   │   ├── meeting/           # Meeting workflow components
│   │   ├── approval/          # Review queue components
│   │   └── shared/            # Status badges, empty states, etc.
│   └── hooks/                 # Custom React hooks
├── .env.local                 # Environment variables (not committed)
└── CLAUDE.md
```

## Key Conventions

- **Tenant isolation:** Every student belongs to a counselor (counselorId). All queries MUST filter by counselorId. Use `verifyStudentOwnership()` from `src/server/lib/tenant.ts` before any student-scoped operation.
- **AI provenance:** Every AI-generated output creates an `AIOutput` record with: sourceBasis, confidence, modelId. Use `createAIOutput()` from `src/ai/provenance.ts`.
- **Review queue:** All externally-meaningful AI outputs (drafts, summaries, suggestions) go through the review queue. Counselor must approve before any action is taken.
- **Three autonomy modes:** Suggest (AI proposes), Draft (AI drafts for review), Execute (AI acts with approval). MVP stays in Suggest/Draft.
- **Server Components by default.** Only add `"use client"` where interactivity is needed.
- **tRPC for all data fetching/mutations.** Server Actions only for simple form-bound operations.

## AI Guardrails

The agent must NOT:
- Make final school-list decisions or determine admissions strategy
- Write or heavily edit student essays
- Submit applications or send communications without counselor approval
- Generate unsupported claims in activities or application materials
- Act as if it knows the student better than the counselor

Every AI output must show:
- Source basis (what data informed this output)
- Confidence level (high/medium/low)
- Whether human review is required

## Commands

```bash
npm run dev          # Start dev server (localhost:3000) with Turbopack
npm run build        # Production build
npm run lint         # Run ESLint
npm run db:push      # Push Prisma schema to database
npm run db:migrate   # Run Prisma migrations
npm run db:generate  # Generate Prisma client
npm run db:seed      # Seed sample data
npm run db:studio    # Open Prisma Studio
```

## Environment Variables

Required in `.env.local`:
```
DATABASE_URL=              # Neon PostgreSQL connection string
ANTHROPIC_API_KEY=         # Claude API key
BETTER_AUTH_SECRET=        # Random secret for auth
BETTER_AUTH_URL=http://localhost:3000
BLOB_READ_WRITE_TOKEN=     # Vercel Blob token (optional for MVP)
```
