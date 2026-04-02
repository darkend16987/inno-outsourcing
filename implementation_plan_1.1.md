# Comprehensive Improvements for VAA JOB Platform

Triển khai toàn bộ các cải thiện từ review audit, chia thành các batch (phase) nhỏ để giảm rủi ro lỗi.

## User Review Required

> [!IMPORTANT]
> Đây là một bộ thay đổi **rất lớn** (~30+ items). Để an toàn, tôi đề xuất chia thành **4 Phase**, mỗi phase build+test trước khi đi phase tiếp.

> [!WARNING]
> **Cloud Functions**: Hiện không có thư mục `functions/src` trong repo. Các items liên quan tới Cloud Functions (A1 race condition, A2 idempotency, A6 leaderboard pagination, S3 month bug) sẽ cần bạn xác nhận đường dẫn thực tế của functions code, hoặc tôi sẽ tạo mới nếu cần.

> [!IMPORTANT]
> **Email qua SendGrid (P3)**: Cần bạn cung cấp SendGrid API Key và template IDs, hoặc tôi sẽ tạo scaffold sendEmail function mà bạn configure sau.

---

## Phase 1: Critical Security & Bug Fixes (S1-S5, S8, A3, S3)

Ưu tiên cao nhất — fixes bảo mật và bugs nghiêm trọng.

---

### Security — Storage Rules (S1)

#### [NEW] [storage.rules](file:///d:/GitHub/inno-outsourcing/storage.rules)
- Tạo file Storage Rules mới thay thế rule permissive
- Restrict write theo UID path: `users/{uid}/` chỉ owner write được
- Thêm file size limit (10MB) và content type validation (image/*, application/pdf)

---

### Security — HTML Sanitization với DOMPurify (S2)

#### [MODIFY] [package.json](file:///d:/GitHub/inno-outsourcing/app/package.json)
- Thêm dependency: `isomorphic-dompurify`

#### [MODIFY] [sanitize.ts](file:///d:/GitHub/inno-outsourcing/app/src/lib/security/sanitize.ts)
- Replace regex `stripHtml()` bằng DOMPurify
- Giữ nguyên tất cả API exports (sanitizeText, sanitizeDisplayName, sanitizePhone, sanitizeUrl, isValidEmail, isRateLimited)
- Thêm `sanitizeHtml()` function cho rich content

---

### Security — KYC Data Encryption (S5)

#### [NEW] [crypto.ts](file:///d:/GitHub/inno-outsourcing/app/src/lib/security/crypto.ts)
- Tạo encrypt/decrypt utility cho sensitive fields
- Sử dụng AES-GCM qua Web Crypto API
- Encrypt: `idNumber`, `bankAccountNumber`, `taxId` trước khi lưu
- Decrypt khi đọc cho authorized users

#### [MODIFY] [firestore.ts](file:///d:/GitHub/inno-outsourcing/app/src/lib/firebase/firestore.ts)
- Thêm encrypt trước khi gọi `updateUserProfile` cho KYC fields
- Thêm decrypt khi đọc `getUserProfile`

---

### Architecture — Audit Logging (A3)

#### [NEW] [audit-log.ts](file:///d:/GitHub/inno-outsourcing/app/src/lib/firebase/audit-log.ts)
- Tạo `auditLogs` collection service
- Functions: `logAuditEvent(action, actor, details)`
- Records: `actor`, `action`, `targetType`, `targetId`, `before`, `after`, `timestamp`, `ip`

#### [MODIFY] [firestore.rules](file:///d:/GitHub/inno-outsourcing/firestore.rules)
- Thêm rules cho `auditLogs` collection (chỉ admin read, write qua Cloud Functions)
- Thêm rules cho `reviews` collection (new)
- Thêm rules cho `disputes` collection (new)

#### [MODIFY] [firestore.ts](file:///d:/GitHub/inno-outsourcing/app/src/lib/firebase/firestore.ts)
- Integrate audit logging vào các mutations: `updateJob`, `updatePayment`, `updateContract`, `updateApplication`

---

### Bug Fix — Leaderboard Month (S3)

> [!NOTE]
> Nếu functions/src/index.ts không tồn tại, tôi sẽ document fix cho bạn apply thủ công.

- Fix: `String(now.getMonth() + 1).padStart(2, '0')`

---

### React Error Boundaries (S8)

#### [NEW] [ErrorBoundary.tsx](file:///d:/GitHub/inno-outsourcing/app/src/components/ui/ErrorBoundary.tsx)
#### [NEW] [ErrorBoundary.module.css](file:///d:/GitHub/inno-outsourcing/app/src/components/ui/ErrorBoundary.module.css)
- Class component Error Boundary với fallback UI
- Hiển thị thông báo thân thiện khi lỗi xảy ra
- Button retry (reload page hoặc reset state)

#### [MODIFY] layouts cho admin, jobmaster, freelancer, accountant
- Wrap content trong `<ErrorBoundary>`

---

## Phase 2: Feature — Rating/Review System (P2) + Dispute Resolution (P4)

---

### Rating & Review System (P2)

#### [MODIFY] [index.ts](file:///d:/GitHub/inno-outsourcing/app/src/types/index.ts)
- Thêm `Review` interface
- Thêm `DisputeStatus`, `Dispute` interface
- Thêm `ReviewSummary` type

#### [NEW] [reviews.ts](file:///d:/GitHub/inno-outsourcing/app/src/lib/firebase/reviews.ts)
- `createReview(data)` — tạo review sau khi job completed
- `getReviewsForUser(uid)` — lấy tất cả reviews cho user
- `getReviewsForJob(jobId)` — lấy reviews cho job
- `calculateUserRating(uid)` — tính avgRating và update user stats

#### [MODIFY] [firestore.rules](file:///d:/GitHub/inno-outsourcing/firestore.rules)
- Thêm rules cho `reviews` collection

#### Frontend Components:
#### [NEW] [ReviewForm.tsx](file:///d:/GitHub/inno-outsourcing/app/src/components/reviews/ReviewForm.tsx)
#### [NEW] [ReviewForm.module.css](file:///d:/GitHub/inno-outsourcing/app/src/components/reviews/ReviewForm.module.css)
#### [NEW] [ReviewList.tsx](file:///d:/GitHub/inno-outsourcing/app/src/components/reviews/ReviewList.tsx)
#### [NEW] [ReviewList.module.css](file:///d:/GitHub/inno-outsourcing/app/src/components/reviews/ReviewList.module.css)
- Star rating component
- Review form (sau completed job)
- Review list display
- Tích hợp vào job detail page

---

### Dispute Resolution (P4)

#### [NEW] [disputes.ts](file:///d:/GitHub/inno-outsourcing/app/src/lib/firebase/disputes.ts)
- `createDispute(data)` — freelancer hoặc jobmaster tạo dispute
- `updateDisputeStatus(id, status, resolution)` — admin giải quyết
- `getDisputesForJob(jobId)` — lấy disputes cho job
- `getAllDisputes()` — admin xem tất cả disputes
- Flow: `open` → `under_review` → `resolved` / `escalated`

#### Frontend:
#### [NEW] [DisputeForm.tsx](file:///d:/GitHub/inno-outsourcing/app/src/components/disputes/DisputeForm.tsx)
#### [NEW] [DisputeForm.module.css](file:///d:/GitHub/inno-outsourcing/app/src/components/disputes/DisputeForm.module.css)
- Form tạo dispute
- Tích hợp vào job detail khi status = in_progress/review

---

## Phase 3: Features — Search/Filter (P1), Analytics (P5), Onboarding (P6), Contact

---

### Advanced Job Search/Filter (P1)

#### [MODIFY] [firestore.ts](file:///d:/GitHub/inno-outsourcing/app/src/lib/firebase/firestore.ts)
- Mở rộng `JobFilters` interface: `budgetMin`, `budgetMax`, `deadlineBefore`, `deadlineAfter`, `workMode`, `searchText`
- Enhance `getJobs()` với các filter mới
- Client-side full-text search trên `searchKeywords` array

#### [NEW] [JobSearchFilter.tsx](file:///d:/GitHub/inno-outsourcing/app/src/components/jobs/JobSearchFilter.tsx)
#### [NEW] [JobSearchFilter.module.css](file:///d:/GitHub/inno-outsourcing/app/src/components/jobs/JobSearchFilter.module.css)
- Search bar component
- Filter sidebar/dropdown: category, level, budget range, workMode, deadline
- Responsive: mobile collapse filters

---

### Analytics Dashboard (P5)

#### [NEW] [analytics.ts](file:///d:/GitHub/inno-outsourcing/app/src/lib/firebase/analytics.ts)
- `getAnalyticsData()` — aggregate metrics from jobs, payments, applications
- Revenue (total paid), active jobs, conversion rate, avg time-to-hire
- Monthly breakdown data for charts

#### [MODIFY] [page.tsx (admin)](file:///d:/GitHub/inno-outsourcing/app/src/app/(role)/admin/page.tsx)
- Replace placeholder dashboard với real analytics
- Revenue chart (recharts — already installed)
- Key metrics cards với real data
- Application funnel chart

---

### Onboarding Flow (P6)

#### [NEW] [OnboardingChecklist.tsx](file:///d:/GitHub/inno-outsourcing/app/src/components/checklist/OnboardingChecklist.tsx)
#### [NEW] [OnboardingChecklist.module.css](file:///d:/GitHub/inno-outsourcing/app/src/components/checklist/OnboardingChecklist.module.css)
- Profile completion checklist component
- Checks: displayName, phone, bio, specialties, experience, KYC, portfolio
- Progress bar
- CTA buttons to each section

#### [MODIFY] [page.tsx (freelancer)](file:///d:/GitHub/inno-outsourcing/app/src/app/(role)/freelancer/page.tsx)
- Hiển thị OnboardingChecklist nếu profile chưa hoàn thiện

---

### Job Master Contact Info — Email & Zalo (User's custom request)

#### [MODIFY] [index.ts (types)](file:///d:/GitHub/inno-outsourcing/app/src/types/index.ts)
- Đảm bảo `Job` có `jobMasterEmail` và `jobMasterPhone`

#### Frontend Integration
- Khi hiển thị thông tin liên hệ Job Master:
  - Email → `mailto:` link (mở email client)
  - Phone → Link `https://zalo.me/{phone}` (mở Zalo)
- Áp dụng cho: job detail page (public), application pages

---

## Phase 4: Architecture & Performance (A2, A5, A7, S6, S7, S9, P3)

---

### Email Notification Service (P3)

#### [NEW] [email-service.ts](file:///d:/GitHub/inno-outsourcing/app/src/lib/services/email-service.ts)
- Abstract email service (scaffold cho SendGrid)
- Templates: `payment_completed`, `deadline_warning`, `contract_ready`, `application_accepted`
- Configuration qua environment variables

#### [NEW] API Route [send-email/route.ts](file:///d:/GitHub/inno-outsourcing/app/src/app/api/email/send-email/route.ts)
- Server-side API endpoint để gửi email
- Validate request, check auth
- Rate limit per user

---

### Firestore Service Retry Logic (S9)

#### [NEW] [retry.ts](file:///d:/GitHub/inno-outsourcing/app/src/lib/utils/retry.ts)
- `withRetry(fn, options)` — exponential backoff wrapper
- Default: 3 retries, 1s → 2s → 4s
- Only retry on network errors, not auth/permission errors

#### [MODIFY] [firestore.ts](file:///d:/GitHub/inno-outsourcing/app/src/lib/firebase/firestore.ts)
- Wrap critical operations (payment, contract) với `withRetry`

---

### CSRF Protection (S6)

#### [MODIFY] [middleware.ts](file:///d:/GitHub/inno-outsourcing/app/src/middleware.ts)
- Thêm CSRF token generation + validation
- Set CSRF token cookie trên GET requests
- Validate CSRF token header trên POST/PUT/DELETE requests tới `/api/`

---

### Job State Machine (A7)

#### [NEW] [job-state-machine.ts](file:///d:/GitHub/inno-outsourcing/app/src/lib/state/job-state-machine.ts)
- Define valid transitions map
- `canTransition(from, to)` — check if transition valid
- `transition(jobId, from, to)` — atomic transition
- Prevents invalid moves like `draft → paid`

#### [MODIFY] [firestore.ts](file:///d:/GitHub/inno-outsourcing/app/src/lib/firebase/firestore.ts)
- `updateJob` sử dụng state machine validation trước khi update status

---

### Caching Enhancement (A5)

#### [MODIFY] [swr-cache.ts](file:///d:/GitHub/inno-outsourcing/app/src/lib/cache/swr-cache.ts)
- Thêm `getMany()` — batch cache reads
- Thêm `warmup()` — pre-populate cache on app load
- Thêm size limit (max 500 entries) + LRU eviction

---

## Open Questions

> [!IMPORTANT]
> 1. **Cloud Functions path**: Thư mục `functions/src` không tồn tại. Functions code (cho A1, A2, A6, S3) nằm ở đâu? Hay tôi cần tạo mới?
> 2. **SendGrid API Key**: Bạn đã có SendGrid account chưa? Nếu chưa, tôi sẽ tạo scaffold và bạn config sau.
> 3. **Encryption Key**: Cho S5 (KYC encryption), key sẽ lưu ở đâu? Đề xuất: environment variable `ENCRYPTION_KEY` trong `.env.local`
> 4. **Phase order**: Bạn muốn tôi thực hiện Phase 1 trước rồi xin approval tiếp, hay làm tất cả một lần?

---

## Verification Plan

### Automated Tests
- `npm run build` — đảm bảo không TypeScript errors
- `npm run lint` — eslint clean
- `npm run test` — existing tests pass

### Manual Verification
- Kiểm tra từng component mới render đúng
- Test Error Boundary bằng cách throw error trong component test
- Verify Firestore rules deploy với `firebase deploy --only firestore:rules`

---

## Tóm tắt Thay đổi theo Item

| Item | Phase | Approach |
|------|-------|----------|
| P1 - Search/Filter | 3 | Mở rộng Firestore queries + UI component |
| P2 - Rating/Review | 2 | New collection + UI components |
| P3 - Email notification | 4 | SendGrid service scaffold + API route |
| P4 - Dispute Resolution | 2 | New collection + workflow + UI |
| P5 - Analytics Dashboard | 3 | Real data aggregation + recharts |
| P6 - Onboarding | 3 | Checklist component |
| A1 - Race condition | ⚠️ | Needs Cloud Functions code |
| A2 - Idempotency | ⚠️ | Needs Cloud Functions code |
| A3 - Audit Logging | 1 | New collection + integration |
| A5 - Caching | 4 | Enhance SWR cache |
| A6 - Leaderboard | ⚠️ | Needs Cloud Functions code |
| A7 - State Machine | 4 | New utility + integration |
| S1 - Storage Rules | 1 | New storage.rules file |
| S2 - DOMPurify | 1 | Replace regex sanitization |
| S3 - Month bug | ⚠️ | Needs Cloud Functions code |
| S4 - Rate limiting | ✅ | Already has middleware rate limiting |
| S5 - KYC Encryption | 1 | New crypto utility |
| S6 - CSRF | 4 | Middleware enhancement |
| S7 - Client rate limit | ✅ | Already documented as UX only |
| S8 - Error Boundaries | 1 | New component + layout integration |
| S9 - Retry Logic | 4 | New utility + integration |
| Contact Email/Zalo | 3 | Frontend: mailto + zalo.me links |
