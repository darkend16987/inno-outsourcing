# Enhancement: Invitation Flow, Admin Request Changes, Field Cleanup & Job Listing Improvements

Triển khai 10+ tính năng mới và cải tiến cho hệ thống VAA JOB: sửa flow invitation, thêm "yêu cầu chỉnh sửa" cho admin, bỏ các field deprecated, bổ sung filter/thông tin mới trên frontend, và mở quyền chỉnh sửa cho jobmaster.

## User Review Required

> [!IMPORTANT]
> **"Yêu cầu chỉnh sửa" (Request Changes):** Khi admin chọn tính năng này, job sẽ chuyển về trạng thái `pending_approval` (KHÔNG bị cancelled). Cần thêm trạng thái mới `revision_requested` trong state machine hay chỉ reuse `pending_approval`? → **Đề xuất:** Dùng `pending_approval` + lưu thêm field `revisionRequest` trên job document để giữ simple. Jobmaster sẽ thấy banner yêu cầu chỉnh sửa khi mở job.

> [!IMPORTANT]  
> **"Hạn hoàn thành dự án" (completionDeadline):** Đây là field mới, khác với `deadline` hiện tại (hạn nhận ứng tuyển). Cần thêm field `completionDeadline: Date` trên Job interface.

> [!WARNING]
> **Bỏ field `job_types` (Hình thức làm việc):** Tab "Hình thức việc" trong admin settings sẽ bị xóa. Field `workMode` trên Job interface sẽ bị loại bỏ khỏi UI nhưng giữ lại trên type để backward compatibility.

## Proposed Changes

### Component 1: Type System & State Machine

#### [MODIFY] [index.ts](file:///d:/GitHub/inno-outsourcing/app/src/types/index.ts)
- Thêm field `completionDeadline?: Date` vào Job interface (hạn hoàn thành dự án)
- Thêm field `teamType?: 'individual' | 'team'` vào Job interface 
- Thêm field `suitabilityCriteria?: string` vào Job interface (tiêu chí phù hợp)
- Thêm field `revisionRequest?: { message: string; requestedAt: Date; requestedBy: string }` vào Job interface
- Thêm field `applicantsCount?: number` vào Job interface (denormalized)

#### [MODIFY] [job-state-machine.ts](file:///d:/GitHub/inno-outsourcing/app/src/lib/state/job-state-machine.ts)
- Cho phép `pending_approval → pending_approval` (tự chuyển — dùng khi admin request changes)
- Không cần thêm trạng thái mới

---

### Component 2: Admin Job Detail — "Yêu cầu chỉnh sửa"

#### [MODIFY] [admin/jobs/[id]/page.tsx](file:///d:/GitHub/inno-outsourcing/app/src/app/(role)/admin/jobs/[id]/page.tsx)
- **Thêm button "Yêu cầu chỉnh sửa"** cạnh "Duyệt" và "Từ chối" khi job ở `pending_approval`
- **Thêm modal/form** nhập yêu cầu cụ thể khi chọn tính năng này
- Logic: gọi `updateJob(id, { status: 'pending_approval', revisionRequest: { message, requestedAt, requestedBy } })` → job vẫn ở `pending_approval` nhưng jobmaster thấy yêu cầu
- Gửi notification cho jobmaster
- **Bỏ hiển thị:** field `projectScale`, `workMode`, `expectedProfit` trên UI
- **Rename:** "Hạn nộp" → "Hạn chót nhận ứng tuyển", "Milestones" → "Tiến độ - Thanh toán"

---

### Component 3: Jobmaster Job Detail — Invitation Flow + Edit Permissions

#### [MODIFY] [jobmaster/jobs/[id]/page.tsx](file:///d:/GitHub/inno-outsourcing/app/src/app/(role)/jobmaster/jobs/[id]/page.tsx)
- **Bỏ hiển thị:** field `projectScale`, `workMode`, `expectedProfit`
- **Rename:** "Milestones" → "Tiến độ - Thanh toán", "Hạn chót nhận hồ sơ" → "Hạn chót nhận ứng tuyển"
- **Hiển thị banner chỉnh sửa** khi `revisionRequest` tồn tại → hiện message + nút "Chỉnh sửa ngay"
- **Mở quyền chỉnh sửa** cho jobmaster trên các trường: hạn ứng tuyển, lĩnh vực, cấp độ, milestones (khi job ở trạng thái draft/pending_approval)
- Thêm field `completionDeadline` (hạn hoàn thành dự án) vào form edit
- Thêm field `suitabilityCriteria` vào form edit

---

### Component 4: Freelancer Invitations — Accept → Application Modal

#### [MODIFY] [freelancer/invitations/page.tsx](file:///d:/GitHub/inno-outsourcing/app/src/app/(role)/freelancer/invitations/page.tsx)
- **Sửa nút "Chấp nhận":** Thay vì gọi `respondToInvitation('accepted')` rồi chỉ update UI → mở modal ứng tuyển
- **Thêm ApplicationModal** inline (hoặc import component): form nhập cover letter, expected fee, portfolio link, ngày sẵn sàng
- Khi submit modal: gọi `respondToInvitation('accepted')` + `applyForJob(...)` cùng lúc
- Gửi notification cho jobmaster

---

### Component 5: Jobmaster Create Job — Field Cleanup  

#### [MODIFY] [jobmaster/jobs/create/page.tsx](file:///d:/GitHub/inno-outsourcing/app/src/app/(role)/jobmaster/jobs/create/page.tsx)
- **Bỏ field:** `projectScale`, `workMode` selector, `expectedProfit`
- **Thêm field:** `completionDeadline` (date picker), `teamType` (radio: Cá nhân / Đội nhóm), `suitabilityCriteria` (textarea)
- **Rename:** "Hạn chót nhận hồ sơ" → "Hạn chót nhận ứng tuyển", "Milestones" → "Tiến độ - Thanh toán"
- Gửi `completionDeadline`, `teamType`, `suitabilityCriteria` lên Firestore khi tạo job

---

### Component 6: Public Job Listing — New Filters & Card Info

#### [MODIFY] [jobs/page.tsx](file:///d:/GitHub/inno-outsourcing/app/src/app/(public)/jobs/page.tsx)
- **Bỏ filter:** "Hình thức làm việc" (workMode)
- **Bỏ trên card:** Badge workMode  
- **Thêm trên card:** Hạn ứng tuyển (deadline), số ứng viên (applicantsCount)
- **Thêm filter:** Lĩnh vực chuyên môn (specialties) — đã có dạng pills
- **Rename text nếu cần**

---

### Component 7: Admin Settings — Remove job_types Tab

#### [MODIFY] [admin/settings/page.tsx](file:///d:/GitHub/inno-outsourcing/app/src/app/(role)/admin/settings/page.tsx)
- **Bỏ tab** `job_types` (Hình thức việc) khỏi TABS array

---

### Component 8: Public Job Detail Page

#### [MODIFY] [jobs/[id]/page.tsx](file:///d:/GitHub/inno-outsourcing/app/src/app/(public)/jobs/[id]/page.tsx)  
- **Bỏ:** workMode badge/display, projectScale section
- **Thêm:** completionDeadline display, teamType badge, suitabilityCriteria section
- **Rename:** deadline label → "Hạn chót nhận ứng tuyển"

## Open Questions

> [!IMPORTANT]
> 1. **Team type "Đội nhóm":** Khi chọn loại "Đội nhóm", có yêu cầu gì đặc biệt về logic (ví dụ: nhiều freelancer cùng apply, hay chỉ là label hiển thị)? → **Đề xuất ban đầu:** Chỉ là label hiển thị + filter.
> 2. **Grid-only view cho job listing:** Bạn muốn bỏ hẳn list view hay vẫn giữ cả hai?

## Verification Plan

### Automated Tests
- `npx next build` — đảm bảo không type error/build error

### Manual Verification
1. **Invitation flow:** Freelancer nhận invitation → ấn "Chấp nhận" → modal ứng tuyển hiện → submit → kiểm tra application được tạo
2. **Admin request changes:** Admin vào job pending → ấn "Yêu cầu chỉnh sửa" → nhập message → gửi → jobmaster thấy banner + notification
3. **Field cleanup:** Verify `workMode`, `projectScale`, `expectedProfit` đã ẩn khỏi tất cả UI
4. **New fields:** `completionDeadline`, `teamType`, `suitabilityCriteria` hiển thị đúng trên create/edit/detail
5. **Admin settings:** Tab "Hình thức việc" đã bị xóa
6. Deploy Firebase + push Git
