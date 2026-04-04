# Audit & UI Implementation Plan — Missing Features

## 🔍 Audit Results

| Feature | Backend | UI Component | Wired into Pages | Status |
|---------|---------|-------------|-------------------|--------|
| **3.1 Mutual Review** | ✅ `submitReview` | ✅ `MutualReviewForm` | ✅ Freelancer + ✅ Jobmaster | **✅ OK** — cả 2 chiều đều có form khi job completed |
| **3.2 Trust Score** | ✅ `trust-score.ts` | ✅ `TrustBadge.tsx` | ⚠️ Chỉ trong `ApplicantRanking` (chưa dùng) | **❌ Thiếu UI** |
| **6.1 Invite to Apply** | ❌ Chưa build | ❌ Chưa build | ❌ | **❌ Cần build mới** |
| **6.2 Saved/Favorite** | ✅ `toggleSavedJob/Freelancer` | ❌ Chưa có UI anywhere | ❌ | **❌ Thiếu UI hoàn toàn** |
| **6.3 Availability** | ✅ `AvailabilityBadge` | ✅ Component sẵn | ⚠️ Chỉ hiện trong `ApplicantRanking` + admin user detail | **❌ Thiếu cảnh báo job count** |
| **6.5 Rehire** | ✅ `getCollaborationHistory`, `rehireFreelancer` | ❌ Chưa UI | ❌ JM không có trang xem freelancer profile | **❌ Thiếu UI + routing** |

### Chi tiết 3.1 (Mutual Review)
Cả freelancer và jobmaster **đều đã có** form review khi job ở trạng thái `completed`/`paid`. Không thiếu gì.

---

## Proposed Changes — Ưu tiên theo impact

### 1. Freelancer Profile Page cho Jobmaster (6.5 prerequisite)

> [!IMPORTANT]
> Hiện jobmaster **không có route** để xem profile freelancer. Link "Xem hồ sơ" trong application list trỏ tới `/admin/users/[uid]` — sai role. Cần tạo route riêng.

#### [NEW] `app/src/app/(role)/jobmaster/freelancers/[uid]/page.tsx`
- Trang read-only hiển thị profile freelancer:
  - Avatar, tên, level badge, trust badge, availability badge
  - Specialties, software skills
  - Stats (completed jobs, avg rating, on-time rate)
  - Lịch sử hợp tác (nếu đã từng làm việc chung — dùng `getCollaborationHistory`)
  - Nút **"🔄 Thuê lại"** nếu có lịch sử hợp tác
  - Nút **"⭐ Lưu Freelancer"** (favorite)

#### [NEW] `app/src/app/(role)/jobmaster/freelancers/[uid]/page.module.css`

#### [MODIFY] `app/src/app/(role)/jobmaster/applications/page.tsx`
- Fix link "Xem hồ sơ": đổi `/admin/users/` → `/jobmaster/freelancers/`

---

### 2. Active Job Warning — Cảnh báo số job đang thực hiện (6.3 mở rộng)

#### [NEW] `app/src/lib/firebase/firestore-extended.ts` — thêm function
```typescript
getActiveJobCount(freelancerId: string): Promise<number>
// Query: jobs where assignedTo == uid AND status in ['in_progress', 'assigned', 'review']
```

#### [NEW] `app/src/components/ui/ActiveJobWarning.tsx` + `.module.css`
- Alert component hiển thị khi freelancer đang thực hiện ≥ N jobs (N từ system_config, default 3)
- Cho **Jobmaster/Admin**: "⚠️ Ứng viên này đang thực hiện {count} job khác. Bạn vẫn muốn giao việc?"
- Cho **Freelancer** (khi apply): "⚠️ Bạn đang thực hiện {count} job khác. Bạn chắc chắn muốn ứng tuyển?"

#### [MODIFY] `app/src/app/(role)/jobmaster/applications/page.tsx`
- Hiển thị `ActiveJobWarning` inline trong mỗi application card

#### [MODIFY] `app/src/app/(public)/jobs/page.tsx` hoặc freelancer job apply flow
- Hiển thị warning khi freelancer ấn "Ứng tuyển"

#### [MODIFY] `app/src/lib/firebase/system-config.ts`
- Thêm config key `max_concurrent_jobs_warning` (default: 3) vào admin settings

#### [MODIFY] `app/src/app/(role)/admin/settings/page.tsx`
- Thêm field "Số job tối đa trước cảnh báo" trong admin settings

---

### 3. Saved/Favorite UI (6.2)

#### [NEW] `app/src/components/ui/SaveButton.tsx` + `.module.css`
- Heart/Bookmark icon toggle button, gọi `toggleSavedJob` / `toggleSavedFreelancer`
- Animation on toggle (scale + color transition)

#### [MODIFY] `app/src/app/(public)/jobs/page.tsx`
- Thêm `SaveButton` (heart icon) trên mỗi job card cho freelancer đã login

#### [MODIFY] Freelancer dashboard (`app/src/app/(role)/freelancer/page.tsx`)
- Thêm section "📌 Job đã lưu" — hiển thị saved jobs list

#### [MODIFY] Jobmaster freelancer profile page (mới tạo ở step 1)
- Button "⭐ Lưu Freelancer"

---

### 4. Availability Badge hiển thị rộng hơn (6.3 hoàn thiện)

#### [MODIFY] `app/src/app/(role)/jobmaster/applications/page.tsx`
- Show `AvailabilityBadge` + active job count bên cạnh tên ứng viên

#### [MODIFY] Freelancer profile edit
- Cho phép freelancer tự set availability status

---

### 5. Trust Badge hiển thị rộng hơn (3.2 hoàn thiện)

#### [MODIFY] `app/src/app/(role)/jobmaster/applications/page.tsx`
- Show `TrustBadge` bên cạnh tên ứng viên (tính realtime từ user stats)

---

## Về Feature 6.1 (Invite to Apply)

> [!WARNING]
> Feature này cần xây mới hoàn toàn: Firestore collection, rules, UI, notification flow. Đây là scope lớn hơn so với các feature khác. **Tôi đề xuất để 6.1 sang phase sau** và tập trung hoàn thiện 6.2, 6.3, 6.5 trước. Bạn đồng ý approach này?

---

## Open Questions

> [!IMPORTANT]
> 1. **Ngưỡng cảnh báo job**: Mặc định 3 concurrent jobs trước khi cảnh báo. Bạn muốn số khác?

> [!IMPORTANT]
> 2. **Feature 6.1 (Invite to Apply)**: Để riêng phase sau hay build luôn?

> [!IMPORTANT]  
> 3. **Rehire flow**: Khi jobmaster ấn "Thuê lại", bạn muốn: (A) redirect tới form tạo job mới với freelancer đã pre-fill, hay (B) mở modal chọn job hiện có để assign?

---

## Verification Plan

### Build Test
- `npx next build` sau mỗi file thay đổi

### Functional Testing
- Jobmaster: Vào applications → thấy Trust Badge, Availability Badge, Active Job Warning
- Jobmaster: Click "Xem hồ sơ" → trang profile freelancer → thấy nút Thuê lại + Lưu
- Freelancer: Apply job → nếu đang làm ≥3 jobs → thấy cảnh báo
- Freelancer: Dashboard → thấy "Job đã lưu"
- Admin Settings: Chỉnh "Số job tối đa" → verify warning threshold thay đổi
