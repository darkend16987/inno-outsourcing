@app/AGENTS.md
@_bmad-output/project-context.md

# VAA JOB (INNO Jobs) - AI Agent Instructions

## Project Overview

Nền tảng quản lý việc làm outsourcing cho ngành thiết kế xây dựng. Full-stack app dùng Next.js 16 + Firebase + TypeScript.

## Quick Reference

- **Main app code**: `app/src/`
- **Types**: `app/src/types/index.ts`
- **Firebase helpers**: `app/src/lib/firebase/`
- **Validation schemas**: `app/src/lib/validations/`
- **Components**: `app/src/components/`
- **Cloud Functions**: `app/functions/src/index.ts`
- **Firestore rules**: `app/firestore.rules` và `firestore.rules` (root)
- **Design system**: `design-system/inno-jobs/MASTER.md`

## Critical Rules

1. **Next.js 16** - Có breaking changes, đọc `node_modules/next/dist/docs/` trước khi code
2. **"use client"** - Hầu hết components là client-side (Firebase Auth)
3. **Path alias** - Luôn dùng `@/` (maps to `app/src/*`)
4. **Firestore** - Không lưu `undefined`, dùng `deleteField()`. Luôn dùng `serverTimestamp()`
5. **Types** - Import từ `@/types`, không tạo type riêng lẻ
6. **CSS Modules** - Không dùng Tailwind hay CSS-in-JS
7. **Job state** - Validate transitions qua `@/lib/state/job-state-machine.ts`
8. **Security** - Sanitize input (dompurify), CSRF tokens, encrypt sensitive fields
9. **Tests** - Vitest (NOT Jest). Config: `vitest.config.ts`

## BMAD Method

Project sử dụng BMAD Method v6 cho structured development. Xem `_bmad/` cho agents và workflows.

### Key Skills

- `bmad-help` - Hướng dẫn bước tiếp theo
- `bmad-quick-dev` - Fix bugs, implement changes nhanh
- `bmad-dev-story` - Implement story từ spec
- `bmad-sprint-planning` - Lập kế hoạch sprint
- `bmad-correct-course` - Điều chỉnh giữa sprint
- `bmad-create-epics-and-stories` - Tạo epics và stories
- `bmad-code-review` - Review code
- `bmad-generate-project-context` - Cập nhật project context

### Output Directories

- Planning artifacts: `_bmad-output/planning-artifacts/`
- Implementation artifacts: `_bmad-output/implementation-artifacts/`
- Project knowledge: `docs/`
