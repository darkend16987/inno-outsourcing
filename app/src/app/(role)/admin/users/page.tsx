'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Eye, UserX, UserCheck, Loader2, Inbox } from 'lucide-react';
import { Card, Badge, Avatar, Button } from '@/components/ui';
import { getUsers, updateUserProfile } from '@/lib/firebase/firestore';
import { useAuth } from '@/lib/firebase/auth-context';
import { cache } from '@/lib/cache/swr-cache';
import type { UserProfile } from '@/types';
import styles from './page.module.css';

const ROLE_LABELS: Record<string, string> = {
  freelancer: 'Freelancer',
  job_master: 'JobMaster',
  admin: 'Admin',
  accountant: 'Kế toán',
  super_admin: 'Super Admin',
};

export default function AdminUsersPage() {
  const router = useRouter();
  const { userProfile: currentUser } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchUsers = async () => {
    cache.invalidate('admin:users');
    const result = await getUsers({}, 50);
    setUsers(result.items);
    setLoading(false);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard data-fetch pattern
    fetchUsers().catch(() => setLoading(false));
  }, []);

  const handleToggleStatus = async (user: UserProfile, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser) return;
    const newStatus = user.status === 'suspended' ? 'active' : 'suspended';
    const action = newStatus === 'suspended' ? 'khóa' : 'mở khóa';
    if (!confirm(`Bạn có chắc muốn ${action} tài khoản "${user.displayName || user.email}"?`)) return;
    
    setActionLoading(user.uid);
    try {
      await updateUserProfile(user.uid, { status: newStatus });
      await fetchUsers();
    } catch (err) {
      console.error('Toggle status failed:', err);
      alert(`Không thể ${action} tài khoản. Vui lòng thử lại.`);
    }
    setActionLoading(null);
  };

  const filteredUsers = users.filter(u => {
    const matchSearch = !search || (u.displayName?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase()));
    const matchRole = !roleFilter || u.role === roleFilter;
    return matchSearch && matchRole;
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
          <h1 className={styles.title}>Quản lý Người dùng</h1>
          <p className={styles.subtitle}>Quản lý tài khoản và phân quyền toàn hệ thống. Tổng cộng {users.length} người dùng.</p>
        </div>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <Search size={16} />
          <input type="text" placeholder="Tìm theo tên, email..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className={styles.filters}>
          <button className={`${styles.filterBtn} ${!roleFilter ? styles.active : ''}`} onClick={() => setRoleFilter('')}>Tất cả</button>
          <button className={`${styles.filterBtn} ${roleFilter === 'freelancer' ? styles.active : ''}`} onClick={() => setRoleFilter('freelancer')}>Freelancer</button>
          <button className={`${styles.filterBtn} ${roleFilter === 'job_master' ? styles.active : ''}`} onClick={() => setRoleFilter('job_master')}>JobMaster</button>
          <button className={`${styles.filterBtn} ${roleFilter === 'admin' ? styles.active : ''}`} onClick={() => setRoleFilter('admin')}>Admin</button>
        </div>
      </div>

      <Card className={styles.tableCard}>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Người dùng</th>
                <th>Email</th>
                <th>Vai trò</th>
                <th>Level</th>
                <th>Trạng thái</th>
                <th className={styles.tAction}>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(user => (
                <tr
                  key={user.uid}
                  onClick={() => router.push(`/admin/users/${user.uid}`)}
                  style={{ cursor: 'pointer' }}
                  title="Nhấn để xem chi tiết"
                >
                  <td>
                    <div className={styles.userCell}>
                      <Avatar name={user.displayName || 'User'} level={(user.currentLevel || 'L1') as never} size="sm" />
                      <span>{user.displayName || 'Chưa cập nhật'}</span>
                    </div>
                  </td>
                  <td className={styles.cellEmail}>{user.email || '-'}</td>
                  <td><Badge variant="outline" size="sm">{ROLE_LABELS[user.role] || user.role}</Badge></td>
                  <td>{user.currentLevel || 'L1'}</td>
                  <td>
                    {user.status === 'suspended'
                      ? <Badge variant="error" size="sm">Khóa</Badge>
                      : <Badge variant="success" size="sm">Hoạt động</Badge>
                    }
                  </td>
                  <td className={styles.tAction}>
                    <div className={styles.actionGroup}>
                      <Button
                        size="sm"
                        variant="ghost"
                        title="Xem chi tiết"
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          router.push(`/admin/users/${user.uid}`);
                        }}
                      >
                        <Eye size={14} />
                      </Button>
                      <Button
                        size="sm"
                        variant={user.status === 'suspended' ? 'success' : 'danger'}
                        title={user.status === 'suspended' ? 'Mở khóa' : 'Khóa tài khoản'}
                        onClick={(e: React.MouseEvent) => handleToggleStatus(user, e)}
                        disabled={actionLoading === user.uid}
                      >
                        {user.status === 'suspended' ? <UserCheck size={14} /> : <UserX size={14} />}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredUsers.length === 0 && (
            <div className={styles.empty}><Inbox size={24}/> Không tìm thấy người dùng nào.</div>
          )}
        </div>
      </Card>
    </div>
  );
}
