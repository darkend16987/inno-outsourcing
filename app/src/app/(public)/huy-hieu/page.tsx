'use client';

import React, { useEffect, useState } from 'react';
import { Card, Badge, Skeleton } from '@/components/ui';
import styles from './page.module.css';
import { useAuth } from '@/lib/firebase/auth-context';
import { getBadgeDefinitions, getUserBadges } from '@/lib/firebase/firestore';
import type { UserBadge } from '@/types';
import { 
  Diamond, 
  Zap, 
  Star, 
  HeartHandshake, 
  Rocket, 
  Award,
  ShieldCheck,
  Trophy,
  Target,
  Flame,
  Info
} from 'lucide-react';

// Map icon names from DB to Lucide components
const IconMap: Record<string, React.ReactNode> = {
  'Diamond': <Diamond size={32} strokeWidth={1.5} />,
  'Zap': <Zap size={32} strokeWidth={1.5} />,
  'Star': <Star size={32} strokeWidth={1.5} />,
  'HeartHandshake': <HeartHandshake size={32} strokeWidth={1.5} />,
  'Rocket': <Rocket size={32} strokeWidth={1.5} />,
  'Award': <Award size={32} strokeWidth={1.5} />,
  'ShieldCheck': <ShieldCheck size={32} strokeWidth={1.5} />,
  'Trophy': <Trophy size={32} strokeWidth={1.5} />,
  'Target': <Target size={32} strokeWidth={1.5} />,
  'Flame': <Flame size={32} strokeWidth={1.5} />,
};

interface BadgeDefinition {
  id: string;
  title: string;
  desc: string;
  icon: string;
  color?: string;
  count?: number;
}

export default function BadgesPage() {
  const { userProfile: user } = useAuth();
  const [definitions, setDefinitions] = useState<BadgeDefinition[]>([]);
  const [userEarned, setUserEarned] = useState<UserBadge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [defs, earned] = await Promise.all([
          getBadgeDefinitions() as Promise<BadgeDefinition[]>,
          user ? getUserBadges(user.uid) : Promise.resolve([])
        ]);
        
        // Ensure consistent data structure
        const formattedDefs = defs.map(d => ({
          ...d,
          color: d.color || 'var(--color-primary)',
          count: d.count || 0
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
    const icon = IconMap[name] || <Award size={32} strokeWidth={1.5} />;
    return React.cloneElement(icon as React.ReactElement<{ color?: string }>, { color });
  };

  // Helper to check if user has a badge
  const getUserBadgeStatus = (badgeTypeId: string) => {
    const earned = userEarned.find(b => b.badgeType === badgeTypeId);
    if (earned) return { status: 'earned', progress: 100 };
    
    // In a real app, logic for "in_progress" might come from a different collection
    // For now, we'll mark some as in_progress if user exists but not earned
    return { status: 'locked', progress: 0 };
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <section className={styles.heroSection}>
          <Skeleton className={styles.titleSkeleton} />
          <Skeleton className={styles.subtitleSkeleton} />
        </section>
        <div className={styles.container}>
          <div className={styles.gridWrap}>
            <div className={styles.leftCol}>
              <Card padding="xl">
                <Skeleton className="h-8 w-48 mb-6" />
                {[1, 2].map(i => (
                  <div key={i} className="mb-6">
                    <div className="flex gap-4 mb-2">
                      <Skeleton className="w-12 h-12 rounded-full" />
                      <div className="flex-1">
                        <Skeleton className="h-5 w-1/3 mb-2" />
                        <Skeleton className="h-4 w-2/3" />
                      </div>
                    </div>
                  </div>
                ))}
              </Card>
            </div>
            <div className={styles.rightCol}>
              <Card padding="xl">
                <Skeleton className="h-8 w-48 mb-6" />
                <div className="grid grid-cols-1 gap-4">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}
                </div>
              </Card>
            </div>
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
        <div className={styles.gridWrap}>
          
          {/* User's Badges Section */}
          <div className={styles.leftCol}>
            <Card className={styles.card} padding="xl" glow>
              <h2 className={styles.cardTitle}>Huy hiệu của tôi</h2>
              {user ? (
                <div className={styles.userList}>
                  {userEarned.length > 0 ? (
                    userEarned.map(b => {
                      const def = definitions.find(d => d.id === b.badgeType);
                      if (!def) return null;
                      return (
                        <div key={b.id} className={styles.userBadgeItem}>
                          <div className={styles.userBadgeTop}>
                            <div className={styles.userBadgeIcon}>
                              {renderIcon(def.icon, def.color)}
                            </div>
                            <div className={styles.userBadgeInfo}>
                              <strong>{def.title}</strong>
                              <span className={styles.userBadgeDesc}>{def.desc}</span>
                            </div>
                            <Badge variant="secondary" glow>
                              Đã nhận
                            </Badge>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className={styles.emptyState}>
                      <Award size={48} className={styles.emptyIcon} />
                      <p>Bạn chưa sở hữu huy hiệu nào.</p>
                      <span>Hoàn thành job để bắt đầu sưu tầm!</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className={styles.emptyState}>
                  <ShieldCheck size={48} className={styles.emptyIcon} />
                  <p>Đăng nhập để xem huy hiệu của bạn</p>
                </div>
              )}
            </Card>
          </div>

          {/* Global Badge Definitions List */}
          <div className={styles.rightCol}>
            <Card className={styles.card} padding="xl">
              <h2 className={styles.cardTitle}>Danh sách Huy hiệu</h2>
              <div className={styles.allBadgesGrid}>
                {definitions.length > 0 ? (
                  definitions.map((badge) => {
                    const { status } = getUserBadgeStatus(badge.id);
                    return (
                      <div 
                        key={badge.id} 
                        className={`${styles.badgeItem} ${status === 'earned' ? styles.earned : ''}`} 
                        style={{ '--badge-theme': badge.color } as React.CSSProperties}
                      >
                        <div className={styles.badgeIconWrap}>
                          <div className={styles.badgeIcon}>
                            {renderIcon(badge.icon)}
                          </div>
                        </div>
                        <div className={styles.badgeContent}>
                          <div className={styles.badgeTopRow}>
                            <h3 className={styles.badgeName}>{badge.title}</h3>
                            {status === 'earned' && (
                              <Badge variant="success" size="sm" dot>Sở hữu</Badge>
                            )}
                          </div>
                          <p className={styles.badgeDesc}>{badge.desc}</p>
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
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
