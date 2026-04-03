'use client';

import React, { useState } from 'react';
import { UserPlus, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui';
import { sendJobInvitation } from '@/lib/firebase/firestore-extended';
import styles from './InviteButton.module.css';

interface InviteButtonProps {
  freelancerId: string;
  freelancerName: string;
  jobId: string;
  jobTitle: string;
  jobmasterId: string;
  className?: string;
}

export function InviteButton({ freelancerId, freelancerName, jobId, jobTitle, jobmasterId, className }: InviteButtonProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent'>('idle');

  const handleInvite = async () => {
    if (status !== 'idle') return;
    setStatus('loading');
    try {
      await sendJobInvitation(
        jobId,
        freelancerId,
        jobmasterId,
        `Bạn được mời ứng tuyển dự án "${jobTitle}"`,
      );
      setStatus('sent');
    } catch {
      setStatus('idle');
    }
  };

  if (status === 'sent') {
    return (
      <span className={`${styles.sentBadge} ${className || ''}`}>
        <Check size={14} /> Đã gửi lời mời
      </span>
    );
  }

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handleInvite}
      disabled={status === 'loading'}
      className={className}
    >
      {status === 'loading' ? <Loader2 size={14} className={styles.spin} /> : <UserPlus size={14} />}
      Mời ứng tuyển
    </Button>
  );
}
