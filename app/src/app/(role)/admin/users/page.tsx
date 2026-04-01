'use client';

import React, { useState } from 'react';
import { Search, MoreVertical, Edit2, ShieldAlert } from 'lucide-react';
import { Card, Badge, Avatar, Button } from '@/components/ui';
import styles from './page.module.css';

const MOCK_USERS = [
  { id: 'u1', name: 'Nguyễn Văn A', email: 'vana@example.com', role: 'freelancer', level: 'L3', joined: '12/03/2026', status: 'kyc_verified' },
  { id: 'u2', name: 'Trần Thị B', email: 'b.tran@example.com', role: 'freelancer', level: 'L1', joined: '02/04/2026', status: 'kyc_pending' },
  { id: 'u3', name: 'Lê Văn C', email: 'levanc@company.com', role: 'jobmaster', level: 'L5', joined: '01/01/2026', status: 'kyc_verified' },
  { id: 'u4', name: 'Phạm D', email: 'phamd@company.com', role: 'accountant', level: 'L2', joined: '15/02/2026', status: 'kyc_verified' },
  { id: 'u5', name: 'Ngô E', email: 'ngoe@example.com', role: 'freelancer', level: 'L2', joined: '28/03/2026', status: 'banned' },
];

export default function UserManagementPage() {
  const [filter, setFilter] = useState('all');

  const filteredUsers = MOCK_USERS.filter(u => filter === 'all' || u.role === filter);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Quản lý Người dùng</h1>
          <p className={styles.subtitle}>Kiểm soát phân quyền, xác minh danh tính và hoạt động của tài khoản.</p>
        </div>
        <Button>Thêm quản trị viên</Button>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <Search size={16} />
          <input type="text" placeholder="Tìm theo tên, email, SDT..." />
        </div>
        <div className={styles.filters}>
          <button className={`${styles.filterBtn} ${filter === 'all' ? styles.active : ''}`} onClick={() => setFilter('all')}>Tất cả</button>
          <button className={`${styles.filterBtn} ${filter === 'freelancer' ? styles.active : ''}`} onClick={() => setFilter('freelancer')}>Freelancers</button>
          <button className={`${styles.filterBtn} ${filter === 'jobmaster' ? styles.active : ''}`} onClick={() => setFilter('jobmaster')}>Job Masters</button>
          <button className={`${styles.filterBtn} ${filter === 'accountant' ? styles.active : ''}`} onClick={() => setFilter('accountant')}>Kế toán</button>
        </div>
      </div>

      <Card className={styles.tableCard}>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Người dùng</th>
                <th>Phân quyền</th>
                <th>Cấp độ</th>
                <th>Trạng thái KYC</th>
                <th>Ngày tham gia</th>
                <th className={styles.tAction}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(user => (
                <tr key={user.id} className={user.status === 'banned' ? styles.trBanned : ''}>
                  <td>
                    <div className={styles.userInfo}>
                      {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
                      {/* @ts-ignore */}
                      <Avatar name={user.name} level={user.level} size="sm" />
                      <div>
                        <div className={styles.uName}>{user.name}</div>
                        <div className={styles.uEmail}>{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <Badge variant="outline" size="sm" className={styles.roleBadge}>{user.role}</Badge>
                  </td>
                  <td>
                    <span className={styles.tLevel}>{user.level}</span>
                  </td>
                  <td>
                    {user.status === 'kyc_verified' && <Badge variant="success" size="sm">Đã xác minh</Badge>}
                    {user.status === 'kyc_pending' && <Badge variant="warning" size="sm">Chờ duyệt</Badge>}
                    {user.status === 'banned' && <Badge variant="error" size="sm">Bị khóa</Badge>}
                  </td>
                  <td className={styles.tDate}>{user.joined}</td>
                  <td className={styles.tAction}>
                    <div className={styles.actionBtns}>
                      {user.status === 'kyc_pending' && (
                        <Button size="sm" variant="outline" className={styles.kycBtn}><ShieldAlert size={14}/> Duyệt KYC</Button>
                      )}
                      <button className={styles.iconBtn} title="Chỉnh sửa"><Edit2 size={16} /></button>
                      <button className={styles.iconBtn} title="Thêm"><MoreVertical size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredUsers.length === 0 && (
            <div className={styles.empty}>Không có dữ liệu người dùng.</div>
          )}
        </div>
      </Card>
    </div>
  );
}
