# INNO Jobs — Hệ Thống Quản Lý Outsourcing Thiết Kế Xây Dựng

## Tổng Quan

Xây dựng nền tảng **INNO Jobs** — hệ thống quản lý job và freelancer chuyên ngành thiết kế xây dựng (Kiến trúc, Kết cấu, MEP, BIM, Dự toán, Giám sát, Thẩm tra). Hệ thống phục vụ 5 nhóm người dùng chính: **Khách** (public), **Freelancer/Worker**, **Admin**, **Job Master**, và **Kế toán**.

### Technology Stack

| Layer | Technology | Lý do chọn |
|-------|-----------|-------------|
| **Frontend** | Next.js 15 (App Router) | SSR/SSG cho SEO, Image optimization, API Routes, Route Groups cho multi-portal |
| **Styling** | Vanilla CSS (CSS Modules) | Maximum control, performance, phù hợp design system tùy chỉnh |
| **Auth** | Firebase Authentication | Google SSO + Phone auth + Email/Password |
| **Database** | Cloud Firestore | Real-time sync, offline support, serverless scaling |
| **Storage** | Firebase Storage | Upload file deliverable (RVT, PDF, DWG, ZIP) |
| **Serverless** | Firebase Cloud Functions (Gen 2) | Business logic triggers, notifications, payment processing |
| **Hosting** | Vercel | Edge deployment, preview deployments, CI/CD tích hợp GitHub |
| **Real-time Chat** | Firestore real-time listeners | Chat giữa freelancer và job master |
| **Email** | Firebase Extensions + SendGrid/Resend | Notification email tự động |
| **Analytics** | Firebase Analytics | Tracking user behavior |

---

## User Review Required

> [!IMPORTANT]
> **Lựa chọn Framework**: Tôi đề xuất dùng **Next.js 15** thay vì Vanilla HTML vì dự án có nhiều route, nhiều role, cần SSR cho SEO trang public, và API Routes cho server-side logic. Bạn có đồng ý không?

> [!IMPORTANT]
> **Chat System**: Wireframe hiện tại dùng Comments (bình luận) trên từng job. Tôi đề xuất thêm một **messaging system riêng** (real-time chat panel) ngoài comments công khai, để Freelancer và Job Master có thể trao đổi riêng tư. Bạn có muốn thêm tính năng này không?

> [!IMPORTANT]
> **Hợp đồng điện tử**: Wireframe có flow ký hợp đồng điện tử. Tôi đề xuất 2 phương án:
> - **Phương án A (Đơn giản)**: Tạo PDF từ template → Upload ký scan → Lưu trạng thái.
> - **Phương án B (Nâng cao)**: Tích hợp API e-sign (VNSign, eSignCloud) cho chữ ký số hợp pháp.
> 
> Ban đầu nên làm **Phương án A** rồi nâng cấp sau. Bạn có đồng ý?

> [!WARNING]
> **File deliverable lớn**: Các file RVT/Revit có thể lên đến 500MB+. Firebase Storage có giới hạn upload 5GB/file, đủ dùng, nhưng tôi suggest thêm option **link cloud drive** (Google Drive/OneDrive) bên cạnh upload trực tiếp. Bạn có muốn?

> [!IMPORTANT]
> **Tên thương hiệu**: Wireframe dùng "INNO Jobs". Hệ thống sẽ dùng tên này hay bạn muốn đổi?

---

## Proposed Changes

### Phase 1: Foundation & Authentication (Tuần 1-2)

---

#### 1.1 Project Setup

##### [NEW] `/` — Next.js 15 Project Root

- Khởi tạo Next.js 15 với App Router
- Cấu hình TypeScript, ESLint, Prettier
- Setup CSS Modules với Design System tokens
- Firebase SDK initialization
- Environment variables (`.env.local`)

```
inno-outsourcing/
├── src/
│   ├── app/
│   │   ├── (public)/              # Route group: Landing, Jobs list, Leaderboard
│   │   ├── (auth)/                # Route group: Login, Register
│   │   ├── (worker)/              # Route group: Worker portal (protected)
│   │   ├── (admin)/               # Route group: Admin CMS (protected)
│   │   ├── (jobmaster)/           # Route group: Job Master CMS (protected)
│   │   ├── (accountant)/          # Route group: Accountant CMS (protected)
│   │   ├── api/                   # API Routes
│   │   └── layout.tsx             # Root layout
│   ├── components/
│   │   ├── ui/                    # Reusable: Button, Badge, Avatar, Card, Modal, etc.
│   │   ├── layout/                # Header, Sidebar, Footer
│   │   ├── forms/                 # Form components
│   │   ├── job/                   # Job card, Job detail, Job filter
│   │   ├── chat/                  # Chat panel, Message bubble
│   │   ├── contract/              # Contract wizard, Contract viewer
│   │   └── dashboard/             # Metric cards, Charts
│   ├── lib/
│   │   ├── firebase/
│   │   │   ├── config.ts          # Firebase initialization
│   │   │   ├── auth.ts            # Auth helpers
│   │   │   ├── firestore.ts       # Firestore helpers
│   │   │   └── storage.ts         # Storage helpers
│   │   ├── hooks/                 # Custom React hooks
│   │   ├── utils/                 # Utility functions
│   │   └── constants/             # App-wide constants
│   ├── styles/
│   │   ├── globals.css            # CSS custom properties, reset, typography
│   │   ├── tokens.css             # Design tokens
│   │   └── animations.css         # Micro-animations
│   └── types/                     # TypeScript interfaces
├── functions/                     # Firebase Cloud Functions
├── public/                        # Static assets
├── firebase.json
├── firestore.rules
├── storage.rules
└── next.config.ts
```

##### [NEW] `src/styles/tokens.css` — Design System

Design system lấy cảm hứng từ wireframe hiện tại (clean, muted palette) nhưng nâng cấp lên modern hơn:

- **Color Palette**: Deep teal primary (`#0A6E5C`), warm neutrals, pastel accents cho level badges
- **Typography**: Inter (body) + Outfit (headings) — Google Fonts
- **Spacing**: 4px scale system
- **Border Radius**: 12px cards, 8px inputs, 99px pills
- **Elevation**: Subtle box-shadows thay vì flat borders
- **Dark Mode**: Full dark mode support via CSS custom properties
- **Animations**: Spring-based micro-animations (hover, enter, exit)

---

#### 1.2 Authentication System

##### [NEW] `src/lib/firebase/auth.ts`

**Phương thức đăng nhập:**
- Google SSO (Firebase Auth — `signInWithPopup`)
- Phone OTP (Firebase Auth — `signInWithPhoneNumber`)
- Email/Password (fallback)

**User Roles (Custom Claims):**
```typescript
type UserRole = 'freelancer' | 'admin' | 'jobmaster' | 'accountant';

interface UserProfile {
  uid: string;
  email: string;
  phone: string;
  displayName: string;
  photoURL: string;
  role: UserRole;
  // KYC fields (required for job application)
  kycCompleted: boolean;
  idNumber: string;         // CCCD
  idIssuedDate: string;
  idIssuedPlace: string;
  address: string;
  bankAccountNumber: string;
  bankName: string;
  bankBranch: string;
  taxId: string;            // MST (optional)
}
```

**Role-based Route Protection:**
- Middleware (`middleware.ts`) kiểm tra Firebase ID token + custom claims
- Redirect unauthorized users về trang phù hợp

**Registration Flow:**
1. SSO/Phone → Tạo account (role: `freelancer` mặc định)
2. Điền profile cơ bản (tên, lĩnh vực, kinh nghiệm)
3. Upload CCHN scan (optional)
4. Khi apply job lần đầu → Bắt buộc KYC (CCCD, ngân hàng, địa chỉ)

---

### Phase 2: Data Architecture & Core Models (Tuần 2-3)

---

#### 2.1 Firestore Schema Design

##### Collection: `users`
```
users/{uid}
  ├── displayName: string
  ├── email: string
  ├── phone: string
  ├── photoURL: string
  ├── role: 'freelancer' | 'admin' | 'jobmaster' | 'accountant'
  ├── status: 'active' | 'suspended' | 'pending_verification'
  ├── createdAt: timestamp
  ├── updatedAt: timestamp
  │
  ├── // Profile — Freelancer specific
  ├── specialties: string[]        // ['Kiến trúc', 'Kết cấu', 'MEP', 'BIM', ...]
  ├── experience: number           // years
  ├── software: string[]           // ['Revit', 'ETABS', 'AutoCAD', ...]
  ├── selfAssessedLevel: 'L1'..'L5'
  ├── currentLevel: 'L1'..'L5'     // System computed
  ├── bio: string
  │
  ├── // KYC
  ├── kycCompleted: boolean
  ├── idNumber: string
  ├── address: string
  ├── bankAccountNumber: string
  ├── bankName: string
  │
  ├── // Stats (denormalized for performance)
  ├── stats: {
  │     completedJobs: number
  │     totalEarnings: number
  │     avgRating: number
  │     ratingCount: number
  │     onTimeRate: number
  │     currentMonthEarnings: number
  │   }
  │
  ├── // Subcollection
  ├── certificates/{certId}        // Chứng chỉ hành nghề
  │     ├── number: string
  │     ├── field: string
  │     ├── fileURL: string
  │     ├── status: 'pending' | 'verified' | 'rejected'
  │     └── verifiedBy: uid
  │
  ├── portfolio/{itemId}           // Portfolio dự án
  │     ├── projectName: string
  │     ├── role: string
  │     ├── year: number
  │     ├── thumbnailURL: string
  │     └── description: string
  │
  └── badges/{badgeId}             // Huy hiệu
        ├── badgeType: string
        ├── earnedAt: timestamp
        └── metadata: map
```

##### Collection: `jobs`
```
jobs/{jobId}
  ├── title: string
  ├── description: string          // Phạm vi công việc
  ├── category: string             // 'Kiến trúc' | 'Kết cấu' | 'MEP' | 'BIM' | ...
  ├── subcategory: string          // 'BIM Modeling' | 'Thẩm tra' | ...
  ├── projectType: string          // 'Văn phòng' | 'Nhà xưởng' | 'Bệnh viện' | ...
  ├── workMode: 'remote' | 'on-site' | 'hybrid'
  ├── level: 'L1'..'L5'
  ├── totalFee: number             // Thù lao tổng (VND)
  ├── currency: 'VND'
  ├── duration: number             // Thời hạn thực hiện (ngày)
  ├── deadline: timestamp          // Hạn nộp hồ sơ
  ├── startDate: timestamp         // (optional) Ngày bắt đầu dự kiến
  │
  ├── // Payment milestones
  ├── paymentType: 'milestone' | 'completion'
  ├── milestones: [
  │     {
  │       id: string,
  │       name: string,           // 'Đợt 1', 'Đợt 2'
  │       percentage: number,     // 50
  │       amount: number,         // 24000000
  │       condition: string,      // 'Khi đạt 50% tiến độ'
  │       status: 'pending' | 'approved' | 'paid'
  │       approvedAt: timestamp,
  │       paidAt: timestamp,
  │       approvedBy: uid,        // Job Master uid
  │       paidBy: uid,            // Accountant uid
  │     }
  │   ]
  │
  ├── // Requirements
  ├── requirements: {
  │     experience: string,       // 'Ít nhất 4 năm BIM/Revit'
  │     certifications: string,
  │     software: string[],
  │     standards: string[],      // ['TCVN 5574', 'QCVN 02']
  │   }
  │
  ├── // Checklist (Admin tạo khi tạo job)
  ├── checklist: [
  │     { id: string, item: string, completed: boolean }
  │   ]
  │
  ├── // Attachments
  ├── attachments: [
  │     { name: string, type: string, url: string, size: number }
  │   ]
  │
  ├── // Status & Assignment
  ├── status: 'draft' | 'pending_approval' | 'open' | 'assigned' | 
  │           'in_progress' | 'review' | 'completed' | 'paid' | 'cancelled'
  ├── progress: number             // 0-100
  ├── assignedTo: uid | null       // Freelancer được chọn
  ├── assignedAt: timestamp
  │
  ├── // Management
  ├── createdBy: uid               // Admin tạo job
  ├── jobMaster: uid               // Quản lý job
  ├── approvedBy: uid              // Admin duyệt
  ├── createdAt: timestamp
  ├── updatedAt: timestamp
  │
  ├── // Denormalized for listing
  ├── jobMasterName: string
  ├── assignedWorkerName: string
  │
  ├── // Search & filter helpers
  ├── searchKeywords: string[]
  ├── isPublic: boolean
  │
  ├── // Subcollections
  ├── applications/{appId}
  │     ├── applicantId: uid
  │     ├── applicantName: string
  │     ├── applicantLevel: string
  │     ├── applicantSpecialties: string[]
  │     ├── availableDate: timestamp
  │     ├── expectedFee: number | null
  │     ├── coverLetter: string
  │     ├── portfolioLink: string
  │     ├── attachments: [{name, url}]
  │     ├── status: 'pending' | 'shortlisted' | 'accepted' | 'rejected'
  │     ├── rejectionReason: string
  │     ├── createdAt: timestamp
  │     └── reviewedBy: uid
  │
  ├── comments/{commentId}
  │     ├── authorId: uid
  │     ├── authorName: string
  │     ├── authorRole: string
  │     ├── content: string
  │     ├── attachmentURL: string
  │     ├── parentCommentId: string | null  // reply nesting
  │     ├── isInternal: boolean   // Admin-only comment
  │     ├── createdAt: timestamp
  │     └── likes: uid[]
  │
  ├── progressUpdates/{updateId}
  │     ├── authorId: uid
  │     ├── fromProgress: number
  │     ├── toProgress: number
  │     ├── note: string
  │     ├── createdAt: timestamp
  │     └── approvedByJobMaster: boolean
  │
  └── deliverables/{fileId}
        ├── name: string
        ├── type: string
        ├── url: string            // Firebase Storage or external link
        ├── size: number
        ├── uploadedBy: uid
        ├── uploadedAt: timestamp
        ├── status: 'uploaded' | 'reviewed' | 'revision_requested' | 'approved'
        └── reviewNote: string
```

##### Collection: `contracts`
```
contracts/{contractId}
  ├── contractNumber: string       // 'HD-2026-042'
  ├── jobId: string
  ├── jobTitle: string
  ├── partyA: {
  │     name: string,              // 'INNO Design & Build'
  │     representative: string,
  │     position: string,
  │   }
  ├── partyB: {
  │     uid: string,
  │     name: string,
  │     idNumber: string,
  │     address: string,
  │     bankAccount: string,
  │     bankName: string,
  │   }
  ├── scope: string                // Phạm vi công việc
  ├── totalValue: number
  ├── paymentTerms: string         // '50% + 50%'
  ├── terms: string                // Điều khoản chi tiết
  ├── pdfURL: string               // Generated PDF
  ├── signedPdfURL: string         // Signed version
  ├── status: 'draft' | 'pending_signature' | 'active' | 'completed' | 'terminated'
  ├── createdBy: uid
  ├── signedByWorkerAt: timestamp
  ├── signedByAdminAt: timestamp
  ├── createdAt: timestamp
  └── updatedAt: timestamp
```

##### Collection: `conversations` (Chat riêng tư)
```
conversations/{conversationId}
  ├── participants: uid[]          // [freelancerUid, jobMasterUid]
  ├── jobId: string
  ├── lastMessage: string
  ├── lastMessageAt: timestamp
  ├── unreadCount: { [uid]: number }
  │
  └── messages/{messageId}
        ├── senderId: uid
        ├── content: string
        ├── type: 'text' | 'file' | 'image'
        ├── fileURL: string
        ├── fileName: string
        ├── readBy: uid[]
        └── createdAt: timestamp
```

##### Collection: `payments`
```
payments/{paymentId}
  ├── jobId: string
  ├── contractId: string
  ├── milestoneId: string
  ├── workerId: uid
  ├── workerName: string
  ├── amount: number
  ├── reason: string               // 'Đạt mốc 50%', 'Nghiệm thu xong'
  ├── status: 'pending' | 'approved' | 'paid' | 'cancelled'
  ├── triggeredByMilestone: boolean
  ├── approvedByJobMaster: uid
  ├── approvedAt: timestamp
  ├── paidByAccountant: uid
  ├── paidAt: timestamp
  ├── paymentProof: string         // Upload ảnh UNC/chuyển khoản
  ├── bankReference: string
  ├── createdAt: timestamp
  └── updatedAt: timestamp
```

##### Collection: `notifications`
```
notifications/{notifId}
  ├── recipientId: uid
  ├── type: 'job_new' | 'application_received' | 'application_accepted' | 
  │         'application_rejected' | 'milestone_reached' | 'payment_pending' |
  │         'payment_completed' | 'contract_ready' | 'deadline_warning' |
  │         'comment_reply' | 'badge_earned' | 'progress_update'
  ├── title: string
  ├── body: string
  ├── link: string                 // Deep link to relevant page
  ├── read: boolean
  ├── createdAt: timestamp
  └── metadata: map               // Additional context data
```

##### Collection: `leaderboard` (aggregated monthly)
```
leaderboard/{year_month}           // e.g., '2026_04'
  ├── entries: [
  │     {
  │       uid: string,
  │       name: string,
  │       level: string,
  │       specialty: string,
  │       earnings: number,
  │       rating: number,
  │       completedJobs: number,
  │       badges: string[],
  │     }
  │   ]
  ├── generatedAt: timestamp
  └── period: 'monthly' | 'quarterly' | 'yearly'
```

---

#### 2.2 Firestore Security Rules

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper functions
    function isAuthenticated() { return request.auth != null; }
    function isOwner(uid) { return request.auth.uid == uid; }
    function hasRole(role) { return request.auth.token.role == role; }
    function isAdmin() { return hasRole('admin'); }
    function isJobMaster() { return hasRole('jobmaster'); }
    function isAccountant() { return hasRole('accountant'); }
    function isStaff() { return isAdmin() || isJobMaster() || isAccountant(); }
    
    // Users
    match /users/{uid} {
      allow read: if isAuthenticated();
      allow create: if isOwner(uid);
      allow update: if isOwner(uid) || isAdmin();
      
      match /certificates/{certId} {
        allow read: if isAuthenticated();
        allow write: if isOwner(uid) || isAdmin();
      }
      match /portfolio/{itemId} {
        allow read: if true;   // Public
        allow write: if isOwner(uid);
      }
    }
    
    // Jobs
    match /jobs/{jobId} {
      allow read: if resource.data.isPublic == true || isAuthenticated();
      allow create: if isStaff();
      allow update: if isStaff() || 
                       (isAuthenticated() && resource.data.assignedTo == request.auth.uid);
      
      match /applications/{appId} {
        allow read: if isStaff() || request.auth.uid == resource.data.applicantId;
        allow create: if isAuthenticated() && !isStaff();
        allow update: if isStaff();
      }
      
      match /comments/{commentId} {
        allow read: if isAuthenticated();
        allow create: if isAuthenticated();
        allow update: if isOwner(resource.data.authorId) || isAdmin();
      }
      
      match /progressUpdates/{updateId} {
        allow read: if isAuthenticated();
        allow create: if isAuthenticated();
      }
      
      match /deliverables/{fileId} {
        allow read: if isStaff() || request.auth.uid == resource.data.uploadedBy;
        allow create: if isAuthenticated();
        allow update: if isStaff();
      }
    }
    
    // Contracts
    match /contracts/{contractId} {
      allow read: if isStaff() || 
                    request.auth.uid == resource.data.partyB.uid;
      allow create: if isStaff();
      allow update: if isStaff() || 
                     (isAuthenticated() && resource.data.partyB.uid == request.auth.uid);
    }
    
    // Payments
    match /payments/{paymentId} {
      allow read: if isStaff() || 
                    request.auth.uid == resource.data.workerId;
      allow create: if isJobMaster() || isAdmin();
      allow update: if isAccountant() || isAdmin();
    }
    
    // Conversations (chat)
    match /conversations/{convId} {
      allow read, write: if isAuthenticated() && 
                           request.auth.uid in resource.data.participants;
      match /messages/{msgId} {
        allow read, write: if isAuthenticated() && 
                             request.auth.uid in get(/databases/$(database)/documents/conversations/$(convId)).data.participants;
      }
    }
    
    // Notifications
    match /notifications/{notifId} {
      allow read, update: if isOwner(resource.data.recipientId);
      allow create: if isStaff();  // Cloud Functions sẽ tạo
    }
    
    // Leaderboard
    match /leaderboard/{period} {
      allow read: if true;  // Public
      allow write: if false; // Only Cloud Functions
    }
  }
}
```

---

### Phase 3: Public Portal & Jobs (Tuần 3-5)

---

#### 3.1 Public Pages

##### [NEW] `src/app/(public)/page.tsx` — Landing Page (C1)
- Hero section với search bar + animated background
- Stats cards (jobs đang mở, workers, tổng giá trị)
- Job mới nhất (grid 3 cột, filter pills theo lĩnh vực)
- Vinh danh tháng này (top 4 workers)
- Footer

##### [NEW] `src/app/(public)/jobs/page.tsx` — Jobs Listing (C2)
- Advanced filters: Lĩnh vực, Level (L1-L5), Thù lao range, Địa điểm, Sắp xếp
- Job cards grid responsive (1-2-3 columns)
- Pagination hoặc infinite scroll
- Server-side filtering qua Firestore queries

##### [NEW] `src/app/(public)/jobs/[id]/page.tsx` — Job Detail (C3)
- Stepper: Chưa nhận việc → Chốt kèo → Đang thực hiện → Nghiệm thu → Đã thanh toán
- Thông tin job master (ẩn contact nếu chưa login)
- Thông tin công khai: Thù lao, payment milestones, thời hạn
- Phạm vi công việc, yêu cầu năng lực
- File đính kèm
- CTA dynamic: Guest → "Đăng ký để ứng tuyển" / Authenticated → "Gửi đơn ứng tuyển"
- Comments section (public Q&A)

##### [NEW] `src/app/(public)/leaderboard/page.tsx` — Leaderboard (C22)
- Top 3 highlight cards (pedestal style)
- Full ranking table
- Filter: Tháng/Quý/Năm + Lĩnh vực

##### [NEW] `src/app/(public)/badges/page.tsx` — Badge System (C23)
- Badge catalog (Top Earner, Speed Master, 5 Stars, Loyal Partner, Rising Star)
- "Huy hiệu của tôi" section (authenticated only)
- Progress tracking towards next badge

---

#### 3.2 Authentication Pages

##### [NEW] `src/app/(auth)/login/page.tsx` — Login (C6)
- Email/Password form
- Google SSO button
- Phone OTP button
- "Quên mật khẩu" link
- Animated split-screen layout

##### [NEW] `src/app/(auth)/register/page.tsx` — Register (C5)
- Step 1: Chọn loại tài khoản (Nhân viên INNO / Freelancer / Đối tác)
- Step 2: Thông tin cơ bản (tên, SĐT, email, password)
- Step 3 (Freelancer): Lĩnh vực, kinh nghiệm, phần mềm, CCHN, bio
- Upload CCHN scan
- Social login shortcuts

---

### Phase 4: Worker Portal (Tuần 4-6)

---

#### 4.1 Worker Dashboard & Management

##### [NEW] `src/app/(worker)/layout.tsx` — Worker Layout
- Sidebar navigation: Dashboard, Hồ sơ, Việc của tôi, Hợp đồng, Thông báo
- User avatar + level badge in header
- Notification bell with count

##### [NEW] `src/app/(worker)/dashboard/page.tsx` — Worker Dashboard (C7)
- Welcome message + Level progress bar
- Metrics: Jobs đang làm, Chờ nghiệm thu, Thu nhập tháng, Rating
- Huy hiệu đã nhận
- Việc gần đây (cards với progress bar)
- Thông báo gần đây

##### [NEW] `src/app/(worker)/profile/page.tsx` — Profile (C8)
- Avatar, tên, level badge, rating
- Thông tin cá nhân (editable)
- Chuyên môn (specialties pills)
- Chứng chỉ hành nghề (table)
- Portfolio grid (thumbnail cards)
- Lịch sử đánh giá

##### [NEW] `src/app/(worker)/my-jobs/page.tsx` — My Jobs (C9)
- Tab navigation: Đã ứng tuyển | Chốt kèo | Đang thực hiện | Đang nghiệm thu | Đã thanh toán | Hoàn thành
- Job cards per tab
- Quick actions per status

##### [NEW] `src/app/(worker)/my-jobs/[id]/page.tsx` — Job Detail (C10)
- Progress bar với payment milestones
- Job Master info card
- Progress update form (% + note)
- Progress history timeline
- Upload deliverable section
- Linked contract info
- Comment/chat exchange

##### [NEW] `src/app/(worker)/contracts/page.tsx` — Contracts (C11)
- Contract list table (Số HĐ, Tên job, Giá trị, Ngày ký, Trạng thái)
- Contract detail expandable
- PDF preview
- E-sign / Download PDF

##### [NEW] `src/app/(worker)/jobs/[id]/apply/page.tsx` — Apply Form (C3b)
- Job summary (read-only card)
- Applicant info confirmation (from profile)
- Additional info form: Available date, Expected fee, Cover letter, Portfolio link
- File attachment upload
- Confirmation checkboxes
- Submit button

---

### Phase 5: Admin & Job Master CMS (Tuần 5-8)

---

#### 5.1 Admin Dashboard

##### [NEW] `src/app/(admin)/layout.tsx` — Admin Layout
- Full sidebar: Dashboard, Quản lý job, Chờ duyệt, Ứng tuyển, Hợp đồng, Tiến độ, Người dùng, Báo cáo

##### [NEW] `src/app/(admin)/dashboard/page.tsx` — Admin Dashboard (C12)
- System metrics: Jobs đang mở, Chờ duyệt, HĐ hiệu lực, Giá trị HĐ tháng, Workers active, Tỷ lệ đúng hạn
- Chart: Số job theo lĩnh vực (bar chart)
- Chart: Doanh thu 6 tháng (line chart)
- Recent jobs table
- Top workers tháng

##### [NEW] `src/app/(admin)/jobs/create/page.tsx` — Create Job (C13)
- Multi-section form:
  - Thông tin cơ bản (title, category, level, workMode)
  - Phạm vi công việc (rich text)
  - Yêu cầu năng lực
  - Thù lao & Milestones (dynamic form — thêm/xóa đợt)
  - Checklist items
  - File đính kèm
  - Chọn Job Master
- Save as draft / Submit for approval

##### [NEW] `src/app/(admin)/jobs/pending/page.tsx` — Pending Approval (C14)
- List of jobs awaiting approval
- Quick approve/reject actions
- Detail review page

##### [NEW] `src/app/(admin)/jobs/[id]/review/page.tsx` — Job Review (C4)
- Full job detail + admin notes
- Internal notes section (không hiển thị cho freelancer)
- Approve / Request changes / Reject

##### [NEW] `src/app/(admin)/jobs/[id]/applications/page.tsx` — Applications (C15)
- Applicant cards with profile preview
- Side-by-side comparison
- Shortlist / Accept / Reject actions
- Auto-create contract wizard when accepting

##### [NEW] `src/app/(admin)/contracts/page.tsx` — Contract Management (C16)
- Contracts table (filter by status)
- Contract wizard (C26):
  - Step 1: Chọn mẫu hợp đồng
  - Step 2: Auto-fill từ job + worker data
  - Step 3: Chỉnh sửa điều khoản
  - Step 4: Preview PDF
  - Step 5: Gửi cho worker ký

##### [NEW] `src/app/(admin)/progress/page.tsx` — Progress Tracking (C17)
- All active jobs with progress bars
- Milestone status overview
- Quick approve milestone buttons

##### [NEW] `src/app/(admin)/users/page.tsx` — User Management (C18)
- Users table (searchable, filterable by role/status)
- User detail modal/page
- Change role, suspend, verify account
- Verify certificates

##### [NEW] `src/app/(admin)/reports/page.tsx` — Reports (C19)
- Revenue by period
- Jobs by category/status
- Worker performance
- Export CSV/PDF

---

#### 5.2 Job Master CMS

##### [NEW] `src/app/(jobmaster)/layout.tsx` — Job Master Layout
- Sidebar: Dashboard, Jobs quản lý, Ứng viên, Tiến độ, Chat

##### [NEW] `src/app/(jobmaster)/dashboard/page.tsx`
- Overview of managed jobs
- Pending actions (approve milestones, review deliverables)
- Recent messages

##### [NEW] `src/app/(jobmaster)/jobs/[id]/page.tsx` — Job Management
- Full job detail with edit capabilities
- Progress monitoring with milestone approval
- Deliverable review (approve / request revision)
- Direct chat with assigned freelancer

##### [NEW] `src/app/(jobmaster)/chat/page.tsx` — Chat Hub
- Conversation list (by job)
- Real-time message exchange
- File sharing

---

### Phase 6: Accountant Portal & Business Logic (Tuần 7-9)

---

#### 6.1 Accountant Portal

##### [NEW] `src/app/(accountant)/layout.tsx` — Accountant Layout
- Sidebar: Dashboard, Cần xử lý, Lịch sử thanh toán

##### [NEW] `src/app/(accountant)/page.tsx` — Accountant Dashboard (C20)
- Metrics: Tổng cần thanh toán, Đợt chờ xử lý, Đã thanh toán tháng
- Pending payments table
- "Xác nhận đã thanh toán" action per payment

##### [NEW] `src/app/(accountant)/history/page.tsx` — Payment History (C21)
- Full history table (date, job, worker, amount, milestone, confirmer)
- Filters: Thời gian, Worker, Job
- Total sum in filter range
- Export CSV

---

#### 6.2 Cloud Functions (Business Logic)

##### [NEW] `functions/src/index.ts`

**Triggers tự động:**

| Trigger | Event | Action |
|---------|-------|--------|
| `onJobCreated` | Job created | Notify approving admin |
| `onJobApproved` | Job status → 'open' | Notify relevant freelancers (matching specialty + level) |
| `onApplicationSubmitted` | New application | Notify job master + admin |
| `onApplicationAccepted` | Application accepted | Notify freelancer, create contract draft, create payment schedule |
| `onProgressUpdated` | Progress crosses milestone | Notify job master for approval |
| `onMilestoneApproved` | Job master approves milestone | Create payment record, notify accountant |
| `onPaymentConfirmed` | Accountant confirms payment | Notify freelancer + admin, update job status |
| `onJobCompleted` | All milestones paid | Update worker stats, check badge eligibility, update leaderboard |
| `onDeadlineApproaching` | Scheduled (daily) | Notify when deadline is 3 days, 1 day away |
| `onMonthEnd` | Scheduled (monthly) | Generate leaderboard snapshot, mint badges |

**Computed Logic:**
- Worker level calculation dựa trên: completed jobs × quality rating × complexity level
- Badge eligibility check (Top Earner, Speed Master, 5 Stars, Loyal Partner, Rising Star)
- Leaderboard aggregation

---

### Design & UX Guidelines

---

#### Visual Identity

Lấy cảm hứng từ wireframe hiện tại nhưng nâng cấp:

| Aspect | Wireframe hiện tại | Production upgrade |
|--------|--------------------|--------------------|
| **Colors** | Muted teal palette | Vibrant teal gradient + accent colors |
| **Typography** | System fonts | Inter + Outfit (Google Fonts) |
| **Cards** | Flat borders | Subtle shadows + glass morphism on hover |
| **Animations** | None | Smooth enter transitions, hover effects, skeleton loading |
| **Dark Mode** | Basic invert | Carefully crafted dark palette |
| **Mobile** | Not designed | Full responsive design, bottom nav on mobile |
| **Icons** | None | Lucide Icons (consistent, lightweight) |
| **Charts** | Placeholder SVG | Recharts library (animated, interactive) |

#### Responsive Breakpoints
- **Mobile**: < 768px → Bottom tab navigation, stacked layouts, full-width cards
- **Tablet**: 768px - 1024px → Collapsible sidebar, 2-column grids
- **Desktop**: > 1024px → Full sidebar, 3-column grids, split views

#### Design System Components (Shared)
- `<Button>` — primary, success, warning, danger, ghost variants
- `<Badge>` — level (L1-L5), status (open, deal, progress, review, ...), role
- `<Card>` — default, metric, job, honor, feature
- `<Avatar>` — sm, md, lg, with level indicator
- `<Progress>` — linear, with milestones
- `<Stepper>` — horizontal, with status colors
- `<Modal>` — dialog, fullscreen, drawer
- `<DataTable>` — sortable, filterable, exportable
- `<Chart>` — bar, line, donut
- `<Skeleton>` — loading states for all card types
- `<Toast>` — success, error, info
- `<FileUpload>` — drag & drop, preview, progress
- `<RichTextEditor>` — for job descriptions
- `<SearchCombobox>` — with debounce + Firestore query

---

## Suggestions Bổ Sung (Không có trong wireframe)

> [!TIP]
> **1. Hệ thống Rating 2 chiều**: Hiện tại chỉ có admin/job master đánh giá freelancer. Suggest thêm freelancer đánh giá trải nghiệm làm việc (not public, chỉ admin xem) → giúp cải thiện quy trình nội bộ.

> [!TIP]
> **2. Job Template System**: Admin có thể lưu job thường tạo thành template, tạo job mới nhanh hơn. Ví dụ: "Template BIM Modeling Office Tower L3".

> [!TIP]
> **3. Dispute/Escalation**: Khi freelancer hoặc job master không đồng ý về tiến độ/chất lượng → có flow escalation lên Admin. Hiện wireframe chưa có.

> [!TIP]
> **4. Worker Availability Calendar**: Freelancer có thể set lịch rảnh/bận → Admin thấy khi tạo job, matching thông minh hơn.

> [!TIP]
> **5. Bulk Job Import**: Admin import nhiều jobs từ Excel/CSV → tiện khi có project lớn cần chia nhỏ.

> [!TIP]
> **6. PWA Support**: Thêm Progressive Web App manifest → Freelancer cài như app trên điện thoại, nhận push notification mà không cần app store.

> [!TIP]
> **7. Activity Log / Audit Trail**: Ghi log mọi action quan trọng (create job, approve, payment, status change) → phục vụ đối soát, kiểm toán.

---

## Open Questions

> [!IMPORTANT]
> **Q1**: Hệ thống có cần hỗ trợ **đa ngôn ngữ** (i18n) không? Hiện tại chỉ tiếng Việt?

> [!IMPORTANT]
> **Q2**: **Phân quyền chi tiết hơn**: Admin có phải là 1 role duy nhất hay cần super-admin vs regular admin? Job Master có thể là admin kiêm nhiệm không?

> [!IMPORTANT]
> **Q3**: Hệ thống **deploy Firebase project** nào? Bạn đã có Firebase project sẵn hay cần tạo mới?

> [!IMPORTANT]
> **Q4**: Budget cho **SendGrid/Resend** (email service) — Firebase free tier có giới hạn. Bạn muốn dùng service nào?

> [!IMPORTANT]
> **Q5**: **Hợp đồng mẫu**: Bạn có sẵn template hợp đồng Word/PDF không? Hay cần tôi thiết kế template?

> [!IMPORTANT]
> **Q6**: Về **deployment strategy** — Bạn muốn deploy bằng Vercel (frontend) + Firebase (backend services) hay dùng Firebase Hosting cho cả frontend?

---

## Verification Plan

### Automated Tests
- Unit tests cho business logic (level calculation, badge eligibility, payment flow)
- Integration tests cho Firestore security rules (sử dụng Firebase Emulator)
- E2E tests cho critical flows: Register → Login → Apply → Accept → Progress → Payment

### Manual Verification
- Browser testing trên Chrome, Firefox, Safari, Mobile Safari, Chrome Android
- Performance audit bằng Lighthouse (target: 90+ score)
- Security review: OWASP Top 10 checklist
- Load testing security rules
- Real device testing cho responsive design

### Phased Delivery
| Phase | Scope | Timeline |
|-------|-------|----------|
| Phase 1 | Foundation + Auth + Design System | Tuần 1-2 |
| Phase 2 | Data Models + Security Rules | Tuần 2-3 |
| Phase 3 | Public Portal + Job Listing | Tuần 3-5 |
| Phase 4 | Worker Portal | Tuần 4-6 |
| Phase 5 | Admin + Job Master CMS | Tuần 5-8 |
| Phase 6 | Accountant + Cloud Functions + Polish | Tuần 7-9 |

> Mỗi phase sẽ có demo để bạn review trước khi tiếp tục phase tiếp theo.
