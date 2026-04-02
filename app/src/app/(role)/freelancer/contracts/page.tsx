'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileSignature, Download, Search, FileText, Loader2, Inbox } from 'lucide-react';
import { Card, Badge, Button } from '@/components/ui';
import { useAuth } from '@/lib/firebase/auth-context';
import { getContractsForFreelancer } from '@/lib/firebase/firestore';
import type { Contract } from '@/types';
import styles from './page.module.css';

const STATUS_MAP: Record<string, { label: string, color: string }> = {
  active: { label: 'Đang hiệu lực', color: 'success' },
  completed: { label: 'Đã thanh lý', color: 'default' },
  pending_signature: { label: 'Chờ ký', color: 'warning' },
  draft: { label: 'Nháp', color: 'default' },
  terminated: { label: 'Đã hủy', color: 'error' },
};

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.05, duration: 0.3 } }),
};

const formatDate = (d: unknown): string => {
  if (!d) return '-';
  if (typeof d === 'object' && d !== null && 'toDate' in d) return (d as { toDate: () => Date }).toDate().toLocaleDateString('vi-VN');
  if (d instanceof Date) return d.toLocaleDateString('vi-VN');
  return String(d);
};

const formatCurrency = (amount: number) => `${amount.toLocaleString('vi-VN')}₫`;

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
            <Card className={styles.contractCard}>
              <div className={styles.iconBox}>
                <FileText size={24} />
              </div>

              <div className={styles.cMain}>
                <div className={styles.cHeader}>
                  <h3 className={styles.cNumber}>{contract.contractNumber}</h3>
                  {/* @ts-ignore */}
                  <Badge variant={STATUS_MAP[contract.status]?.color || 'default'} size="sm">{STATUS_MAP[contract.status]?.label || contract.status}</Badge>
                </div>
                <div className={styles.cJob}>{contract.jobTitle}</div>
                <div className={styles.cMeta}>
                  <span>Ngày ký: {formatDate(contract.signedByWorkerAt || contract.createdAt)}</span>
                  <span className={styles.sep}>•</span>
                  <span>Giá trị: <strong>{formatCurrency(contract.totalValue)}</strong></span>
                </div>
              </div>

              <div className={styles.cActions}>
                {contract.status === 'pending_signature' ? (
                  <Button size="sm"><FileSignature size={14}/> Ký hợp đồng</Button>
                ) : (
                  <Button variant="outline" size="sm"><Download size={14}/> Tải PDF</Button>
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
