'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { FileSignature, Download, Search, FileText, Loader2, Inbox, AlertTriangle, Clock } from 'lucide-react';
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

function DeadlineBadge({ deadline }: { deadline: unknown }) {
  const d = toDate(deadline);
  if (!d) return null;
  const daysLeft = Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
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
                  {/* @ts-ignore */}
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
                {contract.status === 'pending_signature' ? (
                  <Link href={`/freelancer/contracts/${contract.id}/sign`}>
                    <Button size="sm"><FileSignature size={14} /> Ký hợp đồng</Button>
                  </Link>
                ) : (
                  contract.pdfURL || contract.signedPdfURL ? (
                    <a href={contract.signedPdfURL || contract.pdfURL} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm"><Download size={14} /> Tải PDF</Button>
                    </a>
                  ) : (
                    <Button variant="outline" size="sm" disabled><Download size={14} /> PDF chưa có</Button>
                  )
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
    </div>
  );
}
