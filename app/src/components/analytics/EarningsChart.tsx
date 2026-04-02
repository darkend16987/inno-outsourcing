'use client';

import React, { useState, useMemo } from 'react';
import { TrendingUp, TrendingDown, DollarSign, BarChart3, Calendar } from 'lucide-react';
import styles from './EarningsChart.module.css';

interface MonthlyEarning {
  month: string;
  label: string;
  amount: number;
}

interface EarningsChartProps {
  totalEarnings: number;
  currentMonthEarnings: number;
  monthlyData?: MonthlyEarning[];
  className?: string;
}

// Generate mock data for demo if not provided
function generateMockData(): MonthlyEarning[] {
  const months = ['T10', 'T11', 'T12', 'T01', 'T02', 'T03'];
  const fullMonths = ['10/2025', '11/2025', '12/2025', '01/2026', '02/2026', '03/2026'];
  return months.map((m, i) => ({
    month: fullMonths[i],
    label: m,
    amount: Math.floor(Math.random() * 40_000_000) + 10_000_000,
  }));
}

const formatCurrency = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toString();
};

const formatFullCurrency = (n: number) => `${n.toLocaleString('vi-VN')}₫`;

export function EarningsChart({
  totalEarnings,
  currentMonthEarnings,
  monthlyData,
  className = '',
}: EarningsChartProps) {
  const data = useMemo(() => monthlyData || generateMockData(), [monthlyData]);
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);

  const maxAmount = Math.max(...data.map(d => d.amount), 1);
  const prevMonth = data.length >= 2 ? data[data.length - 2].amount : 0;
  const trend = prevMonth > 0 ? ((currentMonthEarnings - prevMonth) / prevMonth) * 100 : 0;

  return (
    <div className={`${styles.container} ${className}`}>
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <BarChart3 size={18} className={styles.icon} />
          <h3 className={styles.title}>Thu nhập</h3>
        </div>
        <div className={styles.period}>
          <Calendar size={12} />
          <span>6 tháng gần nhất</span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className={styles.summaryGrid}>
        <div className={styles.summaryCard}>
          <div className={styles.summaryLabel}>Tổng cộng</div>
          <div className={styles.summaryValue}>{formatFullCurrency(totalEarnings)}</div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.summaryLabel}>Tháng này</div>
          <div className={styles.summaryValue}>{formatFullCurrency(currentMonthEarnings)}</div>
          {trend !== 0 && (
            <div className={`${styles.trend} ${trend > 0 ? styles.trendUp : styles.trendDown}`}>
              {trend > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              <span>{Math.abs(trend).toFixed(0)}%</span>
            </div>
          )}
        </div>
      </div>

      {/* Bar Chart */}
      <div className={styles.chartArea}>
        <div className={styles.yAxis}>
          <span>{formatCurrency(maxAmount)}</span>
          <span>{formatCurrency(maxAmount / 2)}</span>
          <span>0</span>
        </div>
        <div className={styles.bars}>
          {data.map((d, i) => {
            const height = (d.amount / maxAmount) * 100;
            const isLast = i === data.length - 1;
            return (
              <div
                key={d.month}
                className={styles.barCol}
                onMouseEnter={() => setHoveredBar(i)}
                onMouseLeave={() => setHoveredBar(null)}
              >
                {hoveredBar === i && (
                  <div className={styles.tooltip}>
                    {formatFullCurrency(d.amount)}
                  </div>
                )}
                <div className={styles.barWrapper}>
                  <div
                    className={`${styles.bar} ${isLast ? styles.barCurrent : ''}`}
                    style={{ height: `${height}%` }}
                  />
                </div>
                <span className={styles.barLabel}>{d.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
