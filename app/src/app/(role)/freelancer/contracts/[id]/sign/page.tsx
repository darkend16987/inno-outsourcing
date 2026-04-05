'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Loader2, Save, AlertTriangle, CheckCircle, FileText,
} from 'lucide-react';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Button } from '@/components/ui';
import { SignaturePad } from '@/components/profile/SignaturePad';
import { useAuth } from '@/lib/firebase/auth-context';
import { storage, db } from '@/lib/firebase/config';
import { sanitizeText } from '@/lib/security/sanitize';
import type { Contract } from '@/types';
import styles from './page.module.css';

const PAGE_LOAD_TIME = Date.now();

const BANKS = [
  'Vietcombank', 'VietinBank', 'BIDV', 'Agribank', 'Techcombank',
  'MB Bank', 'ACB', 'VPBank', 'Sacombank', 'HDBank', 'TPBank', 'OCB',
  'MSB', 'VIB', 'SHB', 'SeABank', 'LienVietPostBank', 'Eximbank', 'Khác',
];

/** Convert a base64 data URL to a Blob without using fetch() (CSP-safe) */
function dataURLtoBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(',');
  const mime = header.match(/:(.*?);/)![1];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

function formatDate(d: unknown): string {
  if (!d) return '';
  if (typeof d === 'object' && d !== null && 'toDate' in d)
    return (d as { toDate: () => Date }).toDate().toLocaleDateString('vi-VN');
  if (d instanceof Date) return d.toLocaleDateString('vi-VN');
  return String(d);
}

function numberToVietnameseWords(n: number): string {
  if (!n || isNaN(n)) return '';
  const units = ['', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
  const teens = ['mười', 'mười một', 'mười hai', 'mười ba', 'mười bốn', 'mười lăm',
    'mười sáu', 'mười bảy', 'mười tám', 'mười chín'];
  const tens = ['', '', 'hai mươi', 'ba mươi', 'bốn mươi', 'năm mươi',
    'sáu mươi', 'bảy mươi', 'tám mươi', 'chín mươi'];

  function threeDigits(num: number): string {
    const h = Math.floor(num / 100);
    const r = num % 100;
    const t = Math.floor(r / 10);
    const u = r % 10;
    let result = '';
    if (h > 0) result += units[h] + ' trăm ';
    if (r === 0) return result.trim();
    if (r < 10) result += (h > 0 ? 'linh ' : '') + units[r];
    else if (r < 20) result += teens[r - 10];
    else result += tens[t] + (u > 0 ? ' ' + units[u] : '');
    return result.trim();
  }

  const tiers = [
    { value: 1_000_000_000, label: 'tỷ' },
    { value: 1_000_000, label: 'triệu' },
    { value: 1_000, label: 'nghìn' },
    { value: 1, label: '' },
  ];
  let result = '';
  let remaining = Math.round(n);
  for (const tier of tiers) {
    if (remaining >= tier.value) {
      const part = Math.floor(remaining / tier.value);
      result += threeDigits(part) + (tier.label ? ' ' + tier.label + ' ' : ' ');
      remaining %= tier.value;
    }
  }
  return (result.trim() + ' đồng').replace(/\s+/g, ' ');
}

interface FormData {
  name: string;
  dateOfBirth: string;
  idNumber: string;
  phone: string;
  address: string;
  taxId: string;
  bankAccount: string;
  bankName: string;
  bankBranch: string;
}

export default function ContractSignPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { userProfile } = useAuth();

  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>({
    name: '', dateOfBirth: '', idNumber: '', phone: '',
    address: '', taxId: '', bankAccount: '', bankName: '', bankBranch: '',
  });

  // Load contract + pre-fill from profile
  useEffect(() => {
    if (!id || !db) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard data-fetch loading pattern
    setLoading(true);
    getDoc(doc(db, 'contracts', id)).then(snap => {
      if (!snap.exists()) { setError('Không tìm thấy hợp đồng.'); setLoading(false); return; }
      const c = { id: snap.id, ...snap.data() } as Contract;
      setContract(c);
      // Pre-fill form from existing contract partyB or from user profile
      const p = userProfile;
      setForm({
        name: c.partyB?.name || p?.displayName || '',
        dateOfBirth: (c.partyB as { dateOfBirth?: string })?.dateOfBirth || p?.dateOfBirth || '',
        idNumber: c.partyB?.idNumber || p?.idNumber || '',
        phone: (c.partyB as { phone?: string })?.phone || p?.phone || '',
        address: c.partyB?.address || p?.address || '',
        taxId: (c.partyB as { taxId?: string })?.taxId || p?.taxId || '',
        bankAccount: c.partyB?.bankAccount || p?.bankAccountNumber || '',
        bankName: c.partyB?.bankName || p?.bankName || '',
        bankBranch: (c.partyB as { bankBranch?: string })?.bankBranch || p?.bankBranch || '',
      });
      setLoading(false);
    }).catch(() => { setError('Lỗi tải hợp đồng.'); setLoading(false); });
  }, [id, userProfile]);

  const updateField = (key: keyof FormData, val: string) =>
    setForm(f => ({ ...f, [key]: val }));

  const validate = (): string | null => {
    if (!form.name.trim()) return 'Vui lòng nhập họ và tên.';
    if (!form.idNumber.trim()) return 'Vui lòng nhập số CCCD.';
    if (!form.phone.trim()) return 'Vui lòng nhập số điện thoại.';
    if (!form.address.trim()) return 'Vui lòng nhập địa chỉ.';
    if (!form.bankAccount.trim()) return 'Vui lòng nhập số tài khoản.';
    if (!form.bankName.trim()) return 'Vui lòng chọn ngân hàng.';
    if (!signatureDataUrl) return 'Vui lòng ký tên trước khi gửi.';
    return null;
  };

  const handleSubmit = async () => {
    if (!contract || !userProfile || !db || !storage) return;
    const validationErr = validate();
    if (validationErr) { setError(validationErr); return; }

    setSaving(true);
    setError('');

    // Step 1: Upload signature PNG
    let signatureURL = '';
    if (signatureDataUrl) {
      try {
        const blob = dataURLtoBlob(signatureDataUrl);
        const sigRef = storageRef(storage, `signatures/${userProfile.uid}/${id}.png`);
        await uploadBytes(sigRef, blob, { contentType: 'image/png' });
        signatureURL = await getDownloadURL(sigRef);
      } catch (err: unknown) {
        const e = err as { code?: string; message?: string };
        console.error('[Step 1 - Upload signature]', err);
        setError(`Lỗi upload chữ ký (${e?.code || e?.message || 'unknown'})`);
        setSaving(false);
        return;
      }
    }

    // Step 2: Update contract document
    try {
      const contractRef = doc(db, 'contracts', id);
      await updateDoc(contractRef, {
        'partyB.name': sanitizeText(form.name, 200),
        'partyB.dateOfBirth': form.dateOfBirth,
        'partyB.idNumber': sanitizeText(form.idNumber, 30),
        'partyB.phone': sanitizeText(form.phone, 20),
        'partyB.address': sanitizeText(form.address, 300),
        'partyB.taxId': sanitizeText(form.taxId, 20),
        'partyB.bankAccount': sanitizeText(form.bankAccount, 50),
        'partyB.bankName': sanitizeText(form.bankName, 100),
        'partyB.bankBranch': sanitizeText(form.bankBranch, 100),
        signatureURL,
        status: 'active',
        signedByWorkerAt: serverTimestamp(),
        submittedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string };
      console.error('[Step 2 - Update contract]', err);
      setError(`Lỗi cập nhật hợp đồng (${e?.code || e?.message || 'unknown'})`);
      setSaving(false);
      return;
    }

    // NOTE: Notifications are sent automatically by Cloud Function `onContractSubmitted`.
    setSaving(false);
    setSuccess(true);
    setTimeout(() => router.push('/freelancer/contracts'), 2500);
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.center}><Loader2 size={28} className={styles.spin} /> Đang tải hợp đồng...</div>
      </div>
    );
  }
  if (!contract || error) {
    return (
      <div className={styles.page}>
        <div className={styles.errorBox}><AlertTriangle size={20} /> {error || 'Hợp đồng không tồn tại.'}</div>
        <Link href="/freelancer/contracts" className={styles.backLink}><ArrowLeft size={16} /> Quay lại danh sách hợp đồng</Link>
      </div>
    );
  }
  if (success) {
    return (
      <div className={styles.page}>
        <div className={styles.successBox}>
          <CheckCircle size={36} className={styles.successIcon} />
          <h2>Hợp đồng đã được gửi thành công!</h2>
          <p>Jobmaster và kế toán đã được thông báo. Bạn sẽ được chuyển về danh sách hợp đồng...</p>
        </div>
      </div>
    );
  }

  const deadline = contract.contractDeadline
    ? (typeof contract.contractDeadline === 'object' && 'toDate' in contract.contractDeadline
      ? (contract.contractDeadline as { toDate: () => Date }).toDate()
      : new Date(contract.contractDeadline as unknown as string))
    : null;
  const daysLeft = deadline
    ? Math.ceil((deadline.getTime() - PAGE_LOAD_TIME) / (1000 * 60 * 60 * 24))
    : null;
  const isOverdue = daysLeft !== null && daysLeft <= 0;
  const isUrgent = daysLeft !== null && daysLeft <= 1 && !isOverdue;

  return (
    <div className={styles.page}>
      {/* Top bar */}
      <div className={styles.topBar}>
        <Link href="/freelancer/contracts" className={styles.backLink}>
          <ArrowLeft size={18} /> Quay lại hợp đồng
        </Link>
        <Button onClick={handleSubmit} disabled={saving || !signatureDataUrl}>
          {saving ? <><Loader2 size={16} className={styles.spin} /> Đang gửi...</> : <><Save size={16} /> Ký & Gửi hợp đồng</>}
        </Button>
      </div>

      {/* Deadline warning */}
      {deadline && (
        <div className={`${styles.deadlineBox} ${isOverdue ? styles.deadlineOverdue : isUrgent ? styles.deadlineUrgent : styles.deadlineOk}`}>
          <AlertTriangle size={16} />
          {isOverdue
            ? `Đã quá hạn ký hợp đồng (${formatDate(deadline)}). Vui lòng liên hệ jobmaster.`
            : `Hạn hoàn thiện hợp đồng: ${formatDate(deadline)} (còn ${daysLeft} ngày)`
          }
        </div>
      )}

      {error && <div className={styles.errorBox}><AlertTriangle size={16} /> {error}</div>}

      <div className={styles.contractWrap}>
        {/* Contract header preview */}
        <div className={styles.contractDoc}>
          <div className={styles.docHeader}>
            <p className={styles.docRepublic}>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
            <p className={styles.docMotto}>Độc lập - Tự do - Hạnh phúc</p>
            <div className={styles.docDivider} />
            <h1 className={styles.docTitle}>HỢP ĐỒNG GIAO KHOÁN</h1>
            <p className={styles.docNumber}>Số: <strong>{contract.contractNumber}</strong></p>
            <p className={styles.docAbout}>Về việc: <strong>{contract.jobTitle}</strong></p>
          </div>

          <section className={styles.docSection}>
            <h3>PHẦN I. CÁC CĂN CỨ KÝ KẾT HỢP ĐỒNG</h3>
            <p>- Luật Xây dựng số 50/2014 ngày 18/06/2014; Luật Dân sự ngày 14/06/2005;</p>
            <p>- Luật thuế thu nhập cá nhân hiện hành;</p>
            <p>- Và các văn bản pháp quy hiện hành có liên quan;</p>
            <p>- Căn cứ năng lực của Bên B và nhu cầu của Bên A.</p>
          </section>

          <section className={styles.docSection}>
            <h3>PHẦN II. CÁC ĐIỀU KHOẢN VÀ ĐIỀU KIỆN CỦA HỢP ĐỒNG</h3>
            <p>Hôm nay, ngày {new Date().getDate()} tháng {new Date().getMonth() + 1} năm {new Date().getFullYear()} tại Công ty TNHH Tư vấn Kiến trúc Việt Nam VAA, chúng tôi gồm các bên dưới đây:</p>
          </section>

          {/* Party A — fixed */}
          <section className={styles.docSection}>
            <h3>1. Bên A: CÔNG TY TNHH TƯ VẤN KIẾN TRÚC VIỆT NAM VAA</h3>
            <p><strong>Đại diện:</strong> Ông Đỗ Tất Kiên</p>
            <p><strong>Chức vụ:</strong> Tổng giám đốc</p>
            <p><strong>Địa chỉ trụ sở:</strong> Số 40, phố Tăng Bạt Hổ, Phường Hai Bà Trưng, Thành phố Hà Nội, Việt Nam</p>
            <p><strong>Địa chỉ VPGD:</strong> Tầng 19, Tòa nhà Center Building, Số 1 Nguyễn Huy Tưởng, Thanh Xuân, Hà Nội</p>
            <p><strong>Mã số thuế:</strong> 0102341714</p>
          </section>

          {/* Party B — editable form */}
          <section className={styles.docSection}>
            <h3>2. Bên B (Thông tin của bạn)</h3>
            <p className={styles.formNote}><FileText size={14} /> Vui lòng kiểm tra và điền đầy đủ thông tin bên dưới. Các trường đã được điền sẵn từ hồ sơ của bạn.</p>

            <div className={styles.formGrid}>
              <div className={styles.formField}>
                <label>Họ và tên thật *</label>
                <input value={form.name} onChange={e => updateField('name', e.target.value)} placeholder="Nguyễn Văn A" />
              </div>
              <div className={styles.formField}>
                <label>Ngày sinh</label>
                <input type="date" value={form.dateOfBirth} onChange={e => updateField('dateOfBirth', e.target.value)} />
              </div>
              <div className={styles.formField}>
                <label>Số CCCD *</label>
                <input value={form.idNumber} onChange={e => updateField('idNumber', e.target.value)} placeholder="12 chữ số" />
              </div>
              <div className={styles.formField}>
                <label>Số điện thoại *</label>
                <input value={form.phone} onChange={e => updateField('phone', e.target.value)} placeholder="0901 234 567" />
              </div>
              <div className={`${styles.formField} ${styles.fullWidth}`}>
                <label>Địa chỉ thường trú *</label>
                <input value={form.address} onChange={e => updateField('address', e.target.value)} placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành" />
              </div>
              <div className={styles.formField}>
                <label>Mã số thuế cá nhân</label>
                <input value={form.taxId} onChange={e => updateField('taxId', e.target.value)} placeholder="Nhập MST (nếu có)" />
              </div>
              <div className={styles.formField}>
                <label>Số tài khoản ngân hàng *</label>
                <input value={form.bankAccount} onChange={e => updateField('bankAccount', e.target.value)} placeholder="Số tài khoản" />
              </div>
              <div className={styles.formField}>
                <label>Ngân hàng *</label>
                <select value={form.bankName} onChange={e => updateField('bankName', e.target.value)}>
                  <option value="">-- Chọn ngân hàng --</option>
                  {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div className={styles.formField}>
                <label>Chi nhánh</label>
                <input value={form.bankBranch} onChange={e => updateField('bankBranch', e.target.value)} placeholder="VD: Chi nhánh Quận 7" />
              </div>
            </div>
          </section>

          {/* ═══════════ ĐIỀU 1 ═══════════ */}
          <section className={styles.docSection}>
            <h3>ĐIỀU 1. NỘI DUNG CÔNG VIỆC</h3>
            <p>1.1. Bên A giao khoán cho Bên B thực hiện công việc:</p>
            <div className={styles.scopeBox}>
              {contract.jobDescription || contract.scope || '(Theo mô tả công việc của job được giao)'}
            </div>
            <p>1.2. Sản phẩm giao nộp: Theo yêu cầu kỹ thuật của từng giai đoạn công việc.</p>
            <p>1.3. Tiêu chuẩn áp dụng: Theo quy chuẩn, tiêu chuẩn hiện hành của Việt Nam và yêu cầu cụ thể của Bên A.</p>
          </section>

          {/* ═══════════ ĐIỀU 2 ═══════════ */}
          <section className={styles.docSection}>
            <h3>ĐIỀU 2. GIÁ TRỊ HỢP ĐỒNG, TẠM ỨNG VÀ THANH TOÁN</h3>
            <p>2.1. Giá trị hợp đồng (trọn gói): <strong>{contract.totalValue?.toLocaleString('vi-VN')}₫</strong></p>
            <p>Bằng chữ: <em>{numberToVietnameseWords(contract.totalValue)}</em></p>
            <p>2.2. Giá hợp đồng trên là thu nhập thực nhận sau khi đã khấu trừ thuế thu nhập cá nhân. Bên A có trách nhiệm tính ngược để khấu trừ, kê khai và nộp thuế TNCN thay cho Bên B theo quy định pháp luật hiện hành.</p>
          </section>

          {/* ═══════════ ĐIỀU 3 ═══════════ */}
          <section className={styles.docSection}>
            <h3>ĐIỀU 3. PHƯƠNG THỨC THANH TOÁN</h3>
            <p>3.1. Hình thức thanh toán: Chuyển khoản qua tài khoản ngân hàng của Bên B.</p>
            {contract.milestones && contract.milestones.length > 0 && (
              <>
                <p>3.2. Các đợt thanh toán:</p>
                <table className={styles.milestoneTable}>
                  <thead>
                    <tr><th>Đợt</th><th>Nội dung</th><th>Tỷ lệ</th><th>Số tiền (VNĐ)</th></tr>
                  </thead>
                  <tbody>
                    {contract.milestones.map((m, i) => (
                      <tr key={m.id || i}>
                        <td>Đợt {i + 1}</td>
                        <td>{m.name}</td>
                        <td>{m.percentage}%</td>
                        <td>{m.amount?.toLocaleString('vi-VN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
            <p>3.3. Hồ sơ thanh toán gồm: Biên bản nghiệm thu sản phẩm, Giấy đề nghị thanh toán, Hóa đơn (nếu có).</p>
            <p>3.4. Thời hạn thanh toán: Trong vòng 15 ngày làm việc sau khi Bên B nộp đầy đủ hồ sơ thanh toán hợp lệ.</p>
          </section>

          {/* ═══════════ ĐIỀU 4 ═══════════ */}
          <section className={styles.docSection}>
            <h3>ĐIỀU 4. THAY ĐỔI VÀ ĐIỀU CHỈNH GIÁ HỢP ĐỒNG</h3>
            <p>4.1. Giá hợp đồng được điều chỉnh trong các trường hợp sau:</p>
            <p className={styles.indent}>a) Bên A thay đổi, bổ sung nội dung công việc so với hợp đồng đã ký;</p>
            <p className={styles.indent}>b) Thay đổi điều kiện kinh tế vĩ mô theo quy định pháp luật;</p>
            <p className={styles.indent}>c) Trường hợp bất khả kháng theo Điều 15 của hợp đồng này.</p>
            <p>4.2. Việc điều chỉnh giá phải được hai bên thống nhất bằng văn bản trước khi thực hiện.</p>
            <p>4.3. Mọi công việc phát sinh ngoài phạm vi hợp đồng phải có phụ lục hợp đồng bổ sung.</p>
          </section>

          {/* ═══════════ ĐIỀU 5 ═══════════ */}
          <section className={styles.docSection}>
            <h3>ĐIỀU 5. TIẾN ĐỘ THỰC HIỆN HỢP ĐỒNG</h3>
            <p>5.1. Thời gian bắt đầu: Ngay sau khi hợp đồng được ký kết bởi hai bên.</p>
            <p>5.2. Thời gian hoàn thành: Theo tiến độ chung của dự án và các milestone đã thỏa thuận tại Điều 3.</p>
            <p>5.3. Bên B phải thông báo cho Bên A khi tiến độ có nguy cơ chậm trễ. Trường hợp chậm tiến độ do lỗi của Bên B, Bên B chịu phạt theo Điều 12.</p>
            <p>5.4. Trường hợp chậm tiến độ do lỗi của Bên A hoặc nguyên nhân khách quan, hai bên sẽ thương lượng để điều chỉnh tiến độ.</p>
          </section>

          {/* ═══════════ ĐIỀU 6 ═══════════ */}
          <section className={styles.docSection}>
            <h3>ĐIỀU 6. QUYỀN VÀ NGHĨA VỤ CỦA BÊN B</h3>
            <p>6.1. Thực hiện đúng và đầy đủ các nội dung công việc theo Điều 1 của hợp đồng.</p>
            <p>6.2. Đảm bảo chất lượng sản phẩm theo đúng tiêu chuẩn, quy chuẩn kỹ thuật hiện hành.</p>
            <p>6.3. Tuân thủ tiến độ thực hiện đã cam kết; thông báo kịp thời các rủi ro chậm trễ.</p>
            <p>6.4. Tự chịu trách nhiệm về công cụ, phương tiện, chi phí đi lại và thiết bị cá nhân phục vụ công việc.</p>
            <p>6.5. Chịu trách nhiệm về tính chính xác, hợp lệ của các tài liệu, bản vẽ, hồ sơ do mình lập.</p>
            <p>6.6. Bảo mật toàn bộ thông tin liên quan đến công việc, dự án, khách hàng của Bên A theo Điều 13.</p>
            <p>6.7. Sửa chữa, hoàn thiện sản phẩm theo yêu cầu nghiệm thu của Bên A mà không phát sinh chi phí (trừ khi do thay đổi nội dung từ Bên A).</p>
            <p>6.8. Không được chuyển giao một phần hoặc toàn bộ công việc cho bên thứ ba khi chưa có sự đồng ý bằng văn bản của Bên A.</p>
            <p>6.9. Được quyền yêu cầu Bên A cung cấp đầy đủ thông tin, tài liệu cần thiết để thực hiện công việc.</p>
            <p>6.10. Được quyền thanh toán theo đúng giá trị và tiến độ quy định tại Điều 2 và Điều 3.</p>
          </section>

          {/* ═══════════ ĐIỀU 7 ═══════════ */}
          <section className={styles.docSection}>
            <h3>ĐIỀU 7. QUYỀN VÀ NGHĨA VỤ CỦA BÊN A</h3>
            <p>7.1. Cung cấp đầy đủ, kịp thời các thông tin, tài liệu kỹ thuật cần thiết cho Bên B thực hiện công việc.</p>
            <p>7.2. Tổ chức nghiệm thu sản phẩm theo đúng quy trình và tiến độ đã thỏa thuận.</p>
            <p>7.3. Thanh toán cho Bên B theo đúng giá trị và tiến độ quy định tại hợp đồng.</p>
            <p>7.4. Được quyền kiểm tra, giám sát tiến độ và chất lượng công việc của Bên B.</p>
            <p>7.5. Được quyền yêu cầu Bên B sửa chữa, hoàn thiện sản phẩm chưa đạt yêu cầu.</p>
            <p>7.6. Được quyền chấm dứt hợp đồng theo Điều 10 nếu Bên B vi phạm nghiêm trọng nghĩa vụ hợp đồng.</p>
            <p>7.7. Chịu trách nhiệm kê khai và nộp thuế TNCN thay cho Bên B theo quy định.</p>
          </section>

          {/* ═══════════ ĐIỀU 8 ═══════════ */}
          <section className={styles.docSection}>
            <h3>ĐIỀU 8. VẬT LIỆU VÀ THIẾT BỊ</h3>
            <p>8.1. Bên B tự chuẩn bị máy tính, phần mềm bản quyền và các công cụ cần thiết để thực hiện công việc.</p>
            <p>8.2. Bên A cung cấp tài khoản phần mềm chuyên dụng (nếu yêu cầu) trong thời gian thực hiện hợp đồng.</p>
            <p>8.3. Bên B có trách nhiệm bảo quản, trả lại các tài liệu, tài khoản do Bên A cung cấp khi kết thúc hợp đồng.</p>
          </section>

          {/* ═══════════ ĐIỀU 9 ═══════════ */}
          <section className={styles.docSection}>
            <h3>ĐIỀU 9. SẢN PHẨM VÀ NGHIỆM THU</h3>
            <p>9.1. Bên B nộp sản phẩm theo từng đợt tương ứng với các milestone tại Điều 3.</p>
            <p>9.2. Bên A tổ chức nghiệm thu trong vòng 07 ngày làm việc kể từ khi nhận sản phẩm.</p>
            <p>9.3. Trường hợp sản phẩm chưa đạt yêu cầu, Bên A thông báo bằng văn bản và Bên B phải sửa chữa trong thời hạn do hai bên thỏa thuận.</p>
            <p>9.4. Biên bản nghiệm thu có chữ ký xác nhận của hai bên là căn cứ để thanh toán.</p>
          </section>

          {/* ═══════════ ĐIỀU 10 ═══════════ */}
          <section className={styles.docSection}>
            <h3>ĐIỀU 10. TẠM NGỪNG VÀ CHẤM DỨT HỢP ĐỒNG</h3>
            <p>10.1. Hợp đồng có thể tạm ngừng khi:</p>
            <p className={styles.indent}>a) Bên A yêu cầu tạm ngừng do thay đổi kế hoạch dự án;</p>
            <p className={styles.indent}>b) Xảy ra sự kiện bất khả kháng theo Điều 15.</p>
            <p>10.2. Hợp đồng chấm dứt khi:</p>
            <p className={styles.indent}>a) Hai bên hoàn thành đầy đủ nghĩa vụ hợp đồng;</p>
            <p className={styles.indent}>b) Hai bên thỏa thuận chấm dứt trước hạn;</p>
            <p className={styles.indent}>c) Một bên vi phạm nghiêm trọng nghĩa vụ và bên kia có quyền đơn phương chấm dứt sau khi thông báo 15 ngày.</p>
            <p>10.3. Khi chấm dứt trước hạn, Bên A thanh toán cho Bên B phần công việc đã hoàn thành được nghiệm thu.</p>
          </section>

          {/* ═══════════ ĐIỀU 11 ═══════════ */}
          <section className={styles.docSection}>
            <h3>ĐIỀU 11. BỒI THƯỜNG VÀ GIỚI HẠN TRÁCH NHIỆM</h3>
            <p>11.1. Bên vi phạm nghĩa vụ hợp đồng gây thiệt hại cho bên kia phải bồi thường thiệt hại thực tế phát sinh.</p>
            <p>11.2. Tổng giá trị bồi thường không vượt quá giá trị hợp đồng quy định tại Điều 2.</p>
            <p>11.3. Không bên nào chịu trách nhiệm về các thiệt hại gián tiếp, mất lợi nhuận kỳ vọng.</p>
          </section>

          {/* ═══════════ ĐIỀU 12 ═══════════ */}
          <section className={styles.docSection}>
            <h3>ĐIỀU 12. PHẠT VI PHẠM</h3>
            <p>12.1. Bên B chậm tiến độ không có lý do chính đáng: phạt 0.1% giá trị hợp đồng cho mỗi ngày chậm, tối đa không quá 8% giá trị hợp đồng.</p>
            <p>12.2. Bên A chậm thanh toán: phạt 0.05% giá trị chậm thanh toán cho mỗi ngày chậm.</p>
            <p>12.3. Vi phạm điều khoản bảo mật: phạt 30% giá trị hợp đồng và bồi thường thiệt hại thực tế (nếu có).</p>
          </section>

          {/* ═══════════ ĐIỀU 13 ═══════════ */}
          <section className={styles.docSection}>
            <h3>ĐIỀU 13. BẢO MẬT, BẢN QUYỀN</h3>
            <p>13.1. Mọi thông tin liên quan đến công việc, dự án, khách hàng, quy trình, công nghệ của Bên A đều được coi là thông tin mật.</p>
            <p>13.2. Bên B không được tiết lộ, sao chép, sử dụng thông tin mật cho mục đích ngoài phạm vi hợp đồng.</p>
            <p>13.3. Toàn bộ sản phẩm, bản vẽ, tài liệu do Bên B thực hiện theo hợp đồng thuộc quyền sở hữu của Bên A.</p>
            <p>13.4. Bên B không được sử dụng sản phẩm cho mục đích cá nhân hoặc chuyển cho bên thứ ba khi chưa có sự đồng ý bằng văn bản của Bên A.</p>
            <p>13.5. Nghĩa vụ bảo mật có hiệu lực trong thời gian thực hiện hợp đồng và 03 năm sau khi hợp đồng kết thúc.</p>
          </section>

          {/* ═══════════ ĐIỀU 14 ═══════════ */}
          <section className={styles.docSection}>
            <h3>ĐIỀU 14. BẢO HIỂM</h3>
            <p>14.1. Hợp đồng giao khoán này không thuộc đối tượng bắt buộc tham gia bảo hiểm xã hội, bảo hiểm y tế theo quy định pháp luật hiện hành.</p>
            <p>14.2. Bên B tự chịu trách nhiệm về bảo hiểm cá nhân của mình trong quá trình thực hiện hợp đồng.</p>
          </section>

          {/* ═══════════ ĐIỀU 15 ═══════════ */}
          <section className={styles.docSection}>
            <h3>ĐIỀU 15. BẤT KHẢ KHÁNG</h3>
            <p>15.1. Sự kiện bất khả kháng là sự kiện xảy ra một cách khách quan, không thể lường trước được và không thể khắc phục được mặc dù đã áp dụng mọi biện pháp cần thiết, bao gồm nhưng không giới hạn: thiên tai, dịch bệnh, chiến tranh, thay đổi chính sách pháp luật.</p>
            <p>15.2. Bên bị ảnh hưởng phải thông báo cho bên kia trong vòng 07 ngày kể từ khi xảy ra sự kiện bất khả kháng.</p>
            <p>15.3. Trong thời gian bất khả kháng, nghĩa vụ của các bên được tạm hoãn tương ứng.</p>
          </section>

          {/* ═══════════ ĐIỀU 16 ═══════════ */}
          <section className={styles.docSection}>
            <h3>ĐIỀU 16. KHIẾU NẠI, TRANH CHẤP</h3>
            <p>16.1. Mọi tranh chấp phát sinh trong quá trình thực hiện hợp đồng sẽ được giải quyết trước tiên bằng thương lượng, hòa giải giữa hai bên.</p>
            <p>16.2. Trường hợp không thương lượng được, tranh chấp sẽ được giải quyết tại Tòa án nhân dân có thẩm quyền theo quy định pháp luật Việt Nam.</p>
          </section>

          {/* ═══════════ ĐIỀU 17 ═══════════ */}
          <section className={styles.docSection}>
            <h3>ĐIỀU 17. ĐIỀU KHOẢN CHUNG</h3>
            <p>17.1. Hợp đồng này có hiệu lực kể từ ngày ký và chấm dứt khi hai bên hoàn thành đầy đủ nghĩa vụ hoặc theo các trường hợp quy định tại Điều 10.</p>
            <p>17.2. Hợp đồng được lập thành 02 bản có giá trị pháp lý ngang nhau, mỗi bên giữ 01 bản.</p>
            <p>17.3. Mọi sửa đổi, bổ sung hợp đồng phải được lập thành phụ lục và có chữ ký xác nhận của cả hai bên.</p>
            <p>17.4. Các phụ lục hợp đồng (nếu có) là bộ phận không tách rời của hợp đồng này.</p>
          </section>

          {/* Signature section */}
          <section className={styles.signSection}>
            <div className={styles.signParty}>
              <h4>ĐẠI DIỆN BÊN A</h4>
              <p className={styles.signName}>Ông Đỗ Tất Kiên</p>
              <p className={styles.signTitle}>Tổng giám đốc</p>
              <div className={styles.signBox}>
                <span className={styles.signPlaceholder}>[Chữ ký điện tử Bên A]</span>
              </div>
            </div>

            <div className={styles.signParty}>
              <h4>ĐẠI DIỆN BÊN B</h4>
              <p className={styles.signName}>{form.name || '(Họ và tên bên B)'}</p>
              <div className={styles.signPadWrap}>
                <SignaturePad
                  onSave={setSignatureDataUrl}
                  onClear={() => setSignatureDataUrl(null)}
                  width={320}
                  height={160}
                />
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Bottom action bar */}
      <div className={styles.bottomBar}>
        <p className={styles.legalNote}>
          Bằng cách nhấn &ldquo;Ký &amp; Gửi hợp đồng&rdquo;, bạn xác nhận tất cả thông tin trên là chính xác và đồng ý với các điều khoản hợp đồng.
        </p>
        <Button onClick={handleSubmit} disabled={saving || !signatureDataUrl}>
          {saving ? <><Loader2 size={16} className={styles.spin} /> Đang gửi...</> : <><Save size={16} /> Ký & Gửi hợp đồng</>}
        </Button>
      </div>
    </div>
  );
}
