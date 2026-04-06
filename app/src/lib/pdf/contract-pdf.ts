/**
 * Contract PDF Generator
 * Shared utility for all contract print/export across CMS pages.
 * Produces a standards-compliant Vietnamese contract layout.
 */

import type { Contract } from '@/types';

// ─── Helpers ───

function toDate(d: unknown): Date | null {
  if (!d) return null;
  if (typeof d === 'object' && d !== null && 'toDate' in d)
    return (d as { toDate: () => Date }).toDate();
  if (d instanceof Date) return d;
  const parsed = new Date(d as string);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function formatDate(d: unknown): string {
  const date = toDate(d);
  return date ? date.toLocaleDateString('vi-VN') : '-';
}

/**
 * Convert plain text with newlines into HTML paragraphs.
 * Preserves line breaks from CMS input.
 */
function textToHtml(text: string): string {
  if (!text) return '';
  return text
    .split(/\n/)
    .filter(line => line.trim() !== '')
    .map(line => `<p style="margin:2px 0;text-align:justify;padding-left:24px;">${escapeHtml(line.trim())}</p>`)
    .join('\n');
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── Main ───

export function generateContractPdfHtml(contract: Contract): string {
  // Milestones table
  const milestonesHtml = contract.milestones?.length
    ? `<table style="width:100%;border-collapse:collapse;margin:8px 0 8px 24px;">
         <thead><tr style="background:#f5f5f5;">
           <th style="border:1px solid #999;padding:6px;text-align:left;">Mốc</th>
           <th style="border:1px solid #999;padding:6px;text-align:center;">Tỷ lệ</th>
           <th style="border:1px solid #999;padding:6px;text-align:right;">Số tiền</th>
         </tr></thead>
         <tbody>${contract.milestones.map(ms => `
           <tr>
             <td style="border:1px solid #999;padding:6px;">${escapeHtml(ms.name)}</td>
             <td style="border:1px solid #999;padding:6px;text-align:center;">${ms.percentage}%</td>
             <td style="border:1px solid #999;padding:6px;text-align:right;">${ms.amount.toLocaleString('vi-VN')}₫</td>
           </tr>`).join('')}
         </tbody>
       </table>`
    : '';

  const signedDate = formatDate(contract.signedByWorkerAt || contract.createdAt);

  // Build job description HTML — preserve line breaks, no duplicate, no quote box
  const scopeHtml = textToHtml(contract.scope);
  // Only show jobDescription if it's different from scope
  const jobDescHtml = (contract.jobDescription && contract.jobDescription.trim() !== contract.scope?.trim())
    ? textToHtml(contract.jobDescription)
    : '';

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <title>Hợp đồng ${escapeHtml(contract.contractNumber)}</title>
  <style>
    @page { size: A4; margin: 25mm 20mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: 13pt;
      line-height: 1.6;
      color: #000;
      padding: 0;
    }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .header-line { font-size: 12pt; margin: 0; text-align: center; }
    .header-sub { font-size: 13pt; margin: 12px 0 2px; text-align: center; }
    h1 { font-size: 16pt; margin: 16px 0 4px; text-align: center; }
    h2 { font-size: 14pt; margin: 14px 0 6px; }
    h3 { font-size: 13pt; margin: 10px 0 4px; font-weight: bold; }
    p { margin: 4px 0; text-align: justify; }
    .indent { padding-left: 24px; }
    .party-info { margin: 8px 0 8px 0; }
    .party-info li {
      margin: 2px 0;
      list-style-type: disc;
      margin-left: 40px;
    }
    .party-info li b { font-weight: bold; }
    table { page-break-inside: avoid; }
    .sig-row {
      display: flex;
      justify-content: space-around;
      margin-top: 40px;
      page-break-inside: avoid;
    }
    .sig-box {
      width: 45%;
      text-align: center;
    }
    .sig-space { height: 80px; display: flex; align-items: center; justify-content: center; }
    .divider { border-top: 1px solid #ccc; margin: 12px 0; }
  </style>
</head>
<body>
  <!-- Header: Quốc hiệu & Tiêu ngữ -->
  <p class="header-line bold">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
  <p class="header-line"><b>Độc lập - Tự do - Hạnh phúc</b></p>
  <p class="header-line">---o0o---</p>

  <h1>HỢP ĐỒNG GIAO KHOÁN</h1>
  <p class="header-sub">Số: <b>${escapeHtml(contract.contractNumber)}</b></p>
  <p class="header-sub">Về việc: <b>${escapeHtml(contract.jobTitle)}</b></p>

  <div class="divider"></div>

  <h2>PHẦN I. CÁC CĂN CỨ KÝ KẾT HỢP ĐỒNG</h2>
  <div class="indent">
    <p>- Luật Xây dựng số 50/2014/QH13 và Luật sửa đổi bổ sung số 62/2020/QH14;</p>
    <p>- Nghị định số 37/2015/NĐ-CP quy định chi tiết về hợp đồng xây dựng và các sửa đổi bổ sung;</p>
    <p>- Nghị định số 10/2021/NĐ-CP về quản lý chi phí đầu tư xây dựng;</p>
    <p>- Căn cứ nhu cầu thực tế và năng lực của các bên.</p>
  </div>

  <h2>PHẦN II. CÁC BÊN KÝ KẾT HỢP ĐỒNG</h2>

  <h3>BÊN A (Bên giao khoán):</h3>
  <ul class="party-info">
    <li><b>Tên đơn vị:</b> ${escapeHtml(contract.partyA.name)}</li>
    <li><b>Người đại diện:</b> ${escapeHtml(contract.partyA.representative)} — Chức vụ: ${escapeHtml(contract.partyA.position)}</li>
  </ul>

  <h3>BÊN B (Bên nhận khoán):</h3>
  <ul class="party-info">
    <li><b>Họ và tên:</b> ${escapeHtml(contract.partyB.name)}</li>
    ${contract.partyB.dateOfBirth ? `<li><b>Ngày sinh:</b> ${escapeHtml(contract.partyB.dateOfBirth)}</li>` : ''}
    <li><b>CMND/CCCD:</b> ${escapeHtml(contract.partyB.idNumber)}</li>
    ${contract.partyB.phone ? `<li><b>Điện thoại:</b> ${escapeHtml(contract.partyB.phone)}</li>` : ''}
    <li><b>Địa chỉ:</b> ${escapeHtml(contract.partyB.address)}</li>
    ${contract.partyB.taxId ? `<li><b>Mã số thuế:</b> ${escapeHtml(contract.partyB.taxId)}</li>` : ''}
    <li><b>Tài khoản NH:</b> ${escapeHtml(contract.partyB.bankAccount)} — ${escapeHtml(contract.partyB.bankName)}${contract.partyB.bankBranch ? ` — ${escapeHtml(contract.partyB.bankBranch)}` : ''}</li>
  </ul>

  <h2>PHẦN III. CÁC ĐIỀU KHOẢN CỦA HỢP ĐỒNG</h2>

  <h3>Điều 1. Nội dung công việc</h3>
  ${scopeHtml}
  ${jobDescHtml ? `<p class="indent" style="margin-top:6px;"><b>Mô tả chi tiết:</b></p>\n${jobDescHtml}` : ''}
  ${contract.jobCategory ? `<p class="indent"><b>Hạng mục thi công/thiết kế:</b> ${escapeHtml(contract.jobCategory)}</p>` : ''}

  <h3>Điều 2. Giá trị hợp đồng</h3>
  <p class="indent">Tổng giá trị hợp đồng: <b>${contract.totalValue.toLocaleString('vi-VN')}₫</b> (VND).</p>

  <h3>Điều 3. Thanh toán</h3>
  <p class="indent"><b>3.1.</b> ${escapeHtml(contract.paymentTerms)}</p>
  ${milestonesHtml ? `<p class="indent"><b>3.2. Các mốc thanh toán:</b></p>\n<div class="indent">${milestonesHtml}</div>` : ''}
  <p class="indent"><b>3.${milestonesHtml ? '3' : '2'}.</b> Thanh toán bằng chuyển khoản ngân hàng vào tài khoản Bên B đã đăng ký.</p>

  <h3>Điều 4. Thay đổi và điều chỉnh giá hợp đồng</h3>
  <p class="indent">Giá hợp đồng chỉ được điều chỉnh khi có thay đổi phạm vi công việc được hai bên thống nhất bằng văn bản (phụ lục hợp đồng).</p>

  <h3>Điều 5. Thời gian thực hiện</h3>
  <p class="indent">Thời gian thực hiện theo thỏa thuận trong phạm vi dự án, tính từ ngày ký hợp đồng.</p>

  <h3>Điều 6. Quyền và nghĩa vụ của Bên B</h3>
  <div class="indent">
    <p>6.1. Thực hiện công việc đúng tiến độ, chất lượng và quy cách đã thỏa thuận.</p>
    <p>6.2. Chịu trách nhiệm về chất lượng sản phẩm bàn giao.</p>
    <p>6.3. Tuân thủ quy định bảo mật thông tin dự án.</p>
    <p>6.4. Báo cáo tiến độ theo yêu cầu của Bên A.</p>
    <p>6.5. Chịu trách nhiệm nộp thuế TNCN theo quy định pháp luật.</p>
  </div>

  <h3>Điều 7. Quyền và nghĩa vụ của Bên A</h3>
  <div class="indent">
    <p>7.1. Cung cấp đầy đủ thông tin, tài liệu cần thiết cho Bên B thực hiện công việc.</p>
    <p>7.2. Thanh toán đầy đủ, đúng hạn theo các điều khoản đã thỏa thuận.</p>
    <p>7.3. Nghiệm thu sản phẩm đúng thời hạn đã cam kết.</p>
    <p>7.4. Giám sát tiến độ và chất lượng công việc.</p>
  </div>

  <h3>Điều 8. Vật liệu và thiết bị</h3>
  <p class="indent">Bên B tự chịu trách nhiệm về thiết bị, phần mềm và công cụ phục vụ công việc, trừ khi có thỏa thuận khác.</p>

  <h3>Điều 9. Sản phẩm và nghiệm thu</h3>
  <p class="indent">Sản phẩm được nghiệm thu theo các mốc (milestone) đã thỏa thuận. Bên A có trách nhiệm phản hồi trong vòng 5 ngày làm việc kể từ khi nhận sản phẩm.</p>

  <h3>Điều 10. Tạm ngừng và chấm dứt hợp đồng</h3>
  <div class="indent">
    <p>10.1. Hợp đồng có thể tạm ngừng hoặc chấm dứt theo thỏa thuận của hai bên.</p>
    <p>10.2. Bên vi phạm phải bồi thường thiệt hại theo quy định tại Điều 11.</p>
  </div>

  <h3>Điều 11. Bồi thường và giới hạn trách nhiệm</h3>
  <p class="indent">Mức bồi thường tối đa không vượt quá giá trị hợp đồng. Bên vi phạm chịu trách nhiệm bồi thường thiệt hại trực tiếp do lỗi của mình gây ra.</p>

  <h3>Điều 12. Phạt vi phạm</h3>
  <p class="indent">Bên vi phạm các điều khoản hợp đồng có thể bị phạt tối đa 8% giá trị hợp đồng theo quy định pháp luật hiện hành.</p>

  <h3>Điều 13. Bảo mật và bản quyền</h3>
  <div class="indent">
    <p>13.1. Mọi thông tin liên quan đến dự án thuộc quyền sở hữu của Bên A.</p>
    <p>13.2. Bên B không được tiết lộ thông tin dự án cho bên thứ ba khi chưa có sự đồng ý bằng văn bản của Bên A.</p>
    <p>13.3. Bản quyền sản phẩm giao thuộc về Bên A sau khi thanh toán đầy đủ.</p>
  </div>

  <h3>Điều 14. Bảo hiểm</h3>
  <p class="indent">Không áp dụng cho hợp đồng giao khoán cá nhân.</p>

  <h3>Điều 15. Bất khả kháng</h3>
  <p class="indent">Bên bị ảnh hưởng bởi sự kiện bất khả kháng được miễn trừ trách nhiệm trong phạm vi và thời gian bị ảnh hưởng, với điều kiện phải thông báo bằng văn bản cho bên còn lại trong vòng 7 ngày.</p>

  <h3>Điều 16. Khiếu nại và tranh chấp</h3>
  <p class="indent">Mọi tranh chấp phát sinh từ hợp đồng này được giải quyết trước tiên bằng thương lượng. Nếu không thành, các bên có quyền khởi kiện tại Tòa án nhân dân có thẩm quyền.</p>

  <h3>Điều 17. Điều khoản chung</h3>
  <div class="indent">
    <p>17.1. Hợp đồng có hiệu lực kể từ ngày ký.</p>
    <p>17.2. Hợp đồng được lập thành 02 bản, mỗi bên giữ 01 bản có giá trị pháp lý như nhau.</p>
    <p>17.3. Mọi sửa đổi, bổ sung phải được hai bên thỏa thuận bằng văn bản (phụ lục hợp đồng).</p>
  </div>

  <!-- Signature section -->
  <div class="sig-row">
    <div class="sig-box">
      <p class="bold">ĐẠI DIỆN BÊN A</p>
      <p><i>(Ký, ghi rõ họ tên, đóng dấu)</i></p>
      <div class="sig-space"></div>
      <p class="bold">${escapeHtml(contract.partyA.representative)}</p>
    </div>
    <div class="sig-box">
      <p class="bold">BÊN B</p>
      <p><i>(Ký, ghi rõ họ tên)</i></p>
      <div class="sig-space">
        ${contract.signatureURL ? `<img src="${contract.signatureURL}" alt="Chữ ký" style="max-height:70px;max-width:200px;" />` : ''}
      </div>
      <p class="bold">${escapeHtml(contract.partyB.name)}</p>
    </div>
  </div>

  <p class="center" style="margin-top:16px;font-style:italic;font-size:11pt;">
    Ngày ký: ${signedDate}
  </p>
</body>
</html>`;
}

/**
 * Open a print-friendly window with the contract PDF HTML.
 * Waits for images (signatures) to load before triggering print dialog.
 */
export function printContractPdf(contract: Contract): void {
  const html = generateContractPdfHtml(contract);

  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  printWindow.document.write(html);
  printWindow.document.close();

  // Wait for all images (signature) to load before printing
  const images = printWindow.document.querySelectorAll('img');
  if (images.length > 0) {
    let loaded = 0;
    const tryPrint = () => {
      loaded++;
      if (loaded >= images.length) setTimeout(() => printWindow.print(), 300);
    };
    images.forEach(img => {
      if (img.complete) { tryPrint(); }
      else { img.onload = tryPrint; img.onerror = tryPrint; }
    });
    // Fallback timeout
    setTimeout(() => printWindow.print(), 3000);
  } else {
    setTimeout(() => printWindow.print(), 500);
  }
}
