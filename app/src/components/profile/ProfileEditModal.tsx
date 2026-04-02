'use client';

import React, { useState, useEffect } from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui';
import { updateUserProfile } from '@/lib/firebase/firestore';
import { sanitizeText, sanitizeDisplayName, sanitizePhone } from '@/lib/security/sanitize';
import type { UserProfile } from '@/types';
import styles from './ProfileEditModal.module.css';

interface ProfileEditModalProps {
  profile: UserProfile;
  onClose: () => void;
  onSaved: () => void;
}

const SPECIALTY_OPTIONS = ['Kiến trúc', 'Kết cấu', 'MEP', 'BIM', 'Dự toán', 'Giám sát', 'Thẩm tra'];
const SOFTWARE_OPTIONS = ['Revit', 'AutoCAD', 'SketchUp', '3ds Max', 'Enscape', 'Lumion', 'ETABS', 'SAP2000', 'SAFE', 'Tekla', 'Navisworks', 'Dynamo'];

export function ProfileEditModal({ profile, onClose, onSaved }: ProfileEditModalProps) {
  const [form, setForm] = useState({
    displayName: profile.displayName || '',
    phone: profile.phone || '',
    bio: profile.bio || '',
    address: profile.address || '',
    specialties: profile.specialties || [],
    software: profile.software || [],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const toggleItem = (list: string[], item: string) =>
    list.includes(item) ? list.filter(x => x !== item) : [...list, item];

  const handleSave = async () => {
    if (!form.displayName.trim()) {
      setError('Họ và tên không được để trống.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await updateUserProfile(profile.uid, {
        displayName: sanitizeDisplayName(form.displayName),
        phone: sanitizePhone(form.phone),
        bio: sanitizeText(form.bio, 2000),
        address: sanitizeText(form.address, 500),
        specialties: form.specialties,
        software: form.software,
      });
      onSaved();
    } catch (err) {
      console.error('Failed to update profile:', err);
      setError('Lưu thất bại. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Chỉnh sửa hồ sơ</h2>
          <button className={styles.closeBtn} onClick={onClose}><X size={20} /></button>
        </div>

        <div className={styles.body}>
          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.field}>
            <label>Họ và tên *</label>
            <input
              type="text"
              value={form.displayName}
              onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))}
              placeholder="Nguyễn Văn A"
            />
          </div>

          <div className={styles.field}>
            <label>Số điện thoại</label>
            <input
              type="text"
              value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              placeholder="0901 234 567"
            />
          </div>

          <div className={styles.field}>
            <label>Địa chỉ</label>
            <input
              type="text"
              value={form.address}
              onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
              placeholder="Quận 7, TP. Hồ Chí Minh"
            />
          </div>

          <div className={styles.field}>
            <label>Giới thiệu bản thân</label>
            <textarea
              value={form.bio}
              onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
              placeholder="Mô tả kinh nghiệm, chuyên môn của bạn..."
              rows={4}
            />
          </div>

          <div className={styles.field}>
            <label>Lĩnh vực chuyên môn</label>
            <div className={styles.tagPicker}>
              {SPECIALTY_OPTIONS.map(s => (
                <button
                  key={s}
                  type="button"
                  className={`${styles.tagItem} ${form.specialties.includes(s) ? styles.tagActive : ''}`}
                  onClick={() => setForm(f => ({ ...f, specialties: toggleItem(f.specialties, s) }))}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.field}>
            <label>Phần mềm thành thạo</label>
            <div className={styles.tagPicker}>
              {SOFTWARE_OPTIONS.map(s => (
                <button
                  key={s}
                  type="button"
                  className={`${styles.tagItem} ${form.software.includes(s) ? styles.tagActive : ''}`}
                  onClick={() => setForm(f => ({ ...f, software: toggleItem(f.software, s) }))}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.footer}>
          <Button variant="outline" onClick={onClose} disabled={saving}>Hủy</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <><Loader2 size={16} className={styles.spin} /> Đang lưu...</> : <><Save size={16} /> Lưu thay đổi</>}
          </Button>
        </div>
      </div>
    </div>
  );
}
