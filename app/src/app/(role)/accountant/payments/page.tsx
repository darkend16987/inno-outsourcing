'use client';

import React, { useState, useEffect } from 'react';
import { Search, Download, FileText, Loader2, Inbox } from 'lucide-react';
import { Card, Badge, Button } from '@/components/ui';
import { getAllPayments, updatePayment } from '@/lib/firebase/firestore';
import { useAuth } from '@/lib/firebase/auth-context';
import { cache } from '@/lib/cache/swr-cache';
import type { Payment } from '@/types';
import styles from './page.module.css';

const formatCurrency = (amount: number) => `${amount.toLocaleString('vi-VN')}₫`;

const formatDate = (d: unknown): string => {
  if (!d) return '-';
  if (typeof d === 'object' && d !== null && 'toDate' in d) return (d as { toDate: () => Date }).toDate().toLocaleDateString('vi-VN');
  if (d instanceof Date) return d.toLocaleDateString('vi-VN');
  return String(d);
};

export default function AccountantPaymentsPage() {
  const { userProfile } = useAuth();
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handlePay = async (pay: Payment) => {
    if (!userProfile) return;
    if (!confirm(`Xác nhận chi ${pay.amount.toLocaleString('vi-VN')}₫ cho ${pay.workerName}?`)) return;
    setActionLoading(pay.id);
    try {
      await updatePayment(pay.id, { status: 'paid' }, { uid: userProfile.uid, name: userProfile.displayName, role: userProfile.role });
      setPayments(prev => prev.map(p => p.id === pay.id ? { ...p, status: 'paid' as const } : p));
      cache.invalidate('acct:paid');
      cache.invalidate('acct:pending');
      alert('✅ Đã xác nhận chi tiền thành công!');
    } catch (err) {
      console.error('Pay failed:', err);
      alert('❌ Lỗi. Vui lòng thử lại.');
    }
    setActionLoading(null);
  };

  useEffect(() => {
    const fetchPayments = async () => {
      const result = await getAllPayments({}, 100);
      setPayments(result.items);
      setLoading(false);
    };
    fetchPayments().catch(() => setLoading(false));
  }, []);

  const filteredPayments = payments.filter(p => {
    const matchFilter = filter === 'all' || p.status === filter;
    const matchSearch = !search || p.reason.toLowerCase().includes(search.toLowerCase()) || p.workerName.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

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
          <h1 className={styles.title}>Quản lý Thanh toán</h1>
          <p className={styles.subtitle}>Ghi nhận và tra cứu lịch sử luân chuyển dòng tiền kỹ thuật.</p>
        </div>
        <Button variant="outline" onClick={() => alert('🚧 Tính năng xuất Excel đang được phát triển.')}><Download size={16}/> Xuất Excel</Button>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <Search size={16} />
          <input type="text" placeholder="Mã giao dịch, dự án, người nhận..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className={styles.filters}>
          <button className={`${styles.filterBtn} ${filter === 'all' ? styles.active : ''}`} onClick={() => setFilter('all')}>Tất cả</button>
          <button className={`${styles.filterBtn} ${filter === 'pending' ? styles.active : ''}`} onClick={() => setFilter('pending')}>Chưa chi</button>
          <button className={`${styles.filterBtn} ${filter === 'paid' ? styles.active : ''}`} onClick={() => setFilter('paid')}>Đã chi</button>
          <button className={`${styles.filterBtn} ${filter === 'cancelled' ? styles.active : ''}`} onClick={() => setFilter('cancelled')}>Đã hủy</button>
        </div>
      </div>

      <Card className={styles.tableCard}>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Mã GD</th>
                <th>Lý do & Hạng mục</th>
                <th>Người nhận</th>
                <th>Số tiền</th>
                <th>Cập nhật lúc</th>
                <th>Trạng thái</th>
                <th className={styles.tAction}>Hồ sơ</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.map(pay => (
                <tr key={pay.id}>
                  <td className={styles.tId}>#{pay.id.slice(0, 8).toUpperCase()}</td>
                  <td>
                    <div className={styles.pJob}>{pay.reason}</div>
                  </td>
                  <td className={styles.pPayee}>{pay.workerName}</td>
                  <td className={styles.pAmount}>{formatCurrency(pay.amount)}</td>
                  <td className={styles.pDate}>{formatDate(pay.updatedAt || pay.createdAt)}</td>
                  <td>
                    {pay.status === 'paid' && <Badge variant="success" size="sm">Đã chuyển khoản</Badge>}
                    {pay.status === 'pending' && <Badge variant="warning" size="sm">Chờ kế toán chi</Badge>}
                    {pay.status === 'approved' && <Badge variant="info" size="sm">Đã duyệt</Badge>}
                    {pay.status === 'cancelled' && <Badge variant="error" size="sm">Đã hủy</Badge>}
                  </td>
                  <td className={styles.tAction}>
                     {pay.status === 'pending' ? (
                        <Button size="sm" variant="primary" className={styles.payBtn} disabled={actionLoading === pay.id} onClick={() => handlePay(pay)}>{actionLoading === pay.id ? '...' : 'Chi tiền'}</Button>
                     ) : (
                        <button className={styles.iconBtn} title="Xem biên nhận" onClick={() => alert('🚧 Tính năng xem biên nhận đang được phát triển.')}><FileText size={16}/></button>
                     )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredPayments.length === 0 && (
            <div className={styles.empty}>
              <Inbox size={24} /> Không có dữ liệu thanh toán.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
