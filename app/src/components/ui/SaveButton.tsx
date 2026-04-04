'use client';

import React, { useState } from 'react';
import { Heart } from 'lucide-react';
import styles from './SaveButton.module.css';

interface SaveButtonProps {
  isSaved: boolean;
  onToggle: (save: boolean) => Promise<void> | void;
  size?: 'sm' | 'md';
  className?: string;
  label?: string;
}

export function SaveButton({
  isSaved,
  onToggle,
  size = 'sm',
  className = '',
  label,
}: SaveButtonProps) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(isSaved);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (saving) return;
    setSaving(true);
    try {
      await onToggle(!saved);
      setSaved(!saved);
    } catch {
      // revert
    }
    setSaving(false);
  };

  return (
    <button
      className={`${styles.btn} ${saved ? styles.saved : ''} ${styles[size]} ${className}`}
      onClick={handleClick}
      disabled={saving}
      title={saved ? 'Bỏ lưu' : 'Lưu'}
      type="button"
    >
      <Heart size={size === 'sm' ? 16 : 18} className={styles.icon} />
      {label && <span className={styles.label}>{saved ? 'Đã lưu' : label}</span>}
    </button>
  );
}
