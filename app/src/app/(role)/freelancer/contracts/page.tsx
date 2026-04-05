'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { FileSignature, Download, Search, FileText, Loader2, Inbox, AlertTriangle, Clock, Eye, X } from 'lucide-react';
import { Card, Badge, Button } from '@/components/ui';
import { useAuth } from '@/lib/firebase/auth-context';
import { getContractsForFreelancer } from '@/lib/firebase/firestore';
import type { Contract } from '@/types';
import styles from './page.module.css';

const STATUS_MAP: Record<string, { label: string, color: string }> = {
  active:            { label: 'Đang hiệu lực', color: 'success' },
  completed:         { label: 'Đã thanh lý',   color: 'default' },
  pending_signature: { label: 'Chờ ký',         color: 'warning' },
  draft:             { label: 'Nháp',           color: 'default' },
  terminated:        { label: 'Đã hủy',         color: 'error' },
};

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.05, duration: 0.3 } }),
};

function toDate(d: unknown): Date | null {
  if (!d) return null;
  if (typeof d === 'object' && d !== null && 'toDate' in d)
    return (d as { toDate: () => Date }).toDate();
  if (d instanceof Date) return d;
  const parsed = new Date(d as string);
  return isNaN(parsed.getTime()) ? null : parsed;
}

const formatDate = (d: unknown): string => {
  const date = toDate(d);
  return date ? date.toLocaleDateString('vi-VN') : '-';
};

const formatCurrency = (amount: number) => `${amount.toLocaleString('vi-VN')}₫`;

const PAGE_LOAD_TIME = Date.now();

function DeadlineBadge({ deadline }: { deadline: unknown }) {
  const d = toDate(deadline);
  if (!d) return null;
  const daysLeft = Math.ceil((d.getTime() - PAGE_LOAD_TIME) / (1000 * 60 * 60 * 24));
  if (daysLeft <= 0) {
    return (
      <span className={styles.deadlineOverdue}>
        <AlertTriangle size={12} /> Quá hạn {Math.abs(daysLeft)} ngày
      </span>
    );
  }
  if (daysLeft <= 2) {
    return (
      <span className={styles.deadlineUrgent}>
        <Clock size={12} /> Còn {daysLeft} ngày để ký
      </span>
    );
  }
  return (
    <span className={styles.deadlineNormal}>
      <Clock size={12} /> Hạn ký: {formatDate(deadline)}
    </span>
  );
}

export default function ContractsPage() {
  const { userProfile } = useAuth();
  const [search, setSearch] = useState('');
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewContract, setViewContract] = useState<Contract | null>(null);

  useEffect(() => {
    if (!userProfile?.uid) return;
    getContractsForFreelancer(userProfile.uid)
      .then(setContracts)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [userProfile?.uid]);

  const filtered = contracts.filter(c =>
    c.contractNumber.toLowerCase().includes(search.toLowerCase()) ||
    c.jobTitle.toLowerCase().includes(search.toLowerCase())
  );

  // Count pending contracts needing signature
  const pendingCount = contracts.filter(c => c.status === 'pending_signature').length;

  /** Generate a print-friendly contract page for browser "Save as PDF" */
  const handlePrintContract = (contract: Contract) => {
    const milestonesHtml = contract.milestones?.length
      ? `<table style="width:100%;border-collapse:collapse;margin:8px 0;">
           <thead><tr style="background:#f5f5f5;">
             <th style="border:1px solid #999;padding:6px;">Mốc</th>
             <th style="border:1px solid #999;padding:6px;">Tỷ lệ</th>
             <th style="border:1px solid #999;padding:6px;">Số tiền</th>
           </tr></thead>
           <tbody>${contract.milestones.map(ms => `
             <tr>
               <td style="border:1px solid #999;padding:6px;">${ms.name}</td>
               <td style="border:1px solid #999;padding:6px;text-align:center;">${ms.percentage}%</td>
               <td style="border:1px solid #999;padding:6px;text-align:right;">${ms.amount.toLocaleString('vi-VN')}₫</td>
             </tr>`).join('')}
           </tbody>
         </table>`
      : '';

    const signedDate = formatDate(contract.signedByWorkerAt || contract.createdAt);

    const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <title>Hợp đồng ${contract.contractNumber}</title>
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
    .header-line { font-size: 12pt; margin: 0; }
    h1 { font-size: 16pt; margin: 16px 0 4px; }
    h2 { font-size: 14pt; margin: 14px 0 6px; }
    h3 { font-size: 13pt; margin: 10px 0 4px; font-weight: bold; }
    p { margin: 4px 0; text-align: justify; }
    .indent { padding-left: 24px; }
    .indent2 { padding-left: 48px; }
    .party-info { margin: 8px 0 8px 24px; }
    .party-info p { margin: 2px 0; }
    table { page-break-inside: avoid; }
    .sig-row { display: flex; justify-content: space-between; margin-top: 40px; }
    .sig-box { width: 45%; text-align: center; }
    .sig-space { height: 80px; }
    .divider { border-top: 1px solid #ccc; margin: 12px 0; }
  </style>
</head>
<body>
  <div class="center">
    <p class="header-line bold">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
    <p class="header-line">Độc lập - Tự do - Hạnh phúc</p>
    <p class="header-line">---o0o---</p>
    <h1>HỢP ĐỒNG GIAO KHOÁN</h1>
    <p>Số: <b>${contract.contractNumber}</b></p>
    <p>Về việc: <b>${contract.jobTitle}</b></p>
  </div>

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
  <div class="party-info">
    <p><b>Tên đơn vị:</b> ${contract.partyA.name}</p>
    <p><b>Người đại diện:</b> ${contract.partyA.representative} — Chức vụ: ${contract.partyA.position}</p>
  </div>

  <h3>BÊN B (Bên nhận khoán):</h3>
  <div class="party-info">
    <p><b>Họ và tên:</b> ${contract.partyB.name}</p>
    ${contract.partyB.dateOfBirth ? `<p><b>Ngày sinh:</b> ${contract.partyB.dateOfBirth}</p>` : ''}
    <p><b>CMND/CCCD:</b> ${contract.partyB.idNumber}</p>
    ${contract.partyB.phone ? `<p><b>Điện thoại:</b> ${contract.partyB.phone}</p>` : ''}
    <p><b>Địa chỉ:</b> ${contract.partyB.address}</p>
    ${contract.partyB.taxId ? `<p><b>Mã số thuế:</b> ${contract.partyB.taxId}</p>` : ''}
    <p><b>Tài khoản NH:</b> ${contract.partyB.bankAccount} — ${contract.partyB.bankName}${contract.partyB.bankBranch ? ` — ${contract.partyB.bankBranch}` : ''}</p>
  </div>

  <h2>PHẦN III. CÁC ĐIỀU KHOẢN CỦA HỢP ĐỒNG</h2>

  <h3>Điều 1. Nội dung công việc</h3>
  <p class="indent">${contract.scope}</p>
  ${contract.jobDescription ? `<p class="indent">${contract.jobDescription}</p>` : ''}
  ${contract.jobCategory ? `<p class="indent"><b>Hạng mục thi công/thiết kế:</b> ${contract.jobCategory}</p>` : ''}

  <h3>Điều 2. Giá trị hợp đồng</h3>
  <p class="indent">Tổng giá trị hợp đồng: <b>${contract.totalValue.toLocaleString('vi-VN')}₫</b> (VND).</p>

  <h3>Điều 3. Thanh toán</h3>
  <p class="indent"><b>3.1.</b> ${contract.paymentTerms}</p>
  ${milestonesHtml ? `<p class="indent"><b>3.2. Các mốc thanh toán:</b></p><div class="indent">${milestonesHtml}</div>` : ''}
  <p class="indent"><b>3.3.</b> Thanh toán bằng chuyển khoản ngân hàng vào tài khoản Bên B đã đăng ký.</p>

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

  <div class="sig-row">
    <div class="sig-box">
      <p class="bold">ĐẠI DIỆN BÊN A</p>
      <p><i>(Ký, ghi rõ họ tên, đóng dấu)</i></p>
      <div class="sig-space"></div>
      <p class="bold">${contract.partyA.representative}</p>
    </div>
    <div class="sig-box">
      <p class="bold">BÊN B</p>
      <p><i>(Ký, ghi rõ họ tên)</i></p>
      <div class="sig-space">
        ${contract.signatureURL ? `<img src="${contract.signatureURL}" alt="Chữ ký" style="max-height:70px;max-width:200px;" />` : ''}
      </div>
      <p class="bold">${contract.partyB.name}</p>
    </div>
  </div>

  <p class="center" style="margin-top:16px;font-style:italic;font-size:11pt;">
    Ngày ký: ${signedDate}
  </p>
</body>
</html>`;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      // Delay print to ensure content is rendered
      setTimeout(() => printWindow.print(), 500);
    }
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.empty}><Loader2 size={24} className={styles.spin} /> Đang tải...</div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Quản lý hợp đồng</h1>
          <p className={styles.subtitle}>Xem và quản lý các hợp đồng giao khoán của bạn.</p>
        </div>
      </div>

      {/* Warning banner if there are pending contracts */}
      {pendingCount > 0 && (
        <div className={styles.pendingBanner}>
          <AlertTriangle size={18} />
          <span>
            Bạn có <strong>{pendingCount}</strong> hợp đồng chờ ký.
            Vui lòng ký trong thời hạn quy định (3 ngày kể từ khi được giao job) để tránh vi phạm.
          </span>
        </div>
      )}

      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <Search size={16} />
          <input
            type="text"
            placeholder="Tìm theo số HĐ, tên dự án..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className={styles.list}>
        {filtered.map((contract, i) => (
          <motion.div key={contract.id} initial="hidden" animate="visible" custom={i} variants={fadeUp}>
            <Card className={`${styles.contractCard} ${contract.status === 'pending_signature' ? styles.contractPending : ''}`}>
              <div className={styles.iconBox}>
                <FileText size={24} />
              </div>

              <div className={styles.cMain}>
                <div className={styles.cHeader}>
                  <h3 className={styles.cNumber}>{contract.contractNumber}</h3>
                  {/* @ts-expect-error Badge variant type mismatch */}
                  <Badge variant={STATUS_MAP[contract.status]?.color || 'default'} size="sm">
                    {STATUS_MAP[contract.status]?.label || contract.status}
                  </Badge>
                </div>
                <div className={styles.cJob}>{contract.jobTitle}</div>
                <div className={styles.cMeta}>
                  <span>Ngày ký: {formatDate(contract.signedByWorkerAt || contract.createdAt)}</span>
                  <span className={styles.sep}>•</span>
                  <span>Giá trị: <strong>{formatCurrency(contract.totalValue)}</strong></span>
                </div>
                {contract.status === 'pending_signature' && contract.contractDeadline && (
                  <div className={styles.deadlineRow}>
                    <DeadlineBadge deadline={contract.contractDeadline} />
                  </div>
                )}
              </div>

              <div className={styles.cActions}>
                <Button variant="ghost" size="sm" onClick={() => setViewContract(contract)}>
                  <Eye size={14} /> Xem hợp đồng
                </Button>
                {contract.status === 'pending_signature' ? (
                  <Link href={`/freelancer/contracts/${contract.id}/sign`}>
                    <Button size="sm"><FileSignature size={14} /> Ký hợp đồng</Button>
                  </Link>
                ) : (
                  <>
                    {(contract.pdfURL || contract.signedPdfURL) && (
                      <a href={contract.signedPdfURL || contract.pdfURL} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm"><Download size={14} /> Tải PDF</Button>
                      </a>
                    )}
                    <Button variant="outline" size="sm" onClick={() => handlePrintContract(contract)}>
                      <FileText size={14} /> Xuất PDF
                    </Button>
                  </>
                )}
              </div>
            </Card>
          </motion.div>
        ))}

        {filtered.length === 0 && (
          <div className={styles.empty}>
            <Inbox size={32} />
            <p>{contracts.length === 0 ? 'Chưa có hợp đồng nào.' : 'Không tìm thấy hợp đồng nào phù hợp.'}</p>
          </div>
        )}
      </div>

      {/* Contract Detail Modal */}
      {viewContract && (
        <div className={styles.modalOverlay} onClick={() => setViewContract(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Chi tiết hợp đồng</h2>
              <button className={styles.modalClose} onClick={() => setViewContract(null)}>
                <X size={20} />
              </button>
            </div>

            <div className={styles.modalBody}>
              {/* Contract number & status */}
              <div className={styles.modalSection}>
                <div className={styles.modalRow}>
                  <span className={styles.modalLabel}>Số hợp đồng</span>
                  <span className={styles.modalValue}><strong>{viewContract.contractNumber}</strong></span>
                </div>
                <div className={styles.modalRow}>
                  <span className={styles.modalLabel}>Trạng thái</span>
                  {/* @ts-expect-error Badge variant type mismatch */}
                  <Badge variant={STATUS_MAP[viewContract.status]?.color || 'default'} size="sm">
                    {STATUS_MAP[viewContract.status]?.label || viewContract.status}
                  </Badge>
                </div>
                <div className={styles.modalRow}>
                  <span className={styles.modalLabel}>Tên dự án</span>
                  <span className={styles.modalValue}>{viewContract.jobTitle}</span>
                </div>
                {viewContract.jobCategory && (
                  <div className={styles.modalRow}>
                    <span className={styles.modalLabel}>Hạng mục</span>
                    <span className={styles.modalValue}>{viewContract.jobCategory}</span>
                  </div>
                )}
                <div className={styles.modalRow}>
                  <span className={styles.modalLabel}>Ngày ký</span>
                  <span className={styles.modalValue}>{formatDate(viewContract.signedByWorkerAt || viewContract.createdAt)}</span>
                </div>
              </div>

              {/* Party A */}
              <div className={styles.modalSection}>
                <h3 className={styles.modalSectionTitle}>Bên A (Công ty)</h3>
                <div className={styles.modalRow}>
                  <span className={styles.modalLabel}>Tên công ty</span>
                  <span className={styles.modalValue}>{viewContract.partyA.name}</span>
                </div>
                <div className={styles.modalRow}>
                  <span className={styles.modalLabel}>Đại diện</span>
                  <span className={styles.modalValue}>{viewContract.partyA.representative}</span>
                </div>
                <div className={styles.modalRow}>
                  <span className={styles.modalLabel}>Chức vụ</span>
                  <span className={styles.modalValue}>{viewContract.partyA.position}</span>
                </div>
              </div>

              {/* Party B */}
              <div className={styles.modalSection}>
                <h3 className={styles.modalSectionTitle}>Bên B (Freelancer)</h3>
                <div className={styles.modalRow}>
                  <span className={styles.modalLabel}>Họ tên</span>
                  <span className={styles.modalValue}>{viewContract.partyB.name}</span>
                </div>
                {viewContract.partyB.dateOfBirth && (
                  <div className={styles.modalRow}>
                    <span className={styles.modalLabel}>Ngày sinh</span>
                    <span className={styles.modalValue}>{viewContract.partyB.dateOfBirth}</span>
                  </div>
                )}
                <div className={styles.modalRow}>
                  <span className={styles.modalLabel}>CMND/CCCD</span>
                  <span className={styles.modalValue}>{viewContract.partyB.idNumber}</span>
                </div>
                {viewContract.partyB.phone && (
                  <div className={styles.modalRow}>
                    <span className={styles.modalLabel}>Số điện thoại</span>
                    <span className={styles.modalValue}>{viewContract.partyB.phone}</span>
                  </div>
                )}
                <div className={styles.modalRow}>
                  <span className={styles.modalLabel}>Địa chỉ</span>
                  <span className={styles.modalValue}>{viewContract.partyB.address}</span>
                </div>
                {viewContract.partyB.taxId && (
                  <div className={styles.modalRow}>
                    <span className={styles.modalLabel}>Mã số thuế</span>
                    <span className={styles.modalValue}>{viewContract.partyB.taxId}</span>
                  </div>
                )}
                <div className={styles.modalRow}>
                  <span className={styles.modalLabel}>Tài khoản NH</span>
                  <span className={styles.modalValue}>{viewContract.partyB.bankAccount} - {viewContract.partyB.bankName}{viewContract.partyB.bankBranch ? ` - ${viewContract.partyB.bankBranch}` : ''}</span>
                </div>
              </div>

              {/* Scope & Terms */}
              <div className={styles.modalSection}>
                <h3 className={styles.modalSectionTitle}>Nội dung công việc</h3>
                <p className={styles.modalText}>{viewContract.scope}</p>
                {viewContract.jobDescription && (
                  <>
                    <h4 className={styles.modalSubTitle}>Mô tả chi tiết</h4>
                    <p className={styles.modalText}>{viewContract.jobDescription}</p>
                  </>
                )}
              </div>

              {/* Value & Payment */}
              <div className={styles.modalSection}>
                <h3 className={styles.modalSectionTitle}>Giá trị &amp; thanh toán</h3>
                <div className={styles.modalRow}>
                  <span className={styles.modalLabel}>Tổng giá trị</span>
                  <span className={styles.modalValue}><strong>{formatCurrency(viewContract.totalValue)}</strong></span>
                </div>
                <div className={styles.modalRow}>
                  <span className={styles.modalLabel}>Điều khoản thanh toán</span>
                  <span className={styles.modalValue}>{viewContract.paymentTerms}</span>
                </div>
              </div>

              {/* Milestones */}
              {viewContract.milestones && viewContract.milestones.length > 0 && (
                <div className={styles.modalSection}>
                  <h3 className={styles.modalSectionTitle}>Các mốc thanh toán</h3>
                  <div className={styles.milestonesTable}>
                    <div className={styles.msHeader}>
                      <span>Mốc</span>
                      <span>Tỷ lệ</span>
                      <span>Số tiền</span>
                      <span>Trạng thái</span>
                    </div>
                    {viewContract.milestones.map((ms, idx) => (
                      <div key={ms.id || idx} className={styles.msRow}>
                        <span className={styles.msName}>{ms.name}</span>
                        <span>{ms.percentage}%</span>
                        <span>{formatCurrency(ms.amount)}</span>
                        {/* Badge variant already correct, no ts override needed */}
                        <Badge variant={ms.status === 'paid' ? 'success' : ms.status === 'approved' || ms.status === 'released' ? 'warning' : 'default'} size="sm">
                          {ms.status === 'paid' ? 'Đã thanh toán' : ms.status === 'approved' ? 'Đã duyệt' : ms.status === 'released' ? 'Đã giải ngân' : ms.status === 'in_progress' ? 'Đang thực hiện' : ms.status === 'review' ? 'Đang xét duyệt' : 'Chờ'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Contract terms */}
              {viewContract.terms && (
                <div className={styles.modalSection}>
                  <h3 className={styles.modalSectionTitle}>Điều khoản hợp đồng</h3>
                  <p className={styles.modalText}>{viewContract.terms}</p>
                </div>
              )}
            </div>

            <div className={styles.modalFooter}>
              {(viewContract.pdfURL || viewContract.signedPdfURL) && (
                <a href={viewContract.signedPdfURL || viewContract.pdfURL} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm"><Download size={14} /> Tải PDF</Button>
                </a>
              )}
              <Button variant="secondary" size="sm" onClick={() => setViewContract(null)}>Đóng</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
