# INNO Jobs — Task Tracker

## Phase 1: Foundation & Authentication

### 1.1 Project Setup
- [x] Initialize Next.js 15 project
- [x] Setup TypeScript, ESLint configuration
- [x] Create Design System (CSS tokens, globals)
- [x] Create folder structure (app routes, components, lib)
- [x] Firebase SDK initialization
- [x] Environment variables setup

### 1.2 Core UI Components
- [x] Button component
- [x] Badge component (level, status, role)
- [x] Card component (default, metric, job, honor)
- [x] Avatar component
- [ ] Progress component
- [ ] Stepper component
- [ ] Modal / Drawer component
- [ ] DataTable component
- [ ] FileUpload component
- [ ] Toast / Notification component
- [ ] Skeleton loading component
- [ ] SearchCombobox component

### 1.3 Layout Components
- [x] Public Header (topbar)
- [x] Public Footer
- [x] Worker Sidebar
- [ ] Admin Sidebar
- [ ] Job Master Sidebar
- [ ] Accountant Sidebar

### 1.4 Authentication
- [ ] Firebase Auth setup (Google SSO + Phone OTP + Email)
- [x] Auth context / provider
- [x] Login page (C6)
- [x] Register page (C5)
- [ ] Middleware for role-based route protection
- [ ] Auth hooks (useAuth, useUser)

## Phase 2: Data Architecture
- [ ] Firestore schema implementation
- [ ] Security rules
- [ ] Storage rules
- [ ] Helper functions (CRUD for each collection)
- [x] TypeScript interfaces for all models

## Phase 3: Public Portal
- [x] Landing page (C1)
- [x] Jobs listing (C2)
- [x] Job detail (C3)
- [ ] Leaderboard (C22)
- [ ] Badges catalog (C23)

## Phase 4: Worker Portal
- [x] Worker Dashboard (C7)
- [x] Profile page (C8)
- [x] My Jobs listing (C9)
- [x] Job detail - worker view (C10)
- [x] Apply form (C3b)
- [x] Contracts page (C11)

## Phase 5: Admin & Job Master CMS
- [x] Admin Dashboard (C12)
- [x] Create Job (C13)
- [x] Pending Approval (C14)
- [x] Job Review (C4)
- [x] Applications (C15)
- [x] Contract Management (C16)
- [x] Progress Tracking (C17)
- [x] User Management (C18)
- [x] Reports (C19)
- [x] Job Master Dashboard & pages

## Phase 6: Accountant & Business Logic
- [x] Accountant Dashboard (C20)
- [x] Payment History (C21)
- [ ] Implement PDF Contract Generation & Upload mapping to Storage
- [ ] Cloud Function: Milestone approval triggers Payment Order
- [ ] Notification system

## Phase 7: Backend Integration (Data & Logic)
- [x] Create Firestore Rules & Schema
- [x] Implement Next.js Middleware Route Protection
- [x] Wire Firebase Auth (Google + Email)
- [x] Build Firestore CRUD helpers (`firestore.ts`)
- [ ] Final polish & testing
