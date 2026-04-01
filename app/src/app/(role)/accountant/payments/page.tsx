'use client';

import React, { useState } from 'react';
import { Search, Download, Filter, FileText } from 'lucide-react';
import { Card, Badge, Button } from '@/components/ui';
import styles from './page.module.css';

const MOCK_PAYMENTS = [
  { id: 'pay1', job: 'BIM Modeling tổ hợp văn phòng 12 tầng Q7', payee: 'Nguyễn Văn A', amount: '24,000,000₫', date: '01/04/2026', type: 'Tạm ứng', status: 'pending' },
  { id: 'pay2', job: 'Thiết kế kiến trúc Nhà xưởng KCN Bình Dương', payee: 'Lê Thị C', amount: '42,000,000₫', date: '28/03/2026', type: 'Giai đoạn 2', status: 'completed' },
  { id: 'pay3', job: 'Dự toán công trình trường học TPHCM', payee: 'Trần B', amount: '12,500,000₫', date: '25/03/2026', type: 'Tất toán', status: 'completed' },
  { id: 'pay4', job: 'Thiết kế hệ thống MEP Khách sạn', payee: 'Phạm D', amount: '18,000,000₫', date: '02/04/2026', type: 'Giai đoạn 1', status: 'failed' },
];

export default function AccountantPaymentsPage() {
  const [filter, setFilter] = useState('all');

  const filteredPayments = MOCK_PAYMENTS.filter(p => filter === 'all' || p.status === filter);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Quản lý Thanh toán</h1>
          <p className={styles.subtitle}>Ghi nhận và tra cứu lịch sử luân chuyển dòng tiền kỹ thuật.</p>
        </div>
        <Button variant="outline"><Download size={16}/> Xuất Excel</Button>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <Search size={16} />
          <input type="text" placeholder="Mã giao dịch, dự án, người nhận..." />
        </div>
        <div className={styles.filters}>
          <button className={`${styles.filterBtn} ${filter === 'all' ? styles.active : ''}`} onClick={() => setFilter('all')}>Tất cả</button>
          <button className={`${styles.filterBtn} ${filter === 'pending' ? styles.active : ''}`} onClick={() => setFilter('pending')}>Chưa chi</button>
          <button className={`${styles.filterBtn} ${filter === 'completed' ? styles.active : ''}`} onClick={() => setFilter('completed')}>Đã chi</button>
          <button className={`${styles.filterBtn} ${filter === 'failed' ? styles.active : ''}`} onClick={() => setFilter('failed')}>Lỗi đối soát</button>
        </div>
      </div>

      <Card className={styles.tableCard}>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Mã GD</th>
                <th>Dự án & Hạng mục</th>
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
                  <td className={styles.tId}>#{pay.id.toUpperCase()}</td>
                  <td>
                    <div className={styles.pJob}>{pay.job}</div>
                    <div className={styles.pType}>{pay.type}</div>
                  </td>
                  <td className={styles.pPayee}>{pay.payee}</td>
                  <td className={styles.pAmount}>{pay.amount}</td>
                  <td className={styles.pDate}>{pay.date}</td>
                  <td>
                    {pay.status === 'completed' && <Badge variant="success" size="sm">Đã chuyển khoản</Badge>}
                    {pay.status === 'pending' && <Badge variant="warning" size="sm">Chờ kế toán chi</Badge>}
                    {pay.status === 'failed' && <Badge variant="error" size="sm">Lỗi thông tin</Badge>}
                  </td>
                  <td className={styles.tAction}>
                     {pay.status === 'pending' ? (
                        <Button size="sm" variant="primary" className={styles.payBtn}>Chi tiền</Button>
                     ) : (
                        <button className={styles.iconBtn} title="Xem biên nhận"><FileText size={16}/></button>
                     )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredPayments.length === 0 && (
            <div className={styles.empty}>Không có dữ liệu thanh toán.</div>
          )}
        </div>
      </Card>
    </div>
  );
}
