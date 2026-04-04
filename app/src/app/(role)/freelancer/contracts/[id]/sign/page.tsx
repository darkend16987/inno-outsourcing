'use client';

import React, { useState, useEffect, useRef } from 'react';
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
import type { Contract, UserProfile } from '@/types';
import styles from './page.module.css';

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
    setLoading(true);
    getDoc(doc(db, 'contracts', id)).then(snap => {
      if (!snap.exists()) { setError('Không tìm thấy hợp đồng.'); setLoading(false); return; }
      const c = { id: snap.id, ...snap.data() } as Contract;
      setContract(c);
      // Pre-fill form from existing contract partyB or from user profile
      const p = userProfile;
      setForm({
        name: c.partyB?.name || p?.displayName || '',
        dateOfBirth: (c.partyB as { dateOfBirth?: string })?.dateOfBirth || '',
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
    ? Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
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

          {/* Key contract articles summary */}
          <section className={styles.docSection}>
            <h3>ĐIỀU 1. PHẠM VI CÔNG VIỆC</h3>
            <div className={styles.scopeBox}>
              {contract.jobDescription || contract.scope || '(Theo mô tả công việc của job được giao)'}
            </div>
          </section>

          <section className={styles.docSection}>
            <h3>ĐIỀU 2. GIÁ TRỊ HỢP ĐỒNG</h3>
            <p>
              Giá trị hợp đồng (trọn gói):&nbsp;
              <strong>{contract.totalValue?.toLocaleString('vi-VN')}₫</strong>
            </p>
            <p>Bằng chữ: <em>{numberToVietnameseWords(contract.totalValue)}</em></p>
            <p>Giá hợp đồng trên là thu nhập thực nhận sau khi đã khấu trừ thuế thu nhập cá nhân. Bên A có trách nhiệm tính ngược để khấu trừ, kê khai và nộp thuế TNCN thay cho Bên B.</p>
          </section>

          {contract.milestones && contract.milestones.length > 0 && (
            <section className={styles.docSection}>
              <h3>ĐIỀU 3. PHƯƠNG THỨC THANH TOÁN</h3>
              <p>Hình thức thanh toán: Chuyển khoản</p>
              <p>Các đợt thanh toán:</p>
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
            </section>
          )}

          <section className={styles.docSection}>
            <h3>ĐIỀU 5. TIẾN ĐỘ THỰC HIỆN</h3>
            <p>Thời gian bắt đầu: Ngay sau khi hợp đồng được ký kết.</p>
            <p>Thời gian hoàn thành: Theo tiến độ chung của dự án và các milestone đã thỏa thuận.</p>
          </section>

          <section className={styles.docSection}>
            <p style={{ fontSize: '0.82rem', color: '#666', fontStyle: 'italic' }}>
              (Các điều khoản 4, 6–17 theo mẫu hợp đồng tiêu chuẩn của VAA — bao gồm điều chỉnh giá, quyền và nghĩa vụ các bên, chế tài vi phạm, bảo mật, bất khả kháng và giải quyết tranh chấp.)
            </p>
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
          Bằng cách nhấn "Ký & Gửi hợp đồng", bạn xác nhận tất cả thông tin trên là chính xác và đồng ý với các điều khoản hợp đồng.
        </p>
        <Button onClick={handleSubmit} disabled={saving || !signatureDataUrl}>
          {saving ? <><Loader2 size={16} className={styles.spin} /> Đang gửi...</> : <><Save size={16} /> Ký & Gửi hợp đồng</>}
        </Button>
      </div>
    </div>
  );
}
