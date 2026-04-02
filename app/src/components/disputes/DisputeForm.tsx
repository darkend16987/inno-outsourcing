'use client';

import React, { useState } from 'react';
import { createDispute } from '@/lib/firebase/disputes';
import { DISPUTE_REASON_LABELS } from '@/types';
import type { UserRole, DisputeReason } from '@/types';
import styles from './DisputeForm.module.css';

interface DisputeFormProps {
  jobId: string;
  jobTitle: string;
  initiatorId: string;
  initiatorName: string;
  initiatorRole: UserRole;
  respondentId: string;
  respondentName: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function DisputeForm({
  jobId, jobTitle,
  initiatorId, initiatorName, initiatorRole,
  respondentId, respondentName,
  onSuccess, onCancel,
}: DisputeFormProps) {
  const [reason, setReason] = useState<DisputeReason | ''>('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!reason) {
      setError('Vui lòng chọn lý do tranh chấp.');
      return;
    }
    if (description.trim().length < 20) {
      setError('Vui lòng mô tả chi tiết vấn đề (ít nhất 20 ký tự).');
      return;
    }

    setSubmitting(true);
    try {
      await createDispute({
        jobId,
        jobTitle,
        initiatorId,
        initiatorName,
        initiatorRole,
        respondentId,
        respondentName,
        reason,
        description: description.trim(),
      });
      setSuccess(true);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra.');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className={styles.successMsg}>
        <span className={styles.successIcon}>✓</span>
        <div>
          <strong>Tranh chấp đã được gửi.</strong>
          <p className={styles.successDetail}>
            Admin sẽ xem xét và phản hồi trong thời gian sớm nhất.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.titleRow}>
        <span className={styles.warningIcon}>⚠️</span>
        <h4 className={styles.title}>Mở tranh chấp</h4>
      </div>
      <p className={styles.subtitle}>
        Công việc: <strong>{jobTitle}</strong> — Đối tác: <strong>{respondentName}</strong>
      </p>

      {/* Reason */}
      <div className={styles.fieldGroup}>
        <label className={styles.label}>Lý do tranh chấp *</label>
        <select
          className={styles.select}
          value={reason}
          onChange={e => setReason(e.target.value as DisputeReason)}
        >
          <option value="">-- Chọn lý do --</option>
          {Object.entries(DISPUTE_REASON_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      {/* Description */}
      <div className={styles.fieldGroup}>
        <label className={styles.label}>Mô tả chi tiết *</label>
        <textarea
          className={styles.textarea}
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Mô tả vấn đề bạn gặp phải, bao gồm:&#10;- Diễn biến cụ thể&#10;- Thời điểm xảy ra&#10;- Những gì bạn đã thử để giải quyết"
          rows={5}
          maxLength={2000}
        />
        <span className={styles.charCount}>{description.length}/2000</span>
      </div>

      <div className={styles.notice}>
        <p>💡 Sau khi gửi, Admin sẽ xem xét tranh chấp và liên hệ cả hai bên. Quyết định của Admin là cuối cùng.</p>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.actions}>
        {onCancel && (
          <button type="button" className={styles.cancelBtn} onClick={onCancel} disabled={submitting}>
            Huỷ
          </button>
        )}
        <button type="submit" className={styles.submitBtn} disabled={submitting}>
          {submitting ? 'Đang gửi...' : 'Gửi tranh chấp'}
        </button>
      </div>
    </form>
  );
}
