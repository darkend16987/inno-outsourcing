# VAA JOB — Improvement Plan Summary

> Generated: 2026-04-02 | Status: In Progress

---

## Priority 1 — BLOCKING (Security Critical)

| # | Task | File(s) | Status |
|---|------|---------|--------|
| 1.1 | Replace cookie-based auth with signed server-side session | `middleware.ts`, `auth-context.tsx`, `api/auth/session/route.ts` | 🔄 |
| 1.2 | Lock down Firestore Rules — protect PII (CMND, bank, tax) | `firestore.rules` | 🔄 |
| 1.3 | Add rule to prevent users from self-changing role | `firestore.rules` | 🔄 |
| 1.4 | Fix collection name mismatch (`transactions` → `payments`) | `firestore.rules` | 🔄 |

## Priority 2 — HIGH IMPACT

| # | Task | File(s) | Status |
|---|------|---------|--------|
| 2.1 | Implement 7 missing Cloud Functions (notifications, triggers) | `functions/src/index.ts` | 🔄 |
| 2.2 | Add pagination for getJobs() + all list queries | `lib/firebase/firestore.ts` | 🔄 |
| 2.3 | Convert Landing page to SSR for SEO | `(public)/page.tsx` | 🔄 |
| 2.4 | Implement Real-time Chat system | `components/chat/`, `lib/hooks/useChat.ts` | 🔄 |
| 2.5 | Add react-hook-form + zod validation | `lib/validations/`, forms | 🔄 |
| 2.6 | Add Firestore composite indexes | `firestore.indexes.json` | 🔄 |

---

## Risk Mitigations

| Risk | Mitigation |
|------|-----------|
| Cookie auth bypass → admin access | Server-side signed session with HMAC |
| PII leak via Firestore | Private subcollection + strict rules |
| Self role escalation | Firestore rule: only admin can change role |
| Missing Cloud Functions → manual workflow | Implement all 9 triggers |
| No pagination → OOM on scale | Cursor-based pagination with limit |
| CSR landing → no SEO | SSR + metadata |
| No chat → broken workflow | Real-time Firestore listeners |
| No input validation → bad data | Zod schemas + react-hook-form |
