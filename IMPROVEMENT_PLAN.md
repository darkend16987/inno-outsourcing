# VAA JOB — Improvement Plan Summary

> Generated: 2026-04-02 | Updated: 2026-04-02 | Status: ✅ Completed

---

## Priority 1 — BLOCKING (Security Critical)

| # | Task | File(s) | Status |
|---|------|---------|--------|
| 1.1 | Replace cookie-based auth with signed server-side JWT session | `middleware.ts`, `auth-context.tsx`, `api/auth/session/route.ts`, `lib/auth/session.ts` | ✅ Done |
| 1.2 | Lock down Firestore Rules — protect PII (CMND, bank, tax) | `firestore.rules` — private subcollection, role-locked | ✅ Done |
| 1.3 | Add rule to prevent users from self-changing role | `firestore.rules` — `request.resource.data.role == resource.data.role` | ✅ Done |
| 1.4 | Fix collection name mismatch (`transactions` → `payments`) | `firestore.rules` | ✅ Done |
| 1.5 | SESSION_SECRET fails loudly in production | `middleware.ts`, `route.ts`, `session.ts` — throws if missing in prod | ✅ Done |
| 1.6 | serviceAccountKey.json added to .gitignore | `.gitignore` | ✅ Done |
| 1.7 | .env.example created (no secrets) | `.env.example` | ✅ Done |
| 1.8 | .firebaserc linked to project `vaa-job` | `.firebaserc` | ✅ Done |

## Priority 2 — HIGH IMPACT

| # | Task | File(s) | Status |
|---|------|---------|--------|
| 2.1 | Implement 9 Cloud Functions (v2 API) | `functions/src/index.ts` | ✅ Done |
| 2.2 | Add pagination for all list queries | `lib/firebase/firestore.ts` — `PaginatedResult<T>`, cursor-based | ✅ Done |
| 2.3 | Convert Landing page to SSR for SEO | `(public)/page.tsx` + `LandingClient.tsx` | ✅ Done |
| 2.4 | Implement Real-time Chat system | `ChatPanel.tsx`, `useChat.ts`, `firestore.ts` listeners | ✅ Done |
| 2.5 | Add react-hook-form + zod validation | `lib/validations/index.ts` — 8 schemas | ✅ Done |
| 2.6 | Add Firestore composite indexes | `firestore.indexes.json` — 18 indexes | ✅ Done |

## MEDIUM — Feature Gaps

| # | Task | File(s) | Status |
|---|------|---------|--------|
| 3.1 | Admin Jobs Management (C13/C14) | `admin/jobs/page.tsx` — list, filter, approve/reject | ✅ Done |
| 3.2 | Admin Job Review (C4) — internal notes | `admin/jobs/[id]/page.tsx` — detail, notes, approve/reject | ✅ Done |
| 3.3 | Admin Progress Tracking (C17) | `admin/progress/page.tsx` — progress bars, milestones | ✅ Done |
| 3.4 | Admin Applications Review (C15) | `admin/applications/page.tsx` — cards, shortlist | ✅ Done |
| 3.5 | JobMaster Chat Hub | `jobmaster/chat/page.tsx` — conversation sidebar + ChatPanel | ✅ Done |
| 3.6 | Sidebar navigation updated (all routes) | `Sidebar.tsx` — admin 7 items, jobmaster chat | ✅ Done |
| 3.7 | Phone OTP Authentication | `auth-context.tsx` — signInWithPhone, verifyOTP | ✅ Done |
| 3.8 | Dark Mode Toggle | `useTheme.ts`, `ThemeToggle.tsx`, Header integration | ✅ Done |

---

## Deploy Checklist

| Step | Command | Status |
|------|---------|--------|
| 1 | `firebase login` | Manual |
| 2 | `firebase use vaa-job` | ✅ Configured in .firebaserc |
| 3 | `firebase deploy --only firestore:rules` | Manual |
| 4 | `firebase deploy --only firestore:indexes` | Manual |
| 5 | `firebase deploy --only storage` | Manual |
| 6 | `cd functions && npm run build && cd .. && firebase deploy --only functions` | Manual |
| 7 | Set `SESSION_SECRET` in Vercel env vars | Manual |
| 8 | `vercel --prod` or Git push | Manual |
