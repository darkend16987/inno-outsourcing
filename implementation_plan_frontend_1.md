# Nâng cấp Trải nghiệm Người dùng (UX/UI) & Tính năng Frontend

Mục tiêu: Cải thiện trang danh sách việc làm, tinh chỉnh hiển thị tiền tệ thân thiện, xây dựng hệ thống trang Vinh danh / Huy hiệu thu hút theo phong cách mới thiết kế, và bổ sung dải tin tức (Activity Feed) trên trang chủ.

## User Approvals Received
- **Định dạng tiền tệ**: Xác nhận sử dụng định dạng "củ/tỏi" riêng biệt cho giao diện Public và Freelancer Dashboard. Chế độ Formal (VND đầy đủ) dành riêng cho CMS (Admin, Kế toán, Jobmaster).
- **Mock Data Vinh danh / Huy hiệu**: Chấp thuận dùng số liệu giả lập để test giao diện trước.
- **Tiêu chí Lọc (Filters)**: Chấp thuận Real-time Filtering.

## Proposed Changes

---

### Mảng Tiện ích (Utils)

#### [NEW] `src/lib/formatters.ts`
- Bổ sung hàm `formatFriendlyMoney(amount: number)`:
  - Nếu số tiền >= 1.000.000.000 -> Định dạng thành kiểu `X.Y tỏi` (VD: 1.5 tỏi).
  - Nếu số tiền >= 1.000.000 -> Định dạng thành kiểu `X củ` (VD: 15 củ, 50 củ).
  - Nếu nhỏ hơn 1 triệu -> Hiển thị `X k` (VD: 500k).

---

### Mảng Kiểu dữ liệu & Forms (Types/Validations)

#### [MODIFY] `src/types/index.ts`
- Trích xuất/Thêm highlight tags vào giao thức cho Frontend UI (Sẽ thêm JobTags như "HOT", "Siêu tốc").

---

### Mảng Giao diện (App UI)

#### [MODIFY] `src/app/(public)/LandingClient.tsx`
- **[NEW] Activity Feed / Ticker Block:** Thêm một khối giao diện (Dải băng chuyền Marquee hoặc Feed Block dạng Vertical Scroll) hiển thị tin tức trúng thầu, hoàn thành dự án tại Trang Chủ. Hoà quyện UI với phong cách Glassmorphism / chuyên nghiệp hiện tại.

#### [MODIFY] `src/app/(public)/jobs/page.tsx` & `page.module.css`
- **Bộ lọc nhanh (Quick Filters):** Đổi filter "Lĩnh vực chuyên môn" thành dãy nút bấm (Pills) xếp ngang.
- **Bộ lọc mở rộng (Advanced Filters):** Thêm Dropdown hoặc Modal để bộ lọc Ngân sách, Kỹ năng, Thời lượng và Trạng thái làm việc (Remote/Onsite).
- **Chế độ xem Grid / List:** 
  - Bổ sung state `viewMode` cho Grid và List view.
  - Bổ sung UI Toggle với icon. Phối hợp css grid/flex cho layout.
- **Highlight Tags:** Render các Badge siêu tốc, HOT trên thẻ. Lọc dữ liệu Local qua state real-time.

#### [NEW] `src/app/(public)/leaderboard/page.tsx` & `page.module.css`
- Tích hợp style từ `leaderboard/index.html` của thư mục idea.
- Cấu trúc top 3 với thẻ Top Rank.
- Bảng xếp hạng dạng List.

#### [NEW] `src/app/(public)/badges/page.tsx` & `page.module.css`
- Tích hợp style từ `badges/index.html`.
- Áp dụng cấu trúc badge card, mô tả tooltip, thanh progress mock.


## Verification Plan

### Manual Verification
1. Trang chủ: Nhìn thấy bảng/dải tin tức mượt mà, layout không gãy.
2. Truy cập `/jobs`:
   - Giao diện có nút chuyển Grid/List. Click vào thấy thay đổi layout ngay lập tức.
   - Click vào thẻ Lĩnh vực trên cùng, danh sách filter tức thì.
   - Kiểm tra tiền tệ trên Job Card hiển thị "củ/tỏi".
3. Truy cập `/leaderboard` và `/badges`:
   - Kiểm tra phong cách UI, Dark Mode support, layout chuẩn không vỡ.
