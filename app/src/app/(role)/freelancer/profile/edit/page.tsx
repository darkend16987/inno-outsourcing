'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Save, Loader2, Camera, Plus, Trash2,
} from 'lucide-react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Button } from '@/components/ui';
import { updateUserProfile } from '@/lib/firebase/firestore';
import { storage } from '@/lib/firebase/config';
import { useAuth } from '@/lib/firebase/auth-context';
import { sanitizeText, sanitizeDisplayName, sanitizePhone } from '@/lib/security/sanitize';
import type { UserProfile, UserCertificateEntry } from '@/types';
import styles from './page.module.css';

const SPECIALTY_OPTIONS = ['Kiến trúc', 'Kết cấu', 'MEP', 'BIM', 'Dự toán', 'Giám sát', 'Thẩm tra'];
const SOFTWARE_OPTIONS = ['Revit', 'AutoCAD', 'SketchUp', '3ds Max', 'Enscape', 'Lumion', 'ETABS', 'SAP2000', 'SAFE', 'Tekla', 'Navisworks', 'Dynamo'];

const UNIVERSITIES = [
  'Đại học Bách khoa TP.HCM', 'Đại học Bách khoa Hà Nội', 'Đại học Xây dựng Hà Nội',
  'Đại học Kiến trúc TP.HCM', 'Đại học Kiến trúc Hà Nội', 'Đại học Giao thông Vận tải',
  'Đại học Sư phạm Kỹ thuật TP.HCM', 'Đại học Thủy lợi', 'Đại học Tôn Đức Thắng',
  'Đại học Bách khoa Đà Nẵng', 'Đại học Cần Thơ', 'Đại học Mở TP.HCM',
  'Đại học Công nghiệp TP.HCM', 'Đại học Lạc Hồng', 'Đại học Văn Lang',
  'Đại học Hồng Bàng', 'Đại học Hutech', 'Đại học FPT',
  'Đại học Công nghệ TP.HCM', 'Đại học Nguyễn Tất Thành',
  'Khác',
];

const BANKS = [
  'Vietcombank', 'VietinBank', 'BIDV', 'Agribank', 'Techcombank',
  'MB Bank', 'ACB', 'VPBank', 'Sacombank', 'HDBank',
  'TPBank', 'OCB', 'MSB', 'VIB', 'SHB',
  'SeABank', 'LienVietPostBank', 'Eximbank', 'NCB', 'ABBank',
  'BacABank', 'PGBank', 'NamABank', 'SaigonBank', 'VietABank',
  'Khác',
];

const MAX_AVATAR_SIZE = 2 * 1024 * 1024;
const ALLOWED_IMG_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function calcCompletion(form: Record<string, unknown>): number {
  const checks = [
    !!form.displayName, !!form.phone, !!form.bio, !!form.address,
    (form.specialties as string[])?.length > 0,
    (form.software as string[])?.length > 0,
    !!form.educationSchool, !!form.yearsOfExperience,
    !!form.idNumber, !!form.bankAccountNumber, !!form.bankName, !!form.taxId,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

export default function ProfileEditPage() {
  const router = useRouter();
  const { userProfile, refreshProfile, loading: authLoading } = useAuth();
  const profile = userProfile;

  const [form, setForm] = useState(() => ({
    displayName: profile?.displayName || '',
    phone: profile?.phone || '',
    bio: profile?.bio || '',
    address: profile?.address || '',
    specialties: profile?.specialties || [] as string[],
    software: profile?.software || [] as string[],
    yearsOfExperience: profile?.yearsOfExperience || '',
    educationSchool: profile?.educationSchool || '',
    educationYear: profile?.educationYear || '',
    educationMajor: profile?.educationMajor || '',
    idNumber: profile?.idNumber || '',
    idIssuedDate: profile?.idIssuedDate || '',
    idIssuedPlace: profile?.idIssuedPlace || '',
    bankAccountNumber: profile?.bankAccountNumber || '',
    bankName: profile?.bankName || '',
    bankBranch: profile?.bankBranch || '',
    taxId: profile?.taxId || '',
  }));

  const [certificates, setCertificates] = useState<UserCertificateEntry[]>(
    profile?.certificates || []
  );

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  // Avatar
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile?.photoURL || null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleItem = (list: string[], item: string) =>
    list.includes(item) ? list.filter(x => x !== item) : [...list, item];

  const updateField = (key: string, value: unknown) =>
    setForm(f => ({ ...f, [key]: value }));

  // Avatar
  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_IMG_TYPES.includes(file.type)) { setError('Chỉ hỗ trợ ảnh JPG, PNG, WebP.'); return; }
    if (file.size > MAX_AVATAR_SIZE) { setError('Ảnh tối đa 2MB.'); return; }
    setError('');
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const uploadAvatar = async (): Promise<string | null> => {
    if (!avatarFile || !profile) return profile?.photoURL || null;
    setUploadingAvatar(true);
    try {
      const ext = avatarFile.name.split('.').pop() || 'jpg';
      const storageRef = ref(storage, `avatars/${profile.uid}/avatar.${ext}`);
      await uploadBytes(storageRef, avatarFile, {
        contentType: avatarFile.type,
        customMetadata: { uploadedBy: profile.uid },
      });
      return await getDownloadURL(storageRef);
    } catch {
      throw new Error('Upload ảnh thất bại. Vui lòng thử lại.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Certificates
  const addCertificate = () => {
    setCertificates(prev => [...prev, { name: '', issuedBy: '', issuedDate: '', expiryDate: '', imageUrl: '' }]);
  };
  const updateCertificate = (idx: number, field: keyof UserCertificateEntry, value: string) => {
    setCertificates(prev => prev.map((c, i) => i === idx ? { ...c, [field]: value } : c));
  };
  const removeCertificate = (idx: number) => {
    setCertificates(prev => prev.filter((_, i) => i !== idx));
  };

  const getInitials = (name: string) =>
    name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  // Save
  const handleSave = async () => {
    if (!profile) return;
    if (!form.displayName.trim()) { setError('Họ và tên không được để trống.'); return; }
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const photoURL = await uploadAvatar();
      const validCerts = certificates.filter(c => c.name.trim());
      await updateUserProfile(profile.uid, {
        displayName: sanitizeDisplayName(form.displayName),
        phone: sanitizePhone(form.phone),
        bio: sanitizeText(form.bio, 2000),
        address: sanitizeText(form.address, 500),
        specialties: form.specialties,
        software: form.software,
        yearsOfExperience: form.yearsOfExperience ? Number(form.yearsOfExperience) : undefined,
        educationSchool: form.educationSchool || undefined,
        educationYear: form.educationYear || undefined,
        educationMajor: form.educationMajor || undefined,
        idNumber: form.idNumber || undefined,
        idIssuedDate: form.idIssuedDate || undefined,
        idIssuedPlace: form.idIssuedPlace || undefined,
        bankAccountNumber: form.bankAccountNumber || undefined,
        bankName: form.bankName || undefined,
        bankBranch: form.bankBranch || undefined,
        taxId: form.taxId || undefined,
        certificates: validCerts.length > 0 ? validCerts : undefined,
        ...(photoURL != null && { photoURL }),
      } as Partial<UserProfile>);
      await refreshProfile();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Failed to update profile:', err);
      setError(err instanceof Error ? err.message : 'Lưu thất bại.');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || !profile) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingWrap}>
          <Loader2 size={28} className={styles.spin} />
          <span>Đang tải thông tin...</span>
        </div>
      </div>
    );
  }

  const completion = calcCompletion(form as unknown as Record<string, unknown>);

  return (
    <div className={styles.page}>
      {/* Top bar */}
      <div className={styles.topBar}>
        <Link href="/freelancer/profile" className={styles.backLink}>
          <ArrowLeft size={18} /> Quay lại hồ sơ
        </Link>
        <div className={styles.topRight}>
          <div className={styles.completionRow}>
            <div className={styles.completionBar}>
              <div className={styles.completionFill} style={{ width: `${completion}%` }} />
            </div>
            <span className={styles.completionText}>Hoàn thiện {completion}%</span>
          </div>
          <Button onClick={handleSave} disabled={saving || uploadingAvatar}>
            {saving
              ? <><Loader2 size={16} className={styles.spin} /> Đang lưu...</>
              : <><Save size={16} /> Lưu thay đổi</>
            }
          </Button>
        </div>
      </div>

      <h1 className={styles.pageTitle}>Chỉnh sửa hồ sơ</h1>

      {error && <div className={styles.error}>{error}</div>}
      {saved && <div className={styles.success}>✅ Đã lưu thành công!</div>}

      <div className={styles.formGrid}>
        {/* ====== Column 1: Avatar + Basic + Education ====== */}
        <div className={styles.col}>
          {/* Avatar */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Ảnh đại diện</h2>
            <div className={styles.avatarSection}>
              <div className={styles.avatarWrap} onClick={() => fileInputRef.current?.click()} title="Nhấn để thay đổi ảnh đại diện">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar" className={styles.avatarImg} />
                ) : (
                  <span className={styles.avatarInitials}>{getInitials(form.displayName || 'U')}</span>
                )}
                <div className={styles.avatarOverlay}><Camera size={20} /><span>Thay ảnh</span></div>
                {uploadingAvatar && <div className={styles.avatarLoading}><Loader2 size={24} className={styles.spin} /></div>}
              </div>
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleAvatarSelect} className={styles.fileInput} />
              <p className={styles.hint}>JPG, PNG hoặc WebP. Tối đa 2MB.</p>
            </div>
          </div>

          {/* Basic info */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Thông tin cơ bản</h2>
            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label>Họ và tên *</label>
                <input type="text" value={form.displayName} onChange={e => updateField('displayName', e.target.value)} placeholder="Nguyễn Văn A" />
              </div>
              <div className={styles.field}>
                <label>Số điện thoại</label>
                <input type="text" value={form.phone} onChange={e => updateField('phone', e.target.value)} placeholder="0901 234 567" />
              </div>
            </div>
            <div className={styles.field}>
              <label>Địa chỉ</label>
              <input type="text" value={form.address} onChange={e => updateField('address', e.target.value)} placeholder="Quận 7, TP. Hồ Chí Minh" />
            </div>
            <div className={styles.field}>
              <label>Giới thiệu bản thân</label>
              <textarea value={form.bio} onChange={e => updateField('bio', e.target.value)} placeholder="Mô tả kinh nghiệm, chuyên môn của bạn..." rows={4} />
              <span className={styles.charCount}>{form.bio.length}/2000</span>
            </div>
          </div>

          {/* Education */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Học vấn & Kinh nghiệm</h2>
            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label>Số năm kinh nghiệm</label>
                <input type="number" min="0" max="50" value={form.yearsOfExperience} onChange={e => updateField('yearsOfExperience', e.target.value)} placeholder="VD: 5" />
              </div>
              <div className={styles.field}>
                <label>Chuyên ngành</label>
                <input type="text" value={form.educationMajor} onChange={e => updateField('educationMajor', e.target.value)} placeholder="VD: Kiến trúc, Xây dựng..." />
              </div>
            </div>
            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label>Trường đào tạo</label>
                <select value={form.educationSchool} onChange={e => updateField('educationSchool', e.target.value)}>
                  <option value="">-- Chọn trường --</option>
                  {UNIVERSITIES.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div className={styles.field}>
                <label>Năm học</label>
                <input type="text" value={form.educationYear} onChange={e => updateField('educationYear', e.target.value)} placeholder="VD: 2015-2019" />
              </div>
            </div>
          </div>
        </div>

        {/* ====== Column 2: Skills + KYC + Certs + Banking ====== */}
        <div className={styles.col}>
          {/* Skills */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Chuyên môn & Phần mềm</h2>
            <div className={styles.field}>
              <label>Lĩnh vực chuyên môn</label>
              <div className={styles.tagPicker}>
                {SPECIALTY_OPTIONS.map(s => (
                  <button key={s} type="button"
                    className={`${styles.tagItem} ${form.specialties.includes(s) ? styles.tagActive : ''}`}
                    onClick={() => updateField('specialties', toggleItem(form.specialties, s))}
                  >{s}</button>
                ))}
              </div>
            </div>
            <div className={styles.field}>
              <label>Phần mềm thành thạo</label>
              <div className={styles.tagPicker}>
                {SOFTWARE_OPTIONS.map(s => (
                  <button key={s} type="button"
                    className={`${styles.tagItem} ${form.software.includes(s) ? styles.tagActive : ''}`}
                    onClick={() => updateField('software', toggleItem(form.software, s))}
                  >{s}</button>
                ))}
              </div>
            </div>
          </div>

          {/* KYC */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>CMND/CCCD</h2>
            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label>Số CMND/CCCD</label>
                <input type="text" value={form.idNumber} onChange={e => updateField('idNumber', e.target.value)} placeholder="Nhập số CCCD 12 chữ số" />
              </div>
              <div className={styles.field}>
                <label>Ngày cấp</label>
                <input type="date" value={form.idIssuedDate} onChange={e => updateField('idIssuedDate', e.target.value)} />
              </div>
            </div>
            <div className={styles.field}>
              <label>Nơi cấp</label>
              <input type="text" value={form.idIssuedPlace} onChange={e => updateField('idIssuedPlace', e.target.value)} placeholder="VD: Cục CS QLHC về TTXH" />
            </div>
            <p className={styles.hint}>Thông tin CCCD sẽ được bảo mật và chỉ dùng cho mục đích xác minh danh tính.</p>
          </div>

          {/* Certificates */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Chứng chỉ nghề nghiệp ({certificates.length})</h2>
            {certificates.map((cert, i) => (
              <div key={i} className={styles.certCard}>
                <div className={styles.certCardHeader}>
                  <span>Chứng chỉ #{i + 1}</span>
                  <button type="button" className={styles.certRemove} onClick={() => removeCertificate(i)}><Trash2 size={14} /></button>
                </div>
                <div className={styles.fieldRow}>
                  <div className={styles.field}>
                    <label>Tên chứng chỉ *</label>
                    <input type="text" value={cert.name} onChange={e => updateCertificate(i, 'name', e.target.value)} placeholder="VD: Chứng chỉ hành nghề KS" />
                  </div>
                  <div className={styles.field}>
                    <label>Đơn vị cấp</label>
                    <input type="text" value={cert.issuedBy} onChange={e => updateCertificate(i, 'issuedBy', e.target.value)} placeholder="VD: Bộ Xây dựng" />
                  </div>
                </div>
                <div className={styles.fieldRow}>
                  <div className={styles.field}>
                    <label>Ngày cấp</label>
                    <input type="date" value={cert.issuedDate} onChange={e => updateCertificate(i, 'issuedDate', e.target.value)} />
                  </div>
                  <div className={styles.field}>
                    <label>Ngày hết hạn</label>
                    <input type="date" value={cert.expiryDate || ''} onChange={e => updateCertificate(i, 'expiryDate', e.target.value)} />
                  </div>
                </div>
                <div className={styles.field}>
                  <label>URL hình ảnh chứng chỉ</label>
                  <input type="url" value={cert.imageUrl || ''} onChange={e => updateCertificate(i, 'imageUrl', e.target.value)} placeholder="https://..." />
                </div>
              </div>
            ))}
            <button type="button" className={styles.addCertBtn} onClick={addCertificate}>
              <Plus size={16} /> Thêm chứng chỉ
            </button>
          </div>

          {/* Banking */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Ngân hàng & Thuế</h2>
            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label>Ngân hàng</label>
                <select value={form.bankName} onChange={e => updateField('bankName', e.target.value)}>
                  <option value="">-- Chọn ngân hàng --</option>
                  {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div className={styles.field}>
                <label>Số tài khoản</label>
                <input type="text" value={form.bankAccountNumber} onChange={e => updateField('bankAccountNumber', e.target.value)} placeholder="Nhập STK ngân hàng" />
              </div>
            </div>
            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label>Chi nhánh</label>
                <input type="text" value={form.bankBranch} onChange={e => updateField('bankBranch', e.target.value)} placeholder="VD: Quận 7, TP.HCM" />
              </div>
              <div className={styles.field}>
                <label>Mã số thuế cá nhân</label>
                <input type="text" value={form.taxId} onChange={e => updateField('taxId', e.target.value)} placeholder="Nhập MST" />
              </div>
            </div>
            <p className={styles.hint}>Thông tin ngân hàng dùng để nhận thanh toán khi hoàn thành công việc.</p>
          </div>
        </div>
      </div>

      {/* Bottom save bar */}
      <div className={styles.bottomBar}>
        <Link href="/freelancer/profile" className={styles.cancelLink}>Hủy</Link>
        <Button onClick={handleSave} disabled={saving || uploadingAvatar}>
          {saving
            ? <><Loader2 size={16} className={styles.spin} /> Đang lưu...</>
            : <><Save size={16} /> Lưu thay đổi</>
          }
        </Button>
      </div>
    </div>
  );
}
