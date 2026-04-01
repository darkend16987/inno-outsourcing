# VAA JOB — Master Plan

## 1. Tổng Quan Dự Án

**Tên thương hiệu:** VAA JOB
**Mô tả:** Nền tảng quản lý job outsourcing chuyên ngành thiết kế xây dựng (Kiến trúc, Kết cấu, MEP, BIM, Dự toán, Giám sát, Thẩm tra)
**Ngôn ngữ:** Song ngữ Việt – Anh (ưu tiên Việt)

---

## 2. Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 (App Router, TypeScript) |
| Styling | Vanilla CSS (CSS Modules), Google Fonts (Space Grotesk + Be Vietnam Pro) |
| Auth | Firebase Authentication (Google SSO + Phone OTP + Email) |
| Database | Cloud Firestore |
| Storage | Cloud links (Google Drive/OneDrive) — KHÔNG dùng Firebase Storage cho deliverables |
| Functions | Firebase Cloud Functions (Gen 2) |
| Hosting | Vercel (frontend) + Firebase (backend services) |
| Icons | Lucide React |
| Animations | Framer Motion |
| Charts | Recharts |

---

## 3. User Roles & Phân Quyền

| Role | Mô tả | Giao diện |
|------|--------|-----------|
| **Guest** | Chưa đăng nhập | Public portal |
| **Freelancer** | Người nhận việc (default khi đăng ký) | Worker portal |
| **Job Master** | Quản lý tiến trình job, trao đổi với freelancer | Job Master CMS |
| **Accountant** | Quản lý thanh toán, hóa đơn, hợp đồng | Accountant CMS |
| **Super Admin** | Quản lý toàn bộ hệ thống (1 role duy nhất) | Admin CMS |

> Job Master KHÔNG kiêm nhiệm Admin. Super Admin là role cao nhất.

---

## 4. Giao Diện Chính (5 Portals)

### 4.1 Public Portal (Guest)
- **C1** Landing page — Hero, stats, jobs mới nhất, vinh danh
- **C2** Jobs listing — Filter (lĩnh vực, level L1-L5, thù lao, địa điểm), pagination
- **C3** Job detail — Stepper, job master info, thù lao, milestones, scope, requirements, files, comments
- **C5** Register — Chọn loại TK, thông tin cơ bản, chuyên môn (freelancer)
- **C6** Login — Email/Password, Google SSO, Phone OTP
- **C22** Leaderboard — Top 3 highlight, bảng xếp hạng, filter tháng/quý/năm
- **C23** Badges catalog — Hệ thống huy hiệu, tiến độ đạt badge

### 4.2 Worker Portal (Freelancer — authenticated)
- **C7** Dashboard — Welcome, level progress, metrics, badges, recent jobs, notifications
- **C8** Profile — Avatar, info cá nhân, chuyên môn, chứng chỉ, portfolio, reviews
- **C9** My Jobs — Tabs: Đã ứng tuyển | Chốt kèo | Đang thực hiện | Nghiệm thu | Thanh toán | Hoàn thành
- **C10** Job detail (worker) — Progress bar + milestones, update progress, timeline, upload deliverable (cloud link), chat
- **C3b** Apply form — Job summary, applicant info, cover letter, portfolio, confirmations
- **C11** Contracts — Danh sách HĐ, chi tiết, PDF preview, ký (phương án đơn giản)

### 4.3 Admin CMS (Super Admin)
- **C12** Dashboard — Metrics, charts (job theo lĩnh vực, doanh thu 6 tháng), recent jobs table, top workers
- **C13** Create Job — Form đa section (cơ bản, scope, requirements, milestones, checklist, attachments, chọn Job Master)
- **C14** Pending Approval — Danh sách job chờ duyệt
- **C4** Job Review — Chi tiết + internal notes, approve/reject
- **C15** Applications — Cards ứng viên, so sánh, shortlist/accept/reject
- **C16** Contract Management — Wizard 5 bước (chọn mẫu → auto-fill → điều khoản → preview PDF → gửi ký)
- **C17** Progress Tracking — Active jobs + progress bars, approve milestones
- **C18** User Management — Table users, change role, suspend, verify certificates
- **C19** Reports — Revenue, jobs by category, worker performance, export CSV/PDF

### 4.4 Job Master CMS
- Dashboard — Overview managed jobs, pending actions
- Job Management — Progress monitoring, deliverable review, milestone approval
- Chat Hub — Real-time messaging with freelancers per job

### 4.5 Accountant CMS
- **C20** Dashboard — Metrics (tổng cần TT, chờ xử lý, đã TT), pending payments table
- **C21** Payment History — Full history, filters, export

---

## 5. Job Lifecycle

```
Draft → Pending Approval → Open → Assigned (Chốt kèo) → In Progress → Review (Nghiệm thu) → Completed → Paid
```

### Status Flow:
1. **Draft** — Admin tạo job, lưu nháp
2. **Pending Approval** — Submit để duyệt
3. **Open** (Chưa nhận việc) — Đã duyệt, freelancer có thể apply
4. **Assigned** (Chốt kèo) — Admin chọn freelancer, tạo hợp đồng
5. **In Progress** (Đang thực hiện) — Freelancer đang làm, cập nhật progress
6. **Review** (Nghiệm thu) — Tất cả milestones đạt, Job Master nghiệm thu
7. **Completed** — Nghiệm thu xong
8. **Paid** — Kế toán xác nhận thanh toán xong

---

## 6. Payment Milestone System

- Mỗi job có N đợt thanh toán (milestones)
- Mỗi milestone: tên, % tiến độ trigger, số tiền, điều kiện
- Khi freelancer cập nhật progress đạt mốc → Job Master xác nhận → Tạo payment request → Kế toán xác nhận thanh toán
- Freelancer thấy trạng thái từng đợt: Chưa đạt | Đạt, chờ TT | Đã thanh toán

---

## 7. Deliverable System (Cloud Links)

- Freelancer gửi deliverable qua **link cloud drive** (Google Drive, OneDrive, etc.)
- Job Master review, approve hoặc yêu cầu chỉnh sửa
- KHÔNG upload file lên Firebase Storage (tránh nặng hệ thống)
- Nếu sau này cần, bổ sung Firebase Storage option

---

## 8. Chat & Communication

- **Public Comments**: Bình luận công khai trên job detail (Q&A)
- **Private Chat**: Real-time messaging giữa Freelancer ↔ Job Master (per job)
- Firestore real-time listeners cho chat

---

## 9. Contract System (Phương án đơn giản)

1. Admin tạo hợp đồng từ template → auto-fill data từ job + worker
2. Chỉnh sửa điều khoản
3. Preview PDF
4. Gửi cho freelancer
5. Freelancer ký online (simple signature) hoặc upload scan
6. Lưu trạng thái: Draft | Chờ ký | Có hiệu lực | Hoàn thành

---

## 10. Gamification

### Level System (L1–L5)
- Tính dựa trên: completed jobs × quality rating × complexity level
- Càng cao càng khó, thù lao càng nhiều

### Badge System
| Badge | Điều kiện |
|-------|----------|
| Top Earner | Top 3 doanh thu tháng |
| Speed Master | Hoàn thành trước hạn 5+ job |
| 5 Stars | 3 job liên tiếp đạt 5 sao |
| Loyal Partner | Hoàn thành 20+ job |
| Rising Star | 3 job đầu tiên đều trên 4.5 sao |

---

## 11. Notification System

| Event | Người nhận | Kênh |
|-------|-----------|------|
| Job mới phù hợp | Worker | In-app + Email |
| Ứng tuyển mới | Job Master + Admin | In-app |
| Được chọn nhận việc | Worker | In-app + Email |
| Tiến độ đạt mốc TT | Job Master + Kế toán | In-app + Email |
| Đã thanh toán | Worker + Admin | In-app |
| Deadline còn 3 ngày | Worker + Job Master | In-app + Email |
| Hợp đồng cần ký | Worker | In-app + Email |
| Comment mới | Người liên quan | In-app |
| Badge mới | Worker | In-app |

---

## 12. Design Direction

### Phong cách: Neo-Clean Professional
- Lấy cảm hứng từ neo-brutalist (thick borders, poster shadows, bold typography)
- Nhưng tone down cho phù hợp ngành xây dựng — clean, professional, trẻ trung
- **Fonts**: Space Grotesk (headings) + Be Vietnam Pro (body)
- **Colors**: Deep teal primary, warm neutrals, pastel accents cho level badges
- **Shadows**: neo-shadow nhẹ (4px offset, charcoal)
- **Border**: 2-3px solid, rounded 12px cards
- **Animations**: Framer Motion — hover effects, spring transitions, skeleton loading
- **Dark Mode**: Full support
- **Responsive**: Mobile-first, 3 breakpoints (mobile/tablet/desktop)

---

## 13. Firestore Collections

| Collection | Mô tả |
|-----------|--------|
| `users` | Profiles + KYC + stats + subcollections (certificates, portfolio, badges) |
| `jobs` | Job data + subcollections (applications, comments, progressUpdates, deliverables) |
| `contracts` | Hợp đồng |
| `conversations` | Chat threads + subcollection messages |
| `payments` | Payment records |
| `notifications` | User notifications |
| `leaderboard` | Monthly/quarterly aggregate |

---

## 14. Cloud Functions Triggers

| Function | Trigger | Action |
|----------|---------|--------|
| onJobApproved | Job status → open | Notify matching freelancers |
| onApplicationSubmitted | New application | Notify job master + admin |
| onApplicationAccepted | Application accepted | Notify freelancer, create contract draft |
| onProgressUpdated | Progress crosses milestone | Notify job master |
| onMilestoneApproved | Milestone approved | Create payment, notify accountant |
| onPaymentConfirmed | Payment confirmed | Notify freelancer + admin |
| onJobCompleted | All milestones paid | Update stats, check badges |
| scheduledDeadlineCheck | Daily cron | Notify approaching deadlines |
| scheduledLeaderboard | Monthly cron | Generate leaderboard |

---

## 15. Project Structure

```
inno-outsourcing/
├── src/
│   ├── app/
│   │   ├── (public)/           # Landing, Jobs, Leaderboard, Badges
│   │   ├── (auth)/             # Login, Register
│   │   ├── (worker)/           # Worker portal
│   │   ├── (admin)/            # Admin CMS
│   │   ├── (jobmaster)/        # Job Master CMS
│   │   ├── (accountant)/       # Accountant CMS
│   │   ├── api/                # API Routes
│   │   └── layout.tsx
│   ├── components/
│   │   ├── ui/                 # Button, Badge, Avatar, Card, Modal, etc.
│   │   ├── layout/             # Header, Sidebar, Footer
│   │   ├── forms/              # Form components
│   │   ├── job/                # Job card, filter, detail
│   │   ├── chat/               # Chat panel, messages
│   │   ├── contract/           # Contract wizard, viewer
│   │   └── dashboard/          # Metrics, Charts
│   ├── lib/
│   │   ├── firebase/           # Config, auth, firestore helpers
│   │   ├── hooks/              # Custom hooks
│   │   ├── utils/              # Utilities
│   │   ├── i18n/               # Internationalization (vi/en)
│   │   └── constants/          # Constants
│   ├── styles/                 # globals.css, tokens.css, animations.css
│   └── types/                  # TypeScript interfaces
├── functions/                  # Firebase Cloud Functions
├── public/                     # Static assets
└── firebase.json
```

---

## 16. Phased Delivery

| Phase | Scope | Timeline |
|-------|-------|----------|
| **1** | Foundation + Auth + Design System + Core Components | Tuần 1-2 |
| **2** | Data Models + Security Rules + TypeScript Types | Tuần 2-3 |
| **3** | Public Portal (Landing, Jobs, Leaderboard, Badges) | Tuần 3-5 |
| **4** | Worker Portal (Dashboard, Profile, My Jobs, Apply, Contracts) | Tuần 4-6 |
| **5** | Admin + Job Master CMS | Tuần 5-8 |
| **6** | Accountant + Cloud Functions + Polish + Testing | Tuần 7-9 |

---

## 17. Decisions Log

| # | Question | Decision | Date |
|---|----------|----------|------|
| 1 | i18n | Song ngữ Việt-Anh (ưu tiên Việt) | 2026-04-02 |
| 2 | Admin roles | 1 Super Admin, Job Master không kiêm Admin | 2026-04-02 |
| 3 | Firebase project | Tạo mới (CLI đã setup sẵn) | 2026-04-02 |
| 4 | Email service | Free tier, nâng Blaze khi cần | 2026-04-02 |
| 5 | Contract template | Tạo simple template, user gửi mẫu chính thức sau | 2026-04-02 |
| 6 | Deployment | Vercel (FE) + Firebase (BE services) | 2026-04-02 |
| 7 | File deliverables | Cloud links only (GDrive/OneDrive), NO Firebase Storage | 2026-04-02 |
| 8 | E-sign | Phương án đơn giản (PDF → ký online/scan → upload) | 2026-04-02 |
| 9 | Chat system | Có - Private messaging Freelancer ↔ Job Master | 2026-04-02 |
| 10 | Framework | Next.js 15 (App Router) | 2026-04-02 |
| 11 | Brand name | **VAA JOB** | 2026-04-02 |

---

## 18. Progress Tracker

> Updated as work progresses

- [ ] Phase 1: Foundation
- [ ] Phase 2: Data Architecture
- [ ] Phase 3: Public Portal
- [ ] Phase 4: Worker Portal
- [ ] Phase 5: Admin & Job Master CMS
- [ ] Phase 6: Accountant & Business Logic
