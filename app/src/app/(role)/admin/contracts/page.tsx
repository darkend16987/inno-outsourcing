'use client';

import React, { useState, useEffect } from 'react';
import { Search, Download, ShieldCheck, Clock, CheckCircle, Loader2, Inbox } from 'lucide-react';
import { Card, Badge, Button, Avatar } from '@/components/ui';
import { getAllContracts } from '@/lib/firebase/firestore';
import { cache, TTL } from '@/lib/cache/swr-cache';
import type { Contract } from '@/types';
import styles from './page.module.css';

const formatDate = (d: unknown): string => {
  if (!d) return '-';
  if (typeof d === 'object' && d !== null && 'toDate' in d) return (d as { toDate: () => Date }).toDate().toLocaleDateString('vi-VN');
  if (d instanceof Date) return d.toLocaleDateString('vi-VN');
  return String(d);
};

const formatCurrency = (amount: number) => `${amount.toLocaleString('vi-VN')}₫`;

export default function AdminContractsPage() {
  const [filter, setFilter] = useState('all');
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchContracts = async () => {
      const result = await cache.get('admin:contracts', () => getAllContracts(50), TTL.MEDIUM);
      setContracts(result.items);
      setLoading(false);
    };
    fetchContracts().catch(() => setLoading(false));
  }, []);

  const filteredContracts = contracts.filter(c => filter === 'all' || c.status === filter);

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
          <h1 className={styles.title}>Quản lý Hợp đồng</h1>
          <p className={styles.subtitle}>Kho lưu trữ và theo dõi trạng thái pháp lý của toàn bộ HĐ điện tử.</p>
        </div>
        <div className={styles.actions}>
           <Button variant="outline"><Download size={16}/> Tải xuống tất cả</Button>
           <Button>Tạo mẫu Hợp đồng mới</Button>
        </div>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <Search size={16} />
          <input type="text" placeholder="Số HĐ, tên dự án, Freelancer..." />
        </div>
        <div className={styles.filters}>
          <button className={`${styles.filterBtn} ${filter === 'all' ? styles.active : ''}`} onClick={() => setFilter('all')}>Tất cả</button>
          <button className={`${styles.filterBtn} ${filter === 'pending_signature' ? styles.active : ''}`} onClick={() => setFilter('pending_signature')}>Chờ ký</button>
          <button className={`${styles.filterBtn} ${filter === 'active' ? styles.active : ''}`} onClick={() => setFilter('active')}>Đang hiệu lực</button>
          <button className={`${styles.filterBtn} ${filter === 'completed' ? styles.active : ''}`} onClick={() => setFilter('completed')}>Đã thanh lý</button>
        </div>
      </div>

      <Card className={styles.tableCard}>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Số HĐ</th>
                <th>Dự án</th>
                <th>Freelancer</th>
                <th>Thời gian lập</th>
                <th>Ngân sách ký kết</th>
                <th>Trạng thái</th>
                <th className={styles.tAction}>File</th>
              </tr>
            </thead>
            <tbody>
              {filteredContracts.map(c => (
                <tr key={c.id}>
                  <td className={styles.tId}>{c.contractNumber}</td>
                  <td className={styles.cJob}>{c.jobTitle}</td>
                  <td>
                    <div className={styles.cUser}>
                      <Avatar name={c.partyB?.name || 'User'} level="L1" size="sm"/>
                      <span>{c.partyB?.name || '-'}</span>
                    </div>
                  </td>
                  <td className={styles.cDate}>{formatDate(c.createdAt)}</td>
                  <td className={styles.cVal}>{formatCurrency(c.totalValue)}</td>
                  <td>
                    {c.status === 'active' && <Badge variant="success" size="sm"><ShieldCheck size={12}/> Đang hiệu lực</Badge>}
                    {c.status === 'pending_signature' && <Badge variant="warning" size="sm"><Clock size={12}/> Chờ ký</Badge>}
                    {c.status === 'completed' && <Badge variant="default" size="sm"><CheckCircle size={12}/> Đã thanh lý</Badge>}
                    {c.status === 'draft' && <Badge variant="default" size="sm">Nháp</Badge>}
                  </td>
                  <td className={styles.tAction}>
                     <div className={styles.fileActions}>
                        <button className={styles.urlBtn}>Xem PDF</button>
                     </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredContracts.length === 0 && (
            <div className={styles.empty}><Inbox size={24}/> Không có hợp đồng nào.</div>
          )}
        </div>
      </Card>
    </div>
  );
}
