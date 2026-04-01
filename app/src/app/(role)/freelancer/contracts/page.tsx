'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FileSignature, Download, Search, FileText } from 'lucide-react';
import { Card, Badge, Button } from '@/components/ui';
import styles from './page.module.css';

const MOCK_CONTRACTS = [
  { id: 'c1', number: 'HD2604-01-TKKT', jobTitle: 'Thiết kế kiến trúc Nhà xưởng KCN Bình Dương', status: 'active', signedAt: '12/04/2026', value: '48,000,000₫' },
  { id: 'c2', number: 'HD2603-12-BIM', jobTitle: 'BIM Modeling tổ hợp văn phòng 12 tầng Q7', status: 'completed', signedAt: '01/03/2026', value: '65,000,000₫' },
  { id: 'c3', number: 'HD2605-08-DT', jobTitle: 'Dự toán công trình trường học TPHCM', status: 'pending_signature', signedAt: '-', value: '25,000,000₫' },
];

const STATUS_MAP: Record<string, { label: string, color: string }> = {
  active: { label: 'Đang hiệu lực', color: 'success' },
  completed: { label: 'Đã thanh lý', color: 'default' },
  pending_signature: { label: 'Chờ ký', color: 'warning' },
};

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.05, duration: 0.3 } }),
};

export default function ContractsPage() {
  const [search, setSearch] = useState('');

  const filtered = MOCK_CONTRACTS.filter(c => 
    c.number.toLowerCase().includes(search.toLowerCase()) || 
    c.jobTitle.toLowerCase().includes(search.toLowerCase())
  );

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
                  <h3 className={styles.cNumber}>{contract.number}</h3>
                  {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
                  {/* @ts-ignore */}
                  <Badge variant={STATUS_MAP[contract.status].color} size="sm">{STATUS_MAP[contract.status].label}</Badge>
                </div>
                <div className={styles.cJob}>{contract.jobTitle}</div>
                <div className={styles.cMeta}>
                  <span>Ngày ký: {contract.signedAt}</span>
                  <span className={styles.sep}>•</span>
                  <span>Giá trị: <strong>{contract.value}</strong></span>
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
            <p>Không tìm thấy hợp đồng nào phù hợp.</p>
          </div>
        )}
      </div>
    </div>
  );
}
