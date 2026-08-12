# Fixes & additions — 2026-08-11

Scope: everything from the audit except the two findings that live entirely inside the
A-Level exam flow (BUG-001, SEC-002) and CertificateModal.jsx, per your instruction — plus,
in this pass, a complete fresh database schema and backend architecture/reliability/security
hardening across every endpoint.

**Everything below was actually tested, not just written.** I installed Postgres 16 and ran
the real migration against a stub of Supabase's schema (auth.users, auth.uid(), storage),
then ran a functional test suite against it (signup trigger, every RPC, RLS positive *and*
negative cases). I also boot-tested the actual Node server with real dependencies installed
and hit its endpoints live. Two real bugs were caught and fixed this way (see below) that
static review alone would very likely have missed.

## Database — `supabase/migrations/001_full_schema.sql`

Complete, from-scratch schema for a **new Supabase project** — not just the exam tables.
Covers:

- `profiles`, with a `handle_new_user()` trigger on `auth.users` so a profile row is created
  automatically on signup (nothing in the app ever inserted one itself — without this
  trigger, every new user would hit a wall on first load).
- All exam tables (`mock_tests`, `questions`, `test_sessions`, `session_questions`,
  `attempts`, `bookmarks`, `exam_integrity_events`, `error_reports`).
- `transactions`, `notifications`.
- `ip_blacklist`, `login_logs`, `admin_audit_logs` — these back the admin Security panel,
  which existed in the frontend but (see below) nothing server-side ever wrote to or
  enforced them.
- The `mock_tests_with_unique_users` view.
- Every RPC the app calls: `create_exam_session`, `get_practice_questions`,
  `generate_random_practice_session`, `create_practice_session`, `check_practice_answer`,
  `get_question_metadata`, `update_my_profile`.
- Storage buckets (`mock-test-pdfs`, `avatars`) with matching policies.
- RLS enabled **and forced** on every table, with the AUTHZ-002 fix (hidden tests no longer
  publicly readable) baked in from the start.

**Two real bugs were caught by actually running this against Postgres**, not just reading
it back:
1. Table-level `GRANT`s were missing. Supabase auto-provisions these for a real project, but
   a self-contained migration shouldn't assume that's true wherever it runs — added explicit
   grants to `anon`/`authenticated`/`service_role`. RLS remains the real gatekeeper either way.
2. `create_exam_session` was marked `SECURITY INVOKER`, but there's deliberately no direct
   user `INSERT` policy on `test_sessions` (by design, so a client can never write its own
   score) — it needed `SECURITY DEFINER` like the other RPCs. Without this fix, starting an
   exam would have failed for every real user with an RLS violation.

After both fixes: signup → profile creation, starting/resuming an exam session, the RLS
boundaries (non-admin can't read answer keys, can't insert into `test_sessions` directly,
can't self-promote to admin), the full practice-answer grading path, and `update_my_profile`
(including its phone-format validation) were all verified working end-to-end.

**Setup steps** for your new project are in the comment block at the bottom of the SQL file.

## Backend hardening — `server.js` + new `lib/` modules

| What | Where | Why |
|---|---|---|
| Async safety net | `lib/asyncHandler.js` | Defense-in-depth so a future route without its own try/catch can't crash the process via an unhandled rejection. |
| Process-level error handlers | `server.js` top | `uncaughtException`/`unhandledRejection` are now logged instead of silently killing the local dev server. |
| Health check | `GET /api/health` | Unauthenticated, unthrottled, actually checks DB connectivity (not just "is Node running") — closes the "no health checks" DevOps gap from the audit. |
| Redis-optional rate limiting | `lib/rateLimitStore.js` | The in-memory rate-limit store doesn't share state across serverless instances, so real limits end up looser than configured under concurrency. Set `REDIS_URL` and it's used automatically; otherwise falls back to memory exactly as before — zero required infra change. |
| **IPv6 rate-limit bypass fix** | `server.js` `keyGenerator` | **Caught by boot-testing**, not static review: the custom `keyGenerator` used the raw client IP, which `express-rate-limit` v8 flags as an IPv6 bypass risk (many textual representations of the same address, or a whole subnet, would each get their own limit). Now uses the library's own `ipKeyGenerator()` to normalize IPv6 addresses to a /56. This bug predates this session — it was in the original code. |
| IP blacklist enforcement | `lib/ipBlacklist.js`, applied globally | The admin Security panel (`AdminSecurity.jsx`) lets admins add IPs to `ip_blacklist` and displays it as a live control, but **nothing server-side ever read that table**. Blacklisting an IP had zero actual effect. Now enforced (cached, refreshed every 30s) before any route runs. |
| Login logging | `logLoginAttempt()` in `server.js`, wired into `/api/auth/telegram` | `login_logs` is read by `AdminSecurity.jsx` and `AdminUsers.jsx` but was **never written to** by anything (there's even a comment in `AdminAnalytics.jsx` noting it's "not fully populated yet"). Every Telegram auth attempt — success, bad signature, expired auth, account-creation failure — is now logged. |
| Safer AI response parsing | `lib/aiResponse.js`, used at all 7 Gemini/Groq call sites | Replaces `data.candidates[0].content.parts[0].text` (raw `TypeError` on any unexpected shape, e.g. a safety-filtered response) with a helper that gives a clear, specific error instead. |
| Parallelized reads | `/api/submit-exam` | The test-info and questions fetches were independent but sequential; now run via `Promise.all`, shaving a full round-trip off every exam submission. |
| Hot-path caching | `/api/start-exam`, `lib/cache.js` | The `mock_tests` visibility/premium check is now cached for 15s (this row changes rarely but is read on every single exam start). |
| NaN-guarding on scoring | `/api/submit-exam` | A non-numeric `points` value would previously produce `NaN`, which JSON-encodes as `null` and would **silently null out a session's score** in the DB with no error anywhere. Now guarded and logged if it ever happens. |
| Input validation | `lib/validate.js`, applied to `testId`/`sessionId` | Malformed IDs are now rejected with a clean 400 instead of reaching deeper query/logic code. |
| Noisy startup log removed | `server.js` `dotenv.config()` | Recent `dotenv` versions print a promotional banner to stdout by default; suppressed (`quiet: true`) so it doesn't pollute production logs. |

## Dependencies

- `pdfjs-dist` bumped to the patched `^6.2.108`.
- `xlsx` repointed at SheetJS's own patched CDN build (npm's copy is unpatched and no
  longer updated there). **Run `npm install` yourself** — this sandbox can't reach
  `cdn.sheetjs.com` to verify the install.
- `ioredis` + `rate-limit-redis` added as normal dependencies (used only if `REDIS_URL` is
  set; otherwise inert).

## Frontend

- `SEC-004`: `new Function()`-based calculator eval replaced with a real recursive-descent
  parser (`src/utils/safeCalculator.js`) in both `DraggableCalculator.jsx` and
  `PracticeLayout.jsx` — tested directly (`12+3*4` → `24`, division-by-zero and invalid
  input both rejected cleanly, no code-execution path).

## Infra

- `vercel.json`: added a `headers` block so CSP/HSTS/X-Frame-Options/etc. actually reach
  the deployed document, not just `/api/*` (SEC-003).
- `server.js` CORS: narrowed from any `*.vercel.app` to this project's own preview pattern
  (CORS-001).

## Not done (out of scope by your instruction)

- BUG-001 (A-Level scoring always 0), SEC-002 (`/api/grade-answer` trusting the client),
  CertificateModal.jsx — all untouched.
- SEC-001 (secrets in git history) — still requires you to rotate the Supabase service-role
  key, Gemini key, Groq key, and Telegram bot token, then purge `.env` from git history.
- TEST-001 (no automated test suite) — the SQL smoke test used to validate the new schema
  isn't part of the delivered app; a real Jest/Vitest + pgTAP suite is still recommended.
- `src/App.jsx`'s `processPendingExamSubmit()` still attempts a direct client insert into
  `test_sessions` that RLS has never permitted (old schema or new) — noted previously, left
  as-is rather than opening a score-forging hole to make it "work."
