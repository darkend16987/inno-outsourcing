'use client';

import React, { useState } from 'react';
import { CheckCircle2, Circle, AlertTriangle, Send, Shield } from 'lucide-react';
import { Button } from '@/components/ui';
import styles from './CompletionChecklist.module.css';

export interface ChecklistItemData {
  id: string;
  label: string;
  freelancerChecked: boolean;
  freelancerNote?: string;
  masterApproved: boolean;
  masterNote?: string;
}

interface CompletionChecklistProps {
  items: ChecklistItemData[];
  role: 'freelancer' | 'admin' | 'jobmaster';
  onFreelancerSubmit?: (items: ChecklistItemData[]) => void;
  onMasterApprove?: (items: ChecklistItemData[]) => void;
  onMasterReject?: (itemId: string, note: string) => void;
  disabled?: boolean;
  className?: string;
}

export function CompletionChecklist({
  items,
  role,
  onFreelancerSubmit,
  onMasterApprove,
  onMasterReject,
  disabled = false,
  className = '',
}: CompletionChecklistProps) {
  const [localItems, setLocalItems] = useState<ChecklistItemData[]>(items);
  const [rejectNote, setRejectNote] = useState('');
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  const allFreelancerChecked = localItems.every(i => i.freelancerChecked);
  const allMasterApproved = localItems.every(i => i.masterApproved);
  const freelancerProgress = localItems.filter(i => i.freelancerChecked).length;
  const masterProgress = localItems.filter(i => i.masterApproved).length;

  const toggleFreelancerCheck = (id: string) => {
    if (role !== 'freelancer' || disabled) return;
    setLocalItems(prev => prev.map(item =>
      item.id === id ? { ...item, freelancerChecked: !item.freelancerChecked } : item
    ));
  };

  const toggleMasterApprove = (id: string) => {
    if (role !== 'admin' && role !== 'jobmaster') return;
    setLocalItems(prev => prev.map(item =>
      item.id === id ? { ...item, masterApproved: !item.masterApproved } : item
    ));
  };

  const handleFreelancerSubmit = () => {
    if (!allFreelancerChecked || !onFreelancerSubmit) return;
    onFreelancerSubmit(localItems);
  };

  const handleMasterApproveAll = () => {
    const approved = localItems.map(i => ({ ...i, masterApproved: true }));
    setLocalItems(approved);
    onMasterApprove?.(approved);
  };

  const handleReject = (itemId: string) => {
    if (!rejectNote.trim()) return;
    onMasterReject?.(itemId, rejectNote);
    setRejectingId(null);
    setRejectNote('');
  };

  return (
    <div className={`${styles.checklist} ${className}`}>
      <div className={styles.header}>
        <h3 className={styles.title}>
          <Shield size={18} />
          Checklist hoàn thành công việc
        </h3>
        <div className={styles.progress}>
          {role === 'freelancer' ? (
            <span>{freelancerProgress}/{localItems.length} đã xác nhận</span>
          ) : (
            <span>{masterProgress}/{localItems.length} đã duyệt</span>
          )}
        </div>
      </div>

      <div className={styles.progressBar}>
        <div
          className={styles.progressFill}
          style={{
            width: `${(role === 'freelancer'
              ? freelancerProgress / localItems.length
              : masterProgress / localItems.length) * 100}%`
          }}
        />
      </div>

      <div className={styles.items}>
        {localItems.map((item, idx) => (
          <div key={item.id} className={styles.item}>
            <div className={styles.itemMain}>
              {/* Freelancer checkbox */}
              <button
                className={`${styles.checkbox} ${item.freelancerChecked ? styles.checked : ''}`}
                onClick={() => toggleFreelancerCheck(item.id)}
                disabled={role !== 'freelancer' || disabled}
              >
                {item.freelancerChecked ? <CheckCircle2 size={20} /> : <Circle size={20} />}
              </button>

              <div className={styles.itemContent}>
                <span className={`${styles.itemLabel} ${item.freelancerChecked ? styles.labelChecked : ''}`}>
                  {idx + 1}. {item.label}
                </span>
                {item.freelancerNote && (
                  <span className={styles.itemNote}>Ghi chú: {item.freelancerNote}</span>
                )}
              </div>

              {/* Master approval column */}
              {(role === 'admin' || role === 'jobmaster') && item.freelancerChecked && (
                <div className={styles.masterActions}>
                  <button
                    className={`${styles.approveBtn} ${item.masterApproved ? styles.approved : ''}`}
                    onClick={() => toggleMasterApprove(item.id)}
                  >
                    <CheckCircle2 size={16} />
                    {item.masterApproved ? 'Đã duyệt' : 'Duyệt'}
                  </button>
                  {!item.masterApproved && (
                    <button
                      className={styles.rejectBtn}
                      onClick={() => setRejectingId(rejectingId === item.id ? null : item.id)}
                    >
                      <AlertTriangle size={14} /> Từ chối
                    </button>
                  )}
                </div>
              )}

              {/* Status indicator for freelancer */}
              {role === 'freelancer' && item.freelancerChecked && (
                <span className={`${styles.statusBadge} ${item.masterApproved ? styles.statusApproved : styles.statusPending}`}>
                  {item.masterApproved ? 'Đã duyệt' : 'Chờ duyệt'}
                </span>
              )}
            </div>

            {/* Reject note input */}
            {rejectingId === item.id && (
              <div className={styles.rejectInputRow}>
                <input
                  type="text"
                  placeholder="Lý do từ chối..."
                  value={rejectNote}
                  onChange={e => setRejectNote(e.target.value)}
                  className={styles.rejectInput}
                />
                <button className={styles.rejectConfirm} onClick={() => handleReject(item.id)}>
                  <Send size={14} />
                </button>
              </div>
            )}

            {item.masterNote && (
              <div className={styles.masterNote}>
                <AlertTriangle size={12} /> {item.masterNote}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div className={styles.footer}>
        {role === 'freelancer' && (
          <Button
            variant="success"
            onClick={handleFreelancerSubmit}
            disabled={!allFreelancerChecked || disabled}
            icon={<Send size={16} />}
          >
            Xác nhận hoàn thành tất cả
          </Button>
        )}
        {(role === 'admin' || role === 'jobmaster') && allFreelancerChecked && (
          <Button
            variant="success"
            onClick={handleMasterApproveAll}
            disabled={allMasterApproved}
            icon={<Shield size={16} />}
          >
            {allMasterApproved ? 'Đã duyệt tất cả' : 'Duyệt tất cả hạng mục'}
          </Button>
        )}
      </div>
    </div>
  );
}
