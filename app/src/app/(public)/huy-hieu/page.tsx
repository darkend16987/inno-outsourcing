'use client';

import React, { useEffect, useState } from 'react';
import { Card, Badge, Skeleton } from '@/components/ui';
import styles from './page.module.css';
import { useAuth } from '@/lib/firebase/auth-context';
import { getBadgeDefinitions, getUserBadges } from '@/lib/firebase/firestore';
import type { UserBadge } from '@/types';
import {
  Diamond, Zap, Star, HeartHandshake, Rocket, Award,
  ShieldCheck, Trophy, Target, Flame, Info, Lock, ArrowUp, ArrowDown
} from 'lucide-react';

const IconMap: Record<string, React.ReactNode> = {
  'Diamond': <Diamond size={28} strokeWidth={1.5} />,
  'Zap': <Zap size={28} strokeWidth={1.5} />,
  'Star': <Star size={28} strokeWidth={1.5} />,
  'HeartHandshake': <HeartHandshake size={28} strokeWidth={1.5} />,
  'Rocket': <Rocket size={28} strokeWidth={1.5} />,
  'Award': <Award size={28} strokeWidth={1.5} />,
  'ShieldCheck': <ShieldCheck size={28} strokeWidth={1.5} />,
  'Trophy': <Trophy size={28} strokeWidth={1.5} />,
  'Target': <Target size={28} strokeWidth={1.5} />,
  'Flame': <Flame size={28} strokeWidth={1.5} />,
};

interface BadgeDefinition {
  id: string;
  title: string;
  desc: string;
  icon: string;
  color?: string;
  count?: number;
  threshold?: number;
}

type SortOrder = 'asc' | 'desc';

export default function BadgesPage() {
  const { userProfile: user } = useAuth();
  const [activeTab, setActiveTab] = useState<'mine' | 'all'>('all');
  const [definitions, setDefinitions] = useState<BadgeDefinition[]>([]);
  const [userEarned, setUserEarned] = useState<UserBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [defs, earned] = await Promise.all([
          getBadgeDefinitions() as Promise<BadgeDefinition[]>,
          user ? getUserBadges(user.uid) : Promise.resolve([])
        ]);
        const formattedDefs = defs.map(d => ({
          ...d,
          color: d.color || 'var(--color-primary)',
          count: d.count || 0,
          threshold: d.threshold || 0,
        })) as BadgeDefinition[];
        setDefinitions(formattedDefs);
        setUserEarned(earned);
      } catch (error) {
        console.error('Error fetching badges:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [user]);

  const renderIcon = (name: string, color?: string) => {
    const icon = IconMap[name] || <Award size={28} strokeWidth={1.5} />;
    return React.cloneElement(icon as React.ReactElement<{ color?: string }>, { color });
  };

  const hasEarned = (badgeTypeId: string) => userEarned.some(b => b.badgeType === badgeTypeId);

  // Sorted my badges
  const sortedMyBadges = [...userEarned].sort((a, b) => {
    const aTime = a.earnedAt instanceof Date ? a.earnedAt.getTime() : 0;
    const bTime = b.earnedAt instanceof Date ? b.earnedAt.getTime() : 0;
    return sortOrder === 'asc' ? aTime - bTime : bTime - aTime;
  });

  // Simulated user progress (completedJobs / threshold)
  const getUserProgress = (badge: BadgeDefinition): number => {
    if (!user || !badge.threshold) return 0;
    const completed = (user as unknown as { stats?: { completedJobs?: number } }).stats?.completedJobs || 0;
    return Math.min(100, Math.round((completed / badge.threshold) * 100));
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <section className={styles.heroSection}>
          <Skeleton className={styles.titleSkeleton} />
          <Skeleton className={styles.subtitleSkeleton} />
        </section>
        <div className={styles.container}>
          <div className={styles.skeletonGrid}>
            {[1,2,3,4].map(i => <Skeleton key={i} className={styles.skeletonItem} />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <section className={styles.heroSection}>
        <div className={styles.heroGlow} />
        <h1 className={styles.title}>Hệ thống Huy hiệu</h1>
        <p className={styles.subtitle}>Sưu tầm huy hiệu để chứng minh năng lực và nâng cao mức uy tín của bạn</p>
      </section>

      <section className={styles.container}>
        {/* Tab Bar */}
        <div className={styles.tabBar}>
          {user && (
            <button
              className={`${styles.tabBtn} ${activeTab === 'mine' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('mine')}
            >
              <Trophy size={16} /> Huy hiệu của tôi
              {userEarned.length > 0 && (
                <span className={styles.tabCount}>{userEarned.length}</span>
              )}
            </button>
          )}
          <button
            className={`${styles.tabBtn} ${activeTab === 'all' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('all')}
          >
            <Award size={16} /> Danh sách huy hiệu hệ thống
          </button>
          {!user && (
            <div className={styles.loginHint}>
              <Lock size={14} /> Đăng nhập để xem huy hiệu của bạn
            </div>
          )}
        </div>

        {/* ── Tab: My Badges ── */}
        {activeTab === 'mine' && user && (
          <div>
            <div className={styles.sortBar}>
              <span className={styles.sortLabel}>Sắp xếp:</span>
              <button
                className={`${styles.sortBtn} ${sortOrder === 'asc' ? styles.sortActive : ''}`}
                onClick={() => setSortOrder('asc')}
              >
                <ArrowUp size={14} /> Cũ nhất trước
              </button>
              <button
                className={`${styles.sortBtn} ${sortOrder === 'desc' ? styles.sortActive : ''}`}
                onClick={() => setSortOrder('desc')}
              >
                <ArrowDown size={14} /> Mới nhất trước
              </button>
            </div>

            {sortedMyBadges.length > 0 ? (
              <div className={styles.myBadgesGrid}>
                {sortedMyBadges.map(b => {
                  const def = definitions.find(d => d.id === b.badgeType);
                  if (!def) return null;
                  const earnedDate = b.earnedAt instanceof Date
                    ? b.earnedAt.toLocaleDateString('vi-VN')
                    : 'Gần đây';
                  return (
                    <div key={b.id} style={{ '--badge-theme': def.color } as React.CSSProperties}>
                    <Card className={styles.myBadgeCard}>
                      <div className={styles.myBadgeIconWrap}>
                        {renderIcon(def.icon, def.color)}
                      </div>
                      <div className={styles.myBadgeInfo}>
                        <strong className={styles.myBadgeName}>{def.title}</strong>
                        <span className={styles.myBadgeDesc}>{def.desc}</span>
                        <span className={styles.myBadgeDate}>Nhận ngày: {earnedDate}</span>
                      </div>
                      <Badge variant="success" size="sm" glow>Đã nhận</Badge>
                    </Card>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className={styles.emptyState}>
                <Award size={56} className={styles.emptyIcon} />
                <p>Bạn chưa sở hữu huy hiệu nào.</p>
                <span>Hoàn thành job để bắt đầu sưu tầm!</span>
              </div>
            )}
          </div>
        )}

        {/* ── Tab: All System Badges ── */}
        {activeTab === 'all' && (
          <div className={styles.allBadgesGrid}>
            {definitions.length > 0 ? (
              definitions.map((badge) => {
                const earned = hasEarned(badge.id);
                const progress = earned ? 100 : getUserProgress(badge);
                return (
                  <div
                    key={badge.id}
                    className={`${styles.badgeItem} ${earned ? styles.earned : ''}`}
                    style={{ '--badge-theme': badge.color } as React.CSSProperties}
                  >
                    <div className={styles.badgeIconWrap}>
                      <div className={styles.badgeIcon}>
                        {renderIcon(badge.icon, earned ? badge.color : undefined)}
                      </div>
                    </div>
                    <div className={styles.badgeContent}>
                      <div className={styles.badgeTopRow}>
                        <h3 className={styles.badgeName}>{badge.title}</h3>
                        {earned && <Badge variant="success" size="sm" dot>Sở hữu</Badge>}
                      </div>
                      <p className={styles.badgeDesc}>{badge.desc}</p>

                      {/* Progress bar */}
                      {user && !earned && (
                        <div className={styles.progressWrap}>
                          <div className={styles.progressBar}>
                            <div
                              className={styles.progressFill}
                              style={{ width: `${progress}%`, background: badge.color }}
                            />
                          </div>
                          <span className={styles.progressText}>{progress}%</span>
                        </div>
                      )}
                      {earned && (
                        <div className={styles.progressWrap}>
                          <div className={styles.progressBar}>
                            <div className={styles.progressFill} style={{ width: '100%', background: badge.color }} />
                          </div>
                          <span className={styles.progressText}>✓</span>
                        </div>
                      )}

                      <div className={styles.badgeCount}>
                        Đã có <strong>{badge.count}</strong> người nhận
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className={styles.emptyState}>
                <Info size={48} className={styles.emptyIcon} />
                <p>Đang cập nhật danh sách huy hiệu...</p>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
