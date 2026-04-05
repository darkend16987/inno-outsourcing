# Fix Multiple Platform Bugs — VAA JOB

## Summary
Fix 10+ issues across system config, dashboards, CMS, contracts, and portfolio.

## Proposed Changes

### 1. System Config — `setDoc()` undefined values (CRITICAL)

**Root Cause**: In `handleAddItem()` in `admin/settings/page.tsx`, line 130-131:
```js
description: newDesc || undefined,
icon: newIcon || undefined,
```
These pass `undefined` values to Firebase `setDoc()`, which is not allowed. Additionally, `saveConfigItems()` in `system-config.ts` passes items array directly — if any item has `undefined` fields, Firestore rejects.

**Fix**: Strip `undefined` values before saving.

#### [MODIFY] [system-config.ts](file:///d:/GitHub/inno-outsourcing/app/src/lib/firebase/system-config.ts)
- In `saveConfigItems()`, strip `undefined` from each item before calling `setDoc()`

#### [MODIFY] [page.tsx (admin/settings)](file:///d:/GitHub/inno-outsourcing/app/src/app/(role)/admin/settings/page.tsx)
- Change `undefined` to empty string or omit the key entirely in `handleAddItem()`

---

### 2. Admin Job Detail — Show Creator Name instead of UID

**Root Cause**: `job.createdBy` stores `userProfile.uid`. The display just shows the raw UID without resolving to a name.

**Fix**: `createdBy` is the UID. We need to use `job.jobMasterName` instead, which is already stored as the displayName.

#### [MODIFY] [page.tsx (admin/jobs/[id])](file:///d:/GitHub/inno-outsourcing/app/src/app/(role)/admin/jobs/%5Bid%5D/page.tsx)
- Replace `job.createdBy` with `job.jobMasterName || job.createdBy` in both "Người tạo" fields
- Display internal info fields (projectScale, projectImages, internalNotes, buildingType, etc.)

---

### 3. Rename "Hình ảnh công trình" → "File thông tin" + Smart File Display

**Affected files** (6 files):
- `(public)/jobs/[id]/page.tsx` — Frontend detail
- `(role)/jobmaster/jobs/create/page.tsx` — Create form
- `(role)/jobmaster/jobs/[id]/page.tsx` — JM detail
- `(role)/admin/jobs/[id]/page.tsx` — Admin detail
- `(role)/admin/jobs/create/page.tsx` — Admin create

**Fix**: 
- Change title from `Hình ảnh công trình` → `File thông tin`
- Change emoji from 🏗️ → 📁
- Update icon from `ImageIcon` to `FileText` / `Paperclip`
- For non-image URLs (dwg, rvt, skp, doc, pdf, etc.), show a file icon + clickable link instead of `<img>`

---

### 4. Admin CMS — Missing Lock/Revoke buttons for specific job

**Root Cause**: The conditions `canLock` and `canRevoke` check `applicationCount === 0`. If the applications query fails silently (line 176: `catch { setApplicationCount(0); }`), it defaults to 0, which should show the buttons. The job `IeZQcldgEgLixL1iSfGB` likely has `applicationCount > 0` which hides the buttons.

Actually looking again: `canLock = job.status === 'open' && applicationCount === 0` and `canRevoke = job.status === 'open' && applicationCount === 0`. If the job has applications, that's by design — you can't lock/revoke a job with applicants. 

**BUT** the user says other jobs with the same "đang mở" status still show buttons. So the issue is likely that this specific job has applications while others don't. Let me relax the constraint — admin should be able to lock/revoke even with applications (with a warning).

#### [MODIFY] [page.tsx (admin/jobs/[id])](file:///d:/GitHub/inno-outsourcing/app/src/app/(role)/admin/jobs/%5Bid%5D/page.tsx)
- Allow lock/revoke for admins regardless of applicationCount
- Show warning confirmation if there are applications

---

### 5. Invite Freelancer — Use Email instead of UID

#### [MODIFY] [page.tsx (jobmaster/jobs/[id])](file:///d:/GitHub/inno-outsourcing/app/src/app/(role)/jobmaster/jobs/%5Bid%5D/page.tsx)
- Change input from "Freelancer UID" to "Email freelancer"
- Look up user by email before sending invitation

#### [MODIFY] [firestore-extended.ts](file:///d:/GitHub/inno-outsourcing/app/src/lib/firebase/firestore-extended.ts)
- Add `sendJobInvitationByEmail()` that queries user by email first, then sends invitation

---

### 6. Frontend Job Detail — Fix Icons for "Quy mô dự án" and "File thông tin"

#### [MODIFY] [page.tsx ((public)/jobs/[id])](file:///d:/GitHub/inno-outsourcing/app/src/app/(public)/jobs/%5Bid%5D/page.tsx)
- Replace emoji 📐 with `<Ruler size={20} />` or `<Maximize2 size={20} />`
- Replace 🏗️ with `<Paperclip size={20} />`
- Consistent with `<Briefcase>`, `<MessageSquare>` icons used for other sections

---

### 7. Contract Signing — Storage Unauthorized Error

**Root Cause**: In `storage.rules`, signatures are uploaded to `signatures/${uid}/${id}.png` but there's NO rule matching `signatures/` path. The only matching rule is the catch-all `/{allPaths=**}` which denies everything.

#### [MODIFY] [storage.rules](file:///d:/GitHub/inno-outsourcing/storage.rules)
- Add a rule for `match /signatures/{uid}/{allPaths=**}` allowing the owner to write PNG images

---

### 8. Milestone Update — Missing Permissions

**Root Cause**: The freelancer submits milestone progress via the submissions subcollection. The Firestore rule requires `request.resource.data.status == 'pending_review'`. But if the freelancer is also trying to update the job directly (e.g., update the milestone status in the job document), the rule `allow update: if isAdminOrJobMaster()` blocks freelancers.

Looking at the code, `submitMilestoneProgress` creates a document in `jobs/{jobId}/submissions/{subId}` — the write rule for submissions requires `get(...).data.assignedTo == request.auth.uid && request.resource.data.status == 'pending_review'`. This should work.

The "Missing or insufficient permissions" error on milestone update means the freelancer is also trying to update the job document directly (to set milestone status). Let me check.

In `firestore-extended.ts`, `submitMilestoneProgress()` does two things:
1. Creates submission doc (allowed by rules)
2. Updates the job doc `updateDoc(jobRef, ...)` — **this is blocked** because only admin/jobmaster can update jobs!

#### [MODIFY] [firestore.rules](file:///d:/GitHub/inno-outsourcing/firestore.rules)
- Allow the assigned freelancer to update certain fields on the job document (specifically milestone status and progress)

---

### 9. Portfolio — Escaped Unicode Display

**Root Cause**: The portfolio page uses `\\u` escape sequences in string literals instead of actual Unicode characters. E.g., `\\u0110ang t\\u1EA3i` instead of `Đang tải`. This is a source code issue — the escape sequences are double-escaped.

#### [MODIFY] [page.tsx (freelancer/portfolio)](file:///d:/GitHub/inno-outsourcing/app/src/app/(role)/freelancer/portfolio/page.tsx)
- Replace all `\\uXXXX` sequences with actual Vietnamese characters

---

### 10. Dashboard data issues

Need more investigation — will check admin and jobmaster dashboard pages for data fetching issues.

---

## Verification Plan

### Automated Tests
- Build the project with `npm run build` to catch TypeScript errors
- Deploy Firestore and Storage rules with `firebase deploy --only firestore:rules,storage`

### Manual Verification  
- Test adding items in System Config (specialties, software, building_types)
- Test contract signing as freelancer
- Test milestone submission as freelancer
- Verify portfolio page displays Vietnamese correctly
- Check admin job detail shows creator name
- Verify File thông tin displays correctly for non-image URLs
