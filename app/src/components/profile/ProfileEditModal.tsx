'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Loader2, Camera } from 'lucide-react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Button } from '@/components/ui';
import { updateUserProfile } from '@/lib/firebase/firestore';
import { storage } from '@/lib/firebase/config';
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
const MAX_AVATAR_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

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

  // Avatar state
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile.photoURL || null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleItem = (list: string[], item: string) =>
    list.includes(item) ? list.filter(x => x !== item) : [...list, item];

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Chỉ hỗ trợ ảnh JPG, PNG, WebP.');
      return;
    }
    if (file.size > MAX_AVATAR_SIZE) {
      setError('Ảnh tối đa 2MB.');
      return;
    }

    setError('');
    setAvatarFile(file);
    // Create preview
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const uploadAvatar = async (): Promise<string | null> => {
    if (!avatarFile) return profile.photoURL || null;

    setUploadingAvatar(true);
    try {
      const ext = avatarFile.name.split('.').pop() || 'jpg';
      const storageRef = ref(storage, `avatars/${profile.uid}/avatar.${ext}`);
      await uploadBytes(storageRef, avatarFile, {
        contentType: avatarFile.type,
        customMetadata: { uploadedBy: profile.uid },
      });
      const downloadURL = await getDownloadURL(storageRef);
      return downloadURL;
    } catch (err) {
      console.error('Avatar upload failed:', err);
      throw new Error('Upload ảnh thất bại. Vui lòng thử lại.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    if (!form.displayName.trim()) {
      setError('Họ và tên không được để trống.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      // Upload avatar first if changed
      const photoURL = await uploadAvatar();

      await updateUserProfile(profile.uid, {
        displayName: sanitizeDisplayName(form.displayName),
        phone: sanitizePhone(form.phone),
        bio: sanitizeText(form.bio, 2000),
        address: sanitizeText(form.address, 500),
        specialties: form.specialties,
        software: form.software,
        ...(photoURL != null && { photoURL }),
      });
      onSaved();
    } catch (err) {
      console.error('Failed to update profile:', err);
      setError(err instanceof Error ? err.message : 'Lưu thất bại. Vui lòng thử lại.');
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

  const getInitials = (name: string) =>
    name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Chỉnh sửa hồ sơ</h2>
          <button className={styles.closeBtn} onClick={onClose}><X size={20} /></button>
        </div>

        <div className={styles.body}>
          {error && <div className={styles.error}>{error}</div>}

          {/* Avatar Upload */}
          <div className={styles.avatarSection}>
            <div
              className={styles.avatarWrap}
              onClick={() => fileInputRef.current?.click()}
              title="Nhấn để thay đổi ảnh đại diện"
            >
              {avatarPreview ? (
                <img src={avatarPreview} alt="Avatar" className={styles.avatarImg} />
              ) : (
                <span className={styles.avatarInitials}>
                  {getInitials(form.displayName || 'U')}
                </span>
              )}
              <div className={styles.avatarOverlay}>
                <Camera size={20} />
                <span>Thay ảnh</span>
              </div>
              {uploadingAvatar && (
                <div className={styles.avatarLoading}>
                  <Loader2 size={24} className={styles.spin} />
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleAvatarSelect}
              className={styles.fileInput}
            />
            <p className={styles.avatarHint}>JPG, PNG hoặc WebP. Tối đa 2MB.</p>
          </div>

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
          <Button onClick={handleSave} disabled={saving || uploadingAvatar}>
            {saving ? <><Loader2 size={16} className={styles.spin} /> Đang lưu...</> : <><Save size={16} /> Lưu thay đổi</>}
          </Button>
        </div>
      </div>
    </div>
  );
}
