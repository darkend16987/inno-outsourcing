---
project_name: 'VAA JOB (INNO Jobs)'
user_name: 'Developer'
date: '2026-04-04'
sections_completed: ['technology_stack', 'critical_rules', 'patterns', 'conventions']
existing_patterns_found: 15
---

# Project Context for AI Agents

_File này chứa các rules và patterns quan trọng mà AI agents phải tuân theo khi implement code trong project. Tập trung vào những chi tiết không hiển nhiên mà agents có thể bỏ sót._

---

## Technology Stack & Versions

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend Framework | Next.js (App Router) | 16.2.2 |
| Language | TypeScript (strict mode) | ^5.0 |
| UI Library | React | 19.2.4 |
| Styling | CSS Modules | N/A |
| Forms | React Hook Form + Zod | ^7.72.0 + ^4.3.6 |
| Database | Cloud Firestore | Firebase |
| Authentication | Firebase Auth | ^12.11.0 |
| Icons | Lucide React | ^1.7.0 |
| Animations | Framer Motion | ^12.38.0 |
| Charts | Recharts | ^3.8.1 |
| Cloud Functions | Firebase Cloud Functions Gen 2 | Node.js 20 |
| Testing | Vitest + React Testing Library | ^4.1.2 + ^16.3.2 |
| Hosting | Vercel (frontend) + Firebase (backend) | - |
| Security | Jose (JWT), isomorphic-dompurify (XSS) | ^6.2.2, ^3.7.1 |

---

## Critical Implementation Rules

### 1. Next.js 16 Breaking Changes

> **QUAN TRỌNG**: Đây là Next.js 16 - KHÔNG phải phiên bản bạn biết. Đọc guide trong `node_modules/next/dist/docs/` trước khi viết code. Chú ý deprecation notices.

### 2. "use client" Directive

- **Tất cả page components** đều dùng `'use client'` vì project sử dụng Firebase Auth (client-side)
- **Tất cả UI components** đều là client components
- **Chỉ có API routes** (`app/src/app/api/`) là server-side

### 3. Path Alias

- Sử dụng `@/*` mapping tới `./src/*` (cấu hình trong tsconfig.json)
- **LUÔN** dùng `@/` cho imports, KHÔNG dùng relative paths dài như `../../../`
- Ví dụ: `import { Button } from '@/components/ui/Button'`

### 4. Firebase/Firestore Rules

- **KHÔNG BAO GIỜ** lưu `undefined` vào Firestore - phải dùng `deleteField()` thay thế
- **LUÔN** strip undefined values trước khi gọi `updateDoc()` hoặc `setDoc()`
- Sử dụng `serverTimestamp()` cho `createdAt`/`updatedAt`, KHÔNG dùng `new Date()`
- Import `db` từ `@/lib/firebase/config` - KHÔNG init Firebase lại

### 5. Firestore Data Patterns

- **Subcollections** cho nested data (applications, comments, progressUpdates, milestoneSubmissions nằm dưới jobs)
- **Denormalized stats** trên user profiles (stats field) - cập nhật song song khi có thay đổi
- **State machine** cho job status transitions - validate qua `@/lib/state/job-state-machine`
- **Sensitive fields** được encrypt trước khi lưu - dùng `encryptSensitiveFields()` / `decryptSensitiveFields()`

### 6. Security Requirements

- **XSS Protection**: Sanitize user input với `isomorphic-dompurify` trước khi render
- **CSRF Protection**: Token-based, kiểm tra trong API routes
- **JWT Sessions**: Server-side session management qua `@/lib/auth/session.ts`
- **Firestore Rules**: Role-based access control - mọi thay đổi Firestore rules phải test kỹ

### 7. Type Safety

- **LUÔN** import types từ `@/types` (file `src/types/index.ts`)
- **KHÔNG** tạo type definitions riêng lẻ trong component files
- Thêm types mới vào `@/types/index.ts`
- Sử dụng strict TypeScript - KHÔNG dùng `any` type

---

## Project Architecture Patterns

### Component Structure

```
src/components/
├── ui/          # Design system primitives (Button, Card, Modal, Badge, Avatar...)
├── layout/      # Header, Sidebar, Footer
├── jobs/        # Job-related business components
├── chat/        # Real-time messaging
├── finance/     # Invoice, payment components
├── reviews/     # Review and rating
├── disputes/    # Dispute management
├── analytics/   # Analytics dashboards
├── notifications/ # Notification hub
├── contracts/   # Contract management
├── checklist/   # Completion tracking
├── gamification/ # Badges, challenges
├── escrow/      # Escrow status
├── comments/    # Comment sections
└── __tests__/   # Component tests
```

### Component Pattern

```tsx
'use client';

import React from 'react';
import styles from './ComponentName.module.css';
import type { SomeType } from '@/types';

interface ComponentNameProps {
  // Props interface defined inline for component-specific props
}

export default function ComponentName({ ...props }: ComponentNameProps) {
  // Component implementation
  return <div className={styles.container}>...</div>;
}
```

### CSS Module Pattern

- Mỗi component có file `.module.css` riêng cùng tên: `Button.tsx` ↔ `Button.module.css`
- Sử dụng CSS custom properties (variables) định nghĩa trong `globals.css`
- Naming convention: camelCase cho class names trong CSS modules
- **KHÔNG** dùng Tailwind, styled-components, hay CSS-in-JS runtime

### Page Structure (App Router)

```
src/app/
├── (auth)/        # Login, Register pages
├── (public)/      # Public pages (landing, jobs, leaderboard, badges)
├── (role)/        # Protected role-based portals
│   ├── admin/     # Admin CMS
│   ├── freelancer/# Worker portal
│   ├── jobmaster/ # Job Master CMS
│   └── accountant/# Accountant CMS
├── api/           # API routes (auth/session)
└── layout.tsx     # Root layout with Providers
```

### Firebase Helper Pattern

```typescript
// All Firestore operations go through helper functions in:
// - @/lib/firebase/firestore.ts (CRUD, pagination)
// - @/lib/firebase/firestore-extended.ts (advanced queries)
// - @/lib/firebase/reviews.ts, comments.ts, disputes.ts, etc.

// Pattern: Paginated queries return PaginatedResult<T>
export interface PaginatedResult<T> {
  items: T[];
  lastDoc: DocumentSnapshot | null;
  hasMore: boolean;
}
```

### Form Validation Pattern

```typescript
// Validation schemas defined in @/lib/validations/
// Using Zod for schema definition + @hookform/resolvers for integration
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const schema = z.object({ /* ... */ });
const { register, handleSubmit, formState } = useForm({
  resolver: zodResolver(schema),
});
```

### Authentication Pattern

```typescript
// Auth context wraps entire app via Providers.tsx
// Access auth state in any client component:
import { useAuth } from '@/lib/firebase/auth-context';

const { userProfile, firebaseUser, loading } = useAuth();
// userProfile contains role, permissions, stats, etc.
```

### Custom Hooks

- `useChat` - Real-time messaging
- `useNotifications` - Notification system
- `useTheme` - Dark mode toggle
- `useSmartMatching` - Job matching algorithm

---

## Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| Components | PascalCase | `JobCard.tsx` |
| CSS Modules | PascalCase.module.css | `JobCard.module.css` |
| Hooks | camelCase with "use" prefix | `useChat.ts` |
| Lib modules | kebab-case | `job-state-machine.ts` |
| Pages | `page.tsx` (Next.js convention) | `app/(role)/admin/page.tsx` |
| Types | PascalCase interfaces | `UserProfile`, `JobApplication` |
| CSS classes | camelCase | `styles.cardContainer` |

---

## User Roles & Access

| Role | Access Level |
|------|-------------|
| `freelancer` | Job browsing, applications, chat, profile, contracts |
| `jobmaster` | Job creation, application management, chat |
| `admin` | Full system access, user management, reports |
| `accountant` | Payment processing, financial dashboards |

---

## Job Lifecycle State Machine

```
Draft → Pending Approval → Open → Assigned → In Progress → Review → Completed → Paid
```

- Transitions validated via `@/lib/state/job-state-machine.ts`
- **KHÔNG** update job status trực tiếp - LUÔN dùng `validateTransition()` trước

---

## Firestore Collections

| Collection | Subcollections |
|-----------|---------------|
| `users` | certificates, portfolio, badges |
| `jobs` | applications, comments, progressUpdates, deliverables, milestoneSubmissions |
| `contracts` | - |
| `conversations` | messages |
| `payments` | - |
| `notifications` | - |
| `leaderboard` | - |
| `reviews` | - |
| `disputes` | - |
| `invoices` | - |

---

## Testing

- Framework: **Vitest** (NOT Jest)
- Test files: `__tests__/` directory hoặc `*.test.tsx` cùng thư mục
- Chạy tests: `npm run test` (vitest run) hoặc `npm run test:watch`
- Config: `vitest.config.ts` + `vitest.setup.ts`

---

## Environment Variables

- Firebase config: `NEXT_PUBLIC_FIREBASE_*` (client-side, public)
- Session secret: `SESSION_SECRET` (server-side only)
- **KHÔNG** commit `.env` files
- Reference: `app/.env.example`

---

## Cloud Functions (Firebase Gen 2)

9 functions deployed:
- Badge awarding and notifications
- Application matching and scoring
- Payment processing triggers
- Contract generation
- Deadline checking (scheduled)
- Leaderboard aggregation (scheduled)

Functions source: `app/functions/src/index.ts`
