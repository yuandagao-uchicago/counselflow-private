<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Deny list — agent must never

- Read, modify, or print the contents of `.env`, `.env.local`, `.env*.local`, or `/.clerk/`
- Log or include the values of `process.env.*` secrets in chat, commits, or generated code. Specifically: `DATABASE_URL`, `CLERK_SECRET_KEY`, `GEMINI_API_KEY`, `RESEND_API_KEY`, `BLOB_READ_WRITE_TOKEN`, `RECALL_API_KEY`, `RECALL_WEBHOOK_SECRET`, `ZOOM_CLIENT_SECRET`, `UPSTASH_REDIS_REST_TOKEN`. Reading `.env.example` is fine — it only contains placeholder names.
- Push to `main`/`master`, force-push any branch, or amend already-pushed commits
- Run `npm audit fix --force`, `prisma migrate reset`, `prisma db push --force-reset`, or any `DROP` / `TRUNCATE` SQL against any database (local or remote)
- Send real email through Resend, send real SMS, mint real Zoom meetings, or call any third-party write API (Recall.ai, Vercel Blob delete) without an explicit ask in the current turn
- Disable or relax: middleware auth, Clerk gates, the review-queue gate on AI outputs, rate-limiter fail-closed behavior, webhook signature verification, or tenant-ownership checks (`verifyStudentOwnership`, `counselorId` filters)
- Skip git hooks (`--no-verify`, `--no-gpg-sign`) or bypass CI
- Modify `.github/workflows/`, `vercel.json`, or `middleware.ts` matcher rules without confirming the change

# Always

- Use Read / Edit / Grep / Glob tools over Bash for file ops
- Confirm before destructive actions even when "obvious"
- When in doubt about a secret, treat it like a secret
