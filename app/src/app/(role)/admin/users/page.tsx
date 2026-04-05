'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Eye, UserX, UserCheck, Loader2, Inbox, UserPlus, X, AlertTriangle, CheckCircle } from 'lucide-react';
import { Card, Badge, Avatar, Button } from '@/components/ui';
import { getUsers, updateUserProfile } from '@/lib/firebase/firestore';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/lib/firebase/auth-context';
import { cache } from '@/lib/cache/swr-cache';
import type { UserProfile, UserRole } from '@/types';
import styles from './page.module.css';

const ROLE_LABELS: Record<string, string> = {
  freelancer: 'Freelancer',
  jobmaster: 'JobMaster',
  admin: 'Admin',
  accountant: 'Kế toán',
};

export default function AdminUsersPage() {
  const router = useRouter();
  const { userProfile: currentUser } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Create User Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ email: '', password: '', displayName: '', phone: '', role: 'freelancer' as UserRole });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const fetchUsers = async () => {
    cache.invalidate('admin:users');
    const result = await getUsers({}, 50);
    setUsers(result.items);
    setLoading(false);
  };

  useEffect(() => {
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

  // ===== Create User Handler =====
  const handleCreateUser = async () => {
    setCreateError(null);
    setCreateSuccess(null);

    // Validation
    if (!createForm.email.trim() || !createForm.password || !createForm.displayName.trim()) {
      setCreateError('Vui lòng điền đầy đủ Email, Mật khẩu và Họ tên.');
      return;
    }
    if (createForm.password.length < 6) {
      setCreateError('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(createForm.email)) {
      setCreateError('Email không hợp lệ.');
      return;
    }

    setCreateLoading(true);
    try {
      // Use Firebase Auth REST API to create user without signing out current admin
      const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
      const signUpRes = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: createForm.email.trim(),
            password: createForm.password,
            displayName: createForm.displayName.trim(),
            returnSecureToken: false,
          }),
        }
      );

      if (!signUpRes.ok) {
        const errData = await signUpRes.json();
        const errMsg = errData?.error?.message || 'Unknown error';
        const friendlyMsgs: Record<string, string> = {
          EMAIL_EXISTS: 'Email này đã được sử dụng.',
          INVALID_EMAIL: 'Email không hợp lệ.',
          WEAK_PASSWORD: 'Mật khẩu quá yếu (tối thiểu 6 ký tự).',
          OPERATION_NOT_ALLOWED: 'Đăng ký bằng email/password chưa được bật.',
        };
        throw new Error(friendlyMsgs[errMsg] || `Lỗi Firebase: ${errMsg}`);
      }

      const newUserData = await signUpRes.json();
      const newUid = newUserData.localId;

      // 3. Create Firestore user profile document
      const profileData: Record<string, unknown> = {
        uid: newUid,
        email: createForm.email.trim(),
        displayName: createForm.displayName.trim(),
        photoURL: '',
        phone: createForm.phone.trim() || '',
        role: createForm.role,
        status: 'active',
        specialties: [],
        experience: 0,
        software: [],
        selfAssessedLevel: 'L1',
        currentLevel: 'L1',
        bio: '',
        kycCompleted: false,
        idNumber: '',
        idIssuedDate: '',
        idIssuedPlace: '',
        address: '',
        bankAccountNumber: '',
        bankName: '',
        bankBranch: '',
        taxId: '',
        stats: {
          completedJobs: 0,
          totalEarnings: 0,
          avgRating: 0,
          ratingCount: 0,
          onTimeRate: 0,
          currentMonthEarnings: 0,
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(doc(db, 'users', newUid), profileData);

      setCreateSuccess(`Tạo thành công tài khoản "${createForm.displayName.trim()}" (${ROLE_LABELS[createForm.role]}).`);
      setCreateForm({ email: '', password: '', displayName: '', phone: '', role: 'freelancer' });

      // Refresh user list
      await fetchUsers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi không xác định';
      setCreateError(msg);
    }
    setCreateLoading(false);
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
        <Button variant="primary" icon={<UserPlus size={16} />} onClick={() => { setShowCreateModal(true); setCreateError(null); setCreateSuccess(null); }}>Tạo tài khoản</Button>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <Search size={16} />
          <input type="text" placeholder="Tìm theo tên, email..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className={styles.filters}>
          <button className={`${styles.filterBtn} ${!roleFilter ? styles.active : ''}`} onClick={() => setRoleFilter('')}>Tất cả</button>
          <button className={`${styles.filterBtn} ${roleFilter === 'freelancer' ? styles.active : ''}`} onClick={() => setRoleFilter('freelancer')}>Freelancer</button>
          <button className={`${styles.filterBtn} ${roleFilter === 'jobmaster' ? styles.active : ''}`} onClick={() => setRoleFilter('jobmaster')}>JobMaster</button>
          <button className={`${styles.filterBtn} ${roleFilter === 'admin' ? styles.active : ''}`} onClick={() => setRoleFilter('admin')}>Admin</button>
          <button className={`${styles.filterBtn} ${roleFilter === 'accountant' ? styles.active : ''}`} onClick={() => setRoleFilter('accountant')}>Kế toán</button>
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

      {/* ===== Create User Modal ===== */}
      {showCreateModal && (
        <div className={styles.modalOverlay} onClick={(e) => { if (e.target === e.currentTarget) setShowCreateModal(false); }}>
          <div className={styles.modal} ref={modalRef}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}><UserPlus size={20} /> Tạo tài khoản mới</h2>
              <button className={styles.modalClose} onClick={() => setShowCreateModal(false)}><X size={18} /></button>
            </div>

            {createError && (
              <div className={styles.alertError}><AlertTriangle size={16} /> {createError}</div>
            )}
            {createSuccess && (
              <div className={styles.alertSuccess}><CheckCircle size={16} /> {createSuccess}</div>
            )}

            <div className={styles.modalBody}>
              <div className={styles.formGrid}>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Họ tên <span className={styles.req}>*</span></label>
                  <input
                    className={styles.formInput}
                    type="text"
                    placeholder="Nguyễn Văn A"
                    value={createForm.displayName}
                    onChange={e => setCreateForm(f => ({ ...f, displayName: e.target.value }))}
                  />
                </div>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Email <span className={styles.req}>*</span></label>
                  <input
                    className={styles.formInput}
                    type="email"
                    placeholder="example@innojsc.com"
                    value={createForm.email}
                    onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))}
                  />
                </div>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Mật khẩu <span className={styles.req}>*</span></label>
                  <input
                    className={styles.formInput}
                    type="password"
                    placeholder="Tối thiểu 6 ký tự"
                    value={createForm.password}
                    onChange={e => setCreateForm(f => ({ ...f, password: e.target.value }))}
                  />
                </div>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Số điện thoại</label>
                  <input
                    className={styles.formInput}
                    type="tel"
                    placeholder="0912 345 678"
                    value={createForm.phone}
                    onChange={e => setCreateForm(f => ({ ...f, phone: e.target.value }))}
                  />
                </div>
                <div className={`${styles.formField} ${styles.fullWidth}`}>
                  <label className={styles.formLabel}>Vai trò <span className={styles.req}>*</span></label>
                  <div className={styles.roleGrid}>
                    {([['freelancer', 'Freelancer', '🎨'], ['jobmaster', 'JobMaster', '📋'], ['accountant', 'Kế toán', '💰'], ['admin', 'Admin', '🔧']] as [UserRole, string, string][]).map(([val, label, icon]) => (
                      <button
                        key={val}
                        type="button"
                        className={`${styles.roleOption} ${createForm.role === val ? styles.roleActive : ''}`}
                        onClick={() => setCreateForm(f => ({ ...f, role: val }))}
                      >
                        <span className={styles.roleIcon}>{icon}</span>
                        <span>{label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <Button variant="ghost" onClick={() => setShowCreateModal(false)} disabled={createLoading}>Hủy</Button>
              <Button variant="primary" icon={<UserPlus size={16} />} onClick={handleCreateUser} disabled={createLoading}>
                {createLoading ? 'Đang tạo...' : 'Tạo tài khoản'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
