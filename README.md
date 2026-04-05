# VAA Job Platform — Outsourcing Management System

> **Nền tảng quản lý outsourcing tư vấn xây dựng** cho Công ty TNHH Tư vấn Kiến trúc Việt Nam (VAA).  
> Kết nối Job Master, Freelancer, Kế toán và Admin trong một hệ sinh thái công việc chuyên nghiệp.

---

## 📋 Tổng quan

VAA Job Platform là hệ thống quản lý công việc outsourcing end-to-end, bao gồm:

- **Đăng tuyển & Quản lý Job** — Tạo, duyệt, phân công, theo dõi tiến độ công việc
- **Hợp đồng điện tử** — Tự động tạo hợp đồng giao khoán, ký số, xuất PDF
- **Thanh toán theo Milestone** — Quản lý thanh toán theo đợt, tự động tạo invoice
- **Hệ thống Huy hiệu & Trust Score** — Đánh giá độ tin cậy freelancer
- **Thông báo realtime** — Cảnh báo deadline, cập nhật trạng thái tự động
- **CMS đa vai trò** — Dashboard riêng cho Admin, Job Master, Freelancer, Kế toán

---

## 🏗️ Kiến trúc hệ thống

```
┌─────────────────────────────────────────────────┐
│                  Frontend (Next.js 14)           │
│  ┌──────┐  ┌────────┐  ┌──────────┐  ┌───────┐ │
│  │Admin │  │JobMaster│  │Freelancer│  │Account│ │
│  │  CMS │  │  Panel  │  │  Portal  │  │  ant  │ │
│  └──────┘  └────────┘  └──────────┘  └───────┘ │
├─────────────────────────────────────────────────┤
│              Firebase Backend Services           │
│  ┌──────────┐  ┌──────────┐  ┌───────────────┐ │
│  │ Firestore │  │  Storage  │  │Cloud Functions│ │
│  │ Database  │  │  (Files)  │  │ (Serverless)  │ │
│  └──────────┘  └──────────┘  └───────────────┘ │
│  ┌──────────┐  ┌──────────┐                     │
│  │   Auth   │  │ Hosting  │                     │
│  └──────────┘  └──────────┘                     │
└─────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 14 (App Router), React 18, TypeScript |
| **Styling** | CSS Modules, Responsive Design, Print-optimized |
| **Icons** | Lucide React |
| **Backend** | Firebase Cloud Functions (Node.js 18, 2nd gen) |
| **Database** | Cloud Firestore |
| **Storage** | Firebase Storage |
| **Auth** | Firebase Authentication |
| **PDF** | PDFKit (server-side contract generation) |
| **Hosting** | Vercel (Frontend) + Firebase (Backend) |
| **SEO** | Dynamic metadata, sitemap, robots.txt |

---

## 📁 Cấu trúc thư mục

```
inno-outsourcing/
├── app/                          # Next.js Application
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/           # Auth pages (login, register)
│   │   │   ├── (public)/         # Public pages
│   │   │   │   ├── jobs/         #   ├─ Job listing & detail
│   │   │   │   ├── huy-hieu/     #   ├─ Badge hall of fame
│   │   │   │   ├── vinh-danh/    #   ├─ Leaderboard
│   │   │   │   └── ve-chung-toi/ #   └─ About us
│   │   │   ├── (role)/           # Role-based dashboards
│   │   │   │   ├── admin/        #   ├─ Admin CMS
│   │   │   │   ├── jobmaster/    #   ├─ Job Master panel
│   │   │   │   ├── freelancer/   #   ├─ Freelancer portal
│   │   │   │   └── accountant/   #   └─ Accountant dashboard
│   │   │   └── api/              # API routes
│   │   ├── components/
│   │   │   ├── layout/           # Sidebar, Header, Navigation
│   │   │   ├── profile/          # Profile, SignaturePad
│   │   │   └── ui/               # Design system components
│   │   │       ├── Badge.tsx
│   │   │       ├── Button.tsx
│   │   │       ├── Card.tsx
│   │   │       ├── FileItem.tsx
│   │   │       ├── TrustBadge.tsx
│   │   │       └── ...
│   │   ├── lib/
│   │   │   ├── firebase/         # Firebase config, auth, firestore
│   │   │   ├── matching/         # Trust score, job matching
│   │   │   ├── security/         # Sanitization, rate limiting
│   │   │   └── validations/      # Zod schemas
│   │   └── types/                # TypeScript definitions
│   └── functions/
│       └── src/index.ts          # Cloud Functions (9 triggers)
├── firestore.rules               # Firestore Security Rules
├── storage.rules                 # Storage Security Rules
├── firebase.json                 # Firebase configuration
└── design-system/                # Design tokens & documentation
```

---

## 🚀 Tính năng chính

### 🔐 Hệ thống phân quyền (4 vai trò)

| Vai trò | Khả năng |
|---------|----------|
| **Admin** | Quản lý toàn bộ hệ thống, duyệt job, xem hợp đồng, cấu hình |
| **Job Master** | Tạo/quản lý job, review ứng tuyển, phân công, tạo thanh toán |
| **Freelancer** | Xem job, ứng tuyển, ký hợp đồng, nộp sản phẩm, nhận thanh toán |
| **Accountant** | Xem lệnh thanh toán, xác nhận đã thanh toán |

### 📄 Hợp đồng giao khoán điện tử

- **Tự động tạo** khi Job Master assign freelancer
- **Số hợp đồng tự động**: Format `x/y/VAA-z` (ví dụ: `1/2026/VAA-KT`)
  - `x`: Số thứ tự trong năm
  - `y`: Năm ký
  - `z`: VAA + viết tắt lĩnh vực (KT=Kiến trúc, KC=Kết cấu, DT=Dự toán, MEP, BIM, GS, TT)
- **17 điều khoản** theo chuẩn pháp luật Việt Nam
- **Font Times New Roman** cho tất cả nội dung pháp lý
- **Ký số & xuất PDF** tự động

### 📊 Trust Score & Huy hiệu

- **Trust Score** (0-100): Tổng hợp từ Rating (40%), On-time (25%), Completion (20%), Experience (15%)
- **3 cấp badge**: Mới → Đang phát triển → Đáng tin cậy
- **Huy hiệu thành tích**: Loyal Partner, 5 Stars, Speed Master, Rising Star
- **Auto-scoring ứng tuyển**: Chấm điểm tự động dựa trên kỹ năng, level, lịch sử, giá

### ⚡ Cloud Functions (Serverless)

| # | Function | Trigger |
|---|----------|---------|
| 1 | `onCreateContractPDF` | Contract created → Generate PDF |
| 2 | `requestPaymentOrder` | Callable → Create payment with escrow |
| 3 | `onJobStatusChange` | Job updated → Notify, create contract, award badges |
| 4 | `onApplicationSubmitted` | Application created → Auto-score, notify |
| 5 | `onApplicationUpdated` | Status changed → Notify freelancer |
| 6 | `onPaymentUpdated` | Payment status → Notify, update earnings, create invoice |
| 7 | `onContractStatusChange` | Contract status → Notify freelancer |
| 8 | `onContractSubmitted` | Contract signed → Notify admin/jobmaster/accountant |
| 9 | `scheduledDeadlineCheck` | Daily 9AM → Multi-tier deadline warnings |

---

## ⚙️ Cài đặt & Chạy

### Yêu cầu
- Node.js 18+
- Firebase CLI (`npm i -g firebase-tools`)
- Firebase project đã cấu hình

### 1. Clone & Install

```bash
git clone https://github.com/your-org/inno-outsourcing.git
cd inno-outsourcing/app
npm install
```

### 2. Cấu hình Firebase

```bash
# Tạo file .env.local trong thư mục app/
cp .env.example .env.local
# Điền Firebase config values
```

**Biến môi trường cần thiết:**
```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

### 3. Chạy Development Server

```bash
npm run dev
# → http://localhost:3000
```

### 4. Deploy

```bash
# Frontend (Vercel)
vercel --prod

# Firebase Rules & Functions
firebase deploy --only firestore:rules,storage,functions
```

---

## 🔒 Bảo mật

- **Firestore Rules**: Row-level security theo role, chỉ cho phép truy cập data thuộc về user
- **Storage Rules**: Phân quyền upload/download theo thư mục (`signatures/`, `contracts/`, `avatars/`)
- **Input Sanitization**: Tất cả user input được sanitize trước khi lưu
- **Rate Limiting**: Giới hạn request trên client-side
- **CSP-safe**: Không sử dụng `eval()`, `fetch()` cho blob conversion

---

## 📐 Convention & Standards

### Code
- **TypeScript strict mode** cho type safety
- **CSS Modules** — không sử dụng global styles
- **Lucide icons** — thống nhất icon system
- **Zod validation** — schema-based form validation

### UI/UX
- **Responsive Design** — Mobile-first approach
- **Times New Roman** — Font chuẩn cho văn bản pháp lý
- **Print-optimized** — Contract pages render đúng khi in/xuất PDF
- **Vietnamese locale** — Toàn bộ nội dung bằng tiếng Việt

### Git
- Branch: `main` (production)
- Commit convention: Descriptive Vietnamese/English messages

---

## 📝 License

Private — © 2024-2026 INNO JSC / VAA Engineering. All rights reserved.
