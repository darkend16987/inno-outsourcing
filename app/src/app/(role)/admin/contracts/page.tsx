'use client';

import React, { useState } from 'react';
import { Search, Download, ShieldCheck, Clock, CheckCircle } from 'lucide-react';
import { Card, Badge, Button, Avatar } from '@/components/ui';
import styles from './page.module.css';

const MOCK_CONTRACTS = [
  { id: 'HD-26-001', job: 'BIM Modeling tổ hợp văn phòng 12 tầng Q7', freelancer: 'Nguyễn Văn A', value: '120,000,000₫', date: '12/03/2026', status: 'signed' },
  { id: 'HD-26-002', job: 'Thiết kế kiến trúc Nhà xưởng KCN Bình Dương', freelancer: 'Lê Thị C', value: '45,000,000₫', date: '28/03/2026', status: 'pending' },
  { id: 'HD-26-003', job: 'Dự toán công trình trường học TPHCM', freelancer: 'Trần B', value: '25,000,000₫', date: '10/01/2026', status: 'completed' },
];

export default function AdminContractsPage() {
  const [filter, setFilter] = useState('all');

  const filteredContracts = MOCK_CONTRACTS.filter(c => filter === 'all' || c.status === filter);

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
          <button className={`${styles.filterBtn} ${filter === 'pending' ? styles.active : ''}`} onClick={() => setFilter('pending')}>Chờ ký</button>
          <button className={`${styles.filterBtn} ${filter === 'signed' ? styles.active : ''}`} onClick={() => setFilter('signed')}>Đã ký (Đang chạy)</button>
          <button className={`${styles.filterBtn} ${filter === 'completed' ? styles.active : ''}`} onClick={() => setFilter('completed')}>Đã kết thúc</button>
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
                  <td className={styles.tId}>{c.id}</td>
                  <td className={styles.cJob}>{c.job}</td>
                  <td>
                    <div className={styles.cUser}>
                      {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
                      {/* @ts-ignore */}
                      <Avatar name={c.freelancer} level="L0" size="sm"/>
                      <span>{c.freelancer}</span>
                    </div>
                  </td>
                  <td className={styles.cDate}>{c.date}</td>
                  <td className={styles.cVal}>{c.value}</td>
                  <td>
                    {c.status === 'signed' && <Badge variant="success" size="sm"><ShieldCheck size={12}/> Đang hiệu lực</Badge>}
                    {c.status === 'pending' && <Badge variant="warning" size="sm"><Clock size={12}/> Chờ ký</Badge>}
                    {c.status === 'completed' && <Badge variant="default" size="sm"><CheckCircle size={12}/> Đã thanh lý</Badge>}
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
            <div className={styles.empty}>Không có hợp đồng nào.</div>
          )}
        </div>
      </Card>
    </div>
  );
}
