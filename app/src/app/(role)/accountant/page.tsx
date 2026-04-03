'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { DollarSign, Wallet, AlertCircle, ArrowRight, Loader2 } from 'lucide-react';
import { Card, MetricCard, Badge, Button } from '@/components/ui';
import { getAllPayments, updatePayment } from '@/lib/firebase/firestore';
import { onPaymentConfirmed } from '@/lib/firebase/firestore-extended';
import { useAuth } from '@/lib/firebase/auth-context';
import { cache, TTL } from '@/lib/cache/swr-cache';
import type { Payment } from '@/types';
import styles from './page.module.css';

const formatCurrency = (amount: number) => {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M ₫`;
  return `${amount.toLocaleString('vi-VN')}₫`;
};

export default function AccountantDashboard() {
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [pendingPayments, setPendingPayments] = useState<Payment[]>([]);
  const [totalPaid, setTotalPaid] = useState(0);
  const [totalPending, setTotalPending] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      const [paidResult, pendingResult] = await Promise.all([
        cache.get('acct:paid', () => getAllPayments({ status: 'paid' }, 100), TTL.MEDIUM),
        cache.get('acct:pending', () => getAllPayments({ status: 'pending' }, 100), TTL.MEDIUM),
      ]);
      setTotalPaid(paidResult.items.reduce((sum, p) => sum + p.amount, 0));
      setTotalPending(pendingResult.items.reduce((sum, p) => sum + p.amount, 0));
      setPendingPayments(pendingResult.items.slice(0, 5));
      setLoading(false);
    };
    fetchData().catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className={styles.dashboard}>
        <div className={styles.loadingWrap}><Loader2 size={24} className={styles.spinner} /> Đang tải thống kê...</div>
      </div>
    );
  }

  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Accountant Dashboard</h1>
          <p className={styles.subtitle}>Quản lý thanh toán, công nợ và hợp đồng.</p>
        </div>
        <Button onClick={() => alert('🚧 Tính năng xuất báo cáo đang được phát triển. Vui lòng liên hệ IT.')}>Xuất báo cáo</Button>
      </div>

      <div className={styles.metricsGrid}>
        <MetricCard
          label="Đã thanh toán (Tổng)"
          value={formatCurrency(totalPaid)}
          icon={<Wallet size={20} />}
        />
        <MetricCard
          label="Chờ thanh toán"
          value={formatCurrency(totalPending)}
          icon={<DollarSign size={20} />}
          trend={pendingPayments.length > 0 ? 'down' : undefined}
          trendValue={`${pendingPayments.length} khoản cần duyệt`}
        />
      </div>

      <div className={styles.bottomGrid}>
        <Card className={styles.sectionCard}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>Lệnh thanh toán cần xử lý</h3>
          </div>
          <div className={styles.payList}>
            {pendingPayments.length > 0 ? pendingPayments.map(pay => (
              <div key={pay.id} className={styles.payItem}>
                <div className={styles.pInfo}>
                  <div className={styles.pHeader}>
                    <h4>{pay.reason}</h4>
                    <Badge variant="warning">Chờ CK</Badge>
                  </div>
                  <div className={styles.pMeta}>
                    <span>Người nhận: {pay.workerName}</span>
                    <span className={styles.pAmount}>{formatCurrency(pay.amount)}</span>
                  </div>
                </div>
                <Button size="sm" disabled={actionLoading === pay.id} onClick={async () => {
                  if (!userProfile) return;
                  if (!confirm(`Xác nhận đã chuyển khoản ${formatCurrency(pay.amount)} cho ${pay.workerName}?`)) return;
                  setActionLoading(pay.id);
                  try {
                    await updatePayment(pay.id, { status: 'paid' }, { uid: userProfile.uid, name: userProfile.displayName, role: userProfile.role });
                    // Also update job milestone status + check if job should be 'paid'
                    if (pay.jobId && pay.milestoneId) {
                      try {
                        await onPaymentConfirmed({
                          paymentId: pay.id,
                          jobId: pay.jobId,
                          milestoneId: pay.milestoneId,
                          workerId: pay.workerId,
                          workerName: pay.workerName || 'Freelancer',
                          jobMasterId: (pay as unknown as Record<string, unknown>).approvedByJobMaster as string || '',
                          accountantId: userProfile.uid,
                          accountantName: userProfile.displayName || 'Kế toán',
                          amount: pay.amount,
                        });
                      } catch (e) { console.warn('onPaymentConfirmed side-effect failed:', e); }
                    }
                    setPendingPayments(prev => prev.filter(p => p.id !== pay.id));
                    setTotalPending(prev => prev - pay.amount);
                    setTotalPaid(prev => prev + pay.amount);
                    cache.invalidate('acct:paid');
                    cache.invalidate('acct:pending');
                    alert('✅ Đã xác nhận chuyển khoản thành công!');
                  } catch (err) {
                    console.error('Confirm payment failed:', err);
                    alert('❌ Lỗi. Vui lòng thử lại.');
                  }
                  setActionLoading(null);
                }}>{actionLoading === pay.id ? 'Đang xử lý...' : 'Xác nhận đã CK'}</Button>
              </div>
            )) : (
              <div className={styles.emptySmall}>Không có lệnh thanh toán nào cần xử lý.</div>
            )}
          </div>
          <Link href="/accountant/payments" style={{ display: 'block' }}>
            <Button fullWidth variant="ghost" className={styles.viewMoreBtn}>
              Xem tất cả thanh toán <ArrowRight size={14} />
            </Button>
          </Link>
        </Card>

        <Card className={styles.sectionCard}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>Vấn đề chứng từ</h3>
          </div>
          <div className={styles.issueList}>
             <div className={styles.issueItem}>
              <AlertCircle size={20} className={styles.warnIcon} />
              <div className={styles.issueContent}>
                <h4>Hệ thống hoạt động bình thường</h4>
                <p>Tất cả chứng từ đã được cập nhật.</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
