'use client';

import React from 'react';
import styles from './Card.module.css';

interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'metric' | 'elevated' | 'bordered' | 'accent';
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  onClick?: () => void;
  hover?: boolean;
  glow?: boolean;
}

export function Card({
  children,
  variant = 'default',
  className = '',
  padding = 'md',
  onClick,
  hover = false,
  glow = false,
}: CardProps) {
  const classes = [
    styles.card,
    styles[variant],
    styles[`pad_${padding}`],
    hover ? styles.hover : '',
    glow ? styles.glow : '',
    onClick ? styles.clickable : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={classes} onClick={onClick} role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined}>
      {children}
    </div>
  );
}

// Metric Card — for dashboard KPIs
interface MetricCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: 'up' | 'down';
  trendValue?: string;
  className?: string;
}

export function MetricCard({ label, value, subtitle, icon, trend, trendValue, className = '' }: MetricCardProps) {
  return (
    <Card variant="metric" className={`${styles.metricCard} ${className}`}>
      <div className={styles.metricTop}>
        <span className={styles.metricLabel}>{label}</span>
        {icon && <span className={styles.metricIcon}>{icon}</span>}
      </div>
      <strong className={styles.metricValue}>{value}</strong>
      {(subtitle || trendValue) && (
        <div className={styles.metricBottom}>
          {trendValue && (
            <span className={`${styles.metricTrend} ${trend === 'up' ? styles.trendUp : styles.trendDown}`}>
              {trend === 'up' ? '↑' : '↓'} {trendValue}
            </span>
          )}
          {subtitle && <span className={styles.metricSubtitle}>{subtitle}</span>}
        </div>
      )}
    </Card>
  );
}
