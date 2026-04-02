'use client';

import React, { useState, useEffect, Component } from 'react';
import { Card, Badge, Skeleton } from '@/components/ui';
import { formatFriendlyMoney } from '@/lib/formatters';
import styles from './page.module.css';
import { Trophy, Medal, Crown, TrendingUp, AlertCircle } from 'lucide-react';

// ─── Types (local, safe) ───
interface SafeEntry {
  uid: string;
  name: string;
  avatar?: string;
  level: string;
  specialty: string;
  earnings: number;
  rating: number;
  completedJobs: number;
  badges: string[];
}

// ─── Error Boundary ───
class LeaderboardErrorBoundary extends Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: Error) {
    console.error('LeaderboardErrorBoundary caught:', error);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className={styles.emptyState}>
          <AlertCircle size={48} className={styles.emptyIcon} />
          <p>Đã xảy ra lỗi khi hiển thị bảng vinh danh.</p>
          <button
            className={styles.pill}
            style={{ marginTop: 16 }}
            onClick={() => { this.setState({ hasError: false }); window.location.reload(); }}
          >
            Tải lại trang
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Safe data helpers ───
function safeStr(val: unknown, fallback = ''): string {
  if (typeof val === 'string' && val.trim()) return val;
  return fallback;
}
function safeNum(val: unknown, fallback = 0): number {
  const n = Number(val);
  return isNaN(n) ? fallback : n;
}
function safeInitials(name: string): string {
  if (!name || name.length === 0) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length > 1) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

// ─── Main Page ───
function LeaderboardContent() {
  const [period, setPeriod] = useState<string>('month');
  const [fieldFilter, setFieldFilter] = useState<string>('all');
  const [leaderboard, setLeaderboard] = useState<SafeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      setLoading(true);
      setError(false);
      try {
        // Dynamic import to avoid SSR issues
        const { getLeaderboard } = await import('@/lib/firebase/firestore');
        const raw = await getLeaderboard();
        if (cancelled) return;
        // Sanitize every entry to prevent render crashes
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const safe: SafeEntry[] = (Array.isArray(raw) ? raw : []).map((entry: any) => ({
          uid: safeStr(entry?.uid, Math.random().toString(36)),
          name: safeStr(entry?.name, 'Chưa cập nhật'),
          avatar: typeof entry?.avatar === 'string' ? entry.avatar : undefined,
          level: safeStr(entry?.level, 'L1'),
          specialty: safeStr(entry?.specialty, 'Chưa chọn'),
          earnings: safeNum(entry?.earnings),
          rating: safeNum(entry?.rating),
          completedJobs: safeNum(entry?.completedJobs),
          badges: Array.isArray(entry?.badges) ? entry.badges.filter((b: unknown) => typeof b === 'string') : [],
        }));
        setLeaderboard(safe);
      } catch (err) {
        console.error('Cannot load leaderboard:', err);
        if (!cancelled) setError(true);
      }
      if (!cancelled) setLoading(false);
    }
    loadData();
    return () => { cancelled = true; };
  }, [period]);

  const filtered = leaderboard.filter(entry =>
    fieldFilter === 'all' || entry.specialty === fieldFilter
  );

  const top3 = filtered.slice(0, 3);
  const tableData = filtered.slice(3);

  const TABS = [
    { id: 'month', label: 'Tháng này' },
    { id: 'quarter', label: 'Quý này' },
    { id: 'year', label: 'Năm nay' },
  ];

  const PILLS = ['Tất cả', 'Kiến trúc', 'Kết cấu', 'MEP', 'BIM', 'Dự toán', 'Giám sát', 'Thẩm tra'];

  return (
    <div className={styles.page}>
      <section className={styles.heroSection}>
        <div className={styles.container}>
          <div className={styles.heroGlow} />
          <h1 className={styles.title}>Bảng vinh danh</h1>
          <p className={styles.subtitle}>Tôn vinh các chuyên gia có thành tích xuất sắc nhất</p>

          <div className={styles.tabRow}>
            {TABS.map(tab => (
              <button
                key={tab.id}
                className={`${styles.tab} ${period === tab.id ? styles.active : ''}`}
                onClick={() => setPeriod(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className={styles.pills}>
            {PILLS.map(p => {
              const val = p === 'Tất cả' ? 'all' : p;
              return (
                <button
                  key={val}
                  className={`${styles.pill} ${fieldFilter === val ? styles.active : ''}`}
                  onClick={() => setFieldFilter(val)}
                >
                  {p}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className={styles.container}>
        {loading ? (
          <div className={styles.top3Grid}>
            {[1, 2, 3].map((rank) => (
              <Card key={rank} className={`${styles.topRank} ${styles[`rank${rank}`]}`} padding="xl">
                <Skeleton className={styles.skeletonAvatar} width={rank === 1 ? '100px' : '80px'} height={rank === 1 ? '100px' : '80px'} />
                <Skeleton className={styles.skeletonText} width="60%" />
                <Skeleton className={styles.skeletonText} width="40%" />
                <Skeleton className={styles.skeletonText} width="50%" height="32px" />
              </Card>
            ))}
          </div>
        ) : error ? (
          <div className={styles.emptyState}>
            <AlertCircle size={48} className={styles.emptyIcon} />
            <p>Không thể tải dữ liệu vinh danh</p>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Vui lòng thử lại sau.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className={styles.emptyState}>
            <TrendingUp size={48} className={styles.emptyIcon} />
            <h3 style={{ marginBottom: 8, fontFamily: 'var(--font-heading)' }}>Chưa có dữ liệu vinh danh</h3>
            <p>Hệ thống sẽ tự động cập nhật khi có chuyên gia hoàn thành dự án.</p>
          </div>
        ) : (
          <>
            <div className={styles.top3Grid}>
              {top3.map((user, idx) => {
                const rank = idx + 1;
                const initials = safeInitials(user.name);
                return (
                  <Card
                    key={user.uid}
                    className={`${styles.topRank} ${styles[`rank${rank}`]}`}
                    glow={rank === 1}
                    padding="xl"
                  >
                    <div className={styles.rankBadge}>
                      {rank === 1 ? <Crown size={20} /> : rank}
                    </div>

                    <div className={styles.medalIcon}>
                      {rank === 1 && <Trophy size={32} className={styles.gold} />}
                      {rank === 2 && <Medal size={28} className={styles.silver} />}
                      {rank === 3 && <Medal size={28} className={styles.bronze} />}
                    </div>

                    <div className={`${styles.avatar} ${rank === 1 ? styles.large : ''}`}>
                      {user.avatar
                        ? <img src={user.avatar} alt={user.name} />
                        : initials
                      }
                    </div>
                    <strong className={styles.name}>{user.name}</strong>
                    <div className={styles.meta}>
                      <span className={styles.level}>{user.level}</span> • <span className={styles.field}>{user.specialty}</span>
                    </div>
                    <strong className={styles.highlightAmount}>{formatFriendlyMoney(user.earnings)}</strong>

                    {user.badges.length > 0 && (
                      <div className={styles.userBadges}>
                        {user.badges.slice(0, 3).map(b => (
                          <Badge key={b} variant="secondary" glow size="sm">{b}</Badge>
                        ))}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>

            {tableData.length > 0 && (
              <Card className={styles.tableCard}>
                <h2 className={styles.cardTitle}>Bảng xếp hạng</h2>
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Hạng</th>
                        <th>Chuyên gia</th>
                        <th>Level / Lĩnh vực</th>
                        <th>Doanh thu</th>
                        <th>Đánh giá</th>
                        <th>Huy hiệu</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tableData.map((row, idx) => {
                        const rank = idx + 4;
                        const initials = safeInitials(row.name);
                        return (
                          <tr key={row.uid}>
                            <td><div className={styles.rowRank}>#{rank}</div></td>
                            <td>
                              <div className={styles.rowUser}>
                                <div className={styles.smallAvatar}>{initials}</div>
                                <strong>{row.name}</strong>
                              </div>
                            </td>
                            <td>
                              <div className={styles.rowMeta}>
                                <Badge variant="default" size="sm">{row.level}</Badge>
                                <span className={styles.rowField}>{row.specialty}</span>
                              </div>
                            </td>
                            <td>
                              <strong className={styles.rowAmount}>{formatFriendlyMoney(row.earnings)}</strong>
                            </td>
                            <td>
                              <div className={styles.rowRating}>⭐ {row.rating.toFixed(1)}</div>
                            </td>
                            <td>
                              {row.badges.map(b => (
                                <Badge key={b} size="sm" variant="default">{b}</Badge>
                              ))}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </>
        )}
      </section>
    </div>
  );
}

// ─── Export with Error Boundary ───
export default function LeaderboardPage() {
  return (
    <LeaderboardErrorBoundary>
      <LeaderboardContent />
    </LeaderboardErrorBoundary>
  );
}
