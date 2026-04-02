'use client';

import React, { useState, useEffect } from 'react';
import { Card, Badge, LevelBadge, Skeleton } from '@/components/ui';
import { formatFriendlyMoney } from '@/lib/formatters';
import styles from './page.module.css';
import { getLeaderboard } from '@/lib/firebase/firestore';
import type { LeaderboardEntry } from '@/types';
import { Trophy, Medal, Crown, TrendingUp } from 'lucide-react';

export default function LeaderboardPage() {
  const [period, setPeriod] = useState<string>('month');
  const [fieldFilter, setFieldFilter] = useState<string>('all');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const data = await getLeaderboard();
        setLeaderboard(data);
      } catch (err) {
        console.error('Cannot load leaderboard', err);
      }
      setLoading(false);
    }
    loadData();
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
        ) : filtered.length === 0 ? (
          <div className={styles.emptyState}>
            <TrendingUp size={48} className={styles.emptyIcon} />
            <p>Chưa có dữ liệu cho thời gian này</p>
          </div>
        ) : (
          <>
            <div className={styles.top3Grid}>
              {top3.map((user, idx) => {
                const rank = idx + 1;
                // Generate initials safely
                const parts = user.name.split(' ');
                const initials = parts.length > 1 ? parts[0][0] + parts[parts.length-1][0] : user.name.slice(0, 2);

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
                      {user.avatar ? <img src={user.avatar} alt={user.name} /> : initials.toUpperCase()}
                    </div>
                    <strong className={styles.name}>{user.name}</strong>
                    <div className={styles.meta}>
                      <span className={styles.level}>{user.level}</span> • <span className={styles.field}>{user.specialty}</span>
                    </div>
                    <strong className={styles.highlightAmount}>{formatFriendlyMoney(user.earnings)}</strong>
                    
                    {user.badges && user.badges.length > 0 && (
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
                        const parts = row.name.split(' ');
                        const initials = parts.length > 1 ? parts[0][0] + parts[parts.length-1][0] : row.name.slice(0, 2);
                        return (
                          <tr key={row.uid}>
                            <td><div className={styles.rowRank}>#{rank}</div></td>
                            <td>
                              <div className={styles.rowUser}>
                                <div className={styles.smallAvatar}>{initials.toUpperCase()}</div>
                                <strong>{row.name}</strong>
                              </div>
                            </td>
                            <td>
                              <div className={styles.rowMeta}>
                                <LevelBadge level={row.level} /> 
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
                              {row.badges && row.badges.map(b => (
                                <Badge key={b} size="sm" variant="default" className="mr-1">{b}</Badge>
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
