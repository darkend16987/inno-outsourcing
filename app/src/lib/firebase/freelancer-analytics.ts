/**
 * Freelancer Earnings Analytics
 * Provides earnings breakdown, monthly trends, and forecasts for freelancers.
 */

import {
  collection,
  getDocs,
  query,
  where,
  Timestamp,
} from 'firebase/firestore';
import { db } from './config';
import type { Payment, Job } from '@/types';

export interface MonthlyEarning {
  month: string; // "2026-01", "2026-02", etc.
  label: string; // "Tháng 1", "Tháng 2"
  amount: number;
}

export interface CategoryBreakdown {
  category: string;
  amount: number;
  percentage: number;
}

export interface FreelancerEarningsData {
  totalEarnings: number;
  currentMonthEarnings: number;
  previousMonthEarnings: number;
  trend: number; // percentage change vs previous month
  monthlyEarnings: MonthlyEarning[];
  categoryBreakdown: CategoryBreakdown[];
  forecast: number; // estimated current month total
  completedJobsCount: number;
}

/**
 * Get comprehensive earnings analytics for a freelancer
 */
export const getFreelancerEarnings = async (uid: string): Promise<FreelancerEarningsData> => {
  if (!db) return getEmptyEarnings();

  try {
    // Fetch all payments for this worker
    const paymentsQuery = query(
      collection(db, 'payments'),
      where('workerId', '==', uid),
      where('status', '==', 'paid'),
    );
    const paymentsSnap = await getDocs(paymentsQuery);
    const payments = paymentsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Payment));

    // Fetch completed jobs for category breakdown
    const jobsQuery = query(
      collection(db, 'jobs'),
      where('assignedTo', '==', uid),
      where('status', 'in', ['completed', 'paid']),
    );
    const jobsSnap = await getDocs(jobsQuery);
    const jobs = jobsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Job));

    // Calculate monthly earnings (last 12 months)
    const now = new Date();
    const monthlyMap = new Map<string, number>();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyMap.set(key, 0);
    }

    let totalEarnings = 0;
    for (const payment of payments) {
      const amount = payment.amount || 0;
      totalEarnings += amount;

      const paidAt = payment.paidAt;
      let date: Date | null = null;
      if (paidAt && typeof paidAt === 'object' && 'toDate' in paidAt) {
        date = (paidAt as unknown as { toDate: () => Date }).toDate();
      } else if (paidAt instanceof Date) {
        date = paidAt;
      }

      if (date) {
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (monthlyMap.has(key)) {
          monthlyMap.set(key, (monthlyMap.get(key) || 0) + amount);
        }
      }
    }

    const monthlyEarnings: MonthlyEarning[] = Array.from(monthlyMap.entries()).map(([month, amount]) => {
      const [, m] = month.split('-');
      return { month, label: `T${parseInt(m)}`, amount };
    });

    // Current and previous month
    const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    const currentMonthEarnings = monthlyMap.get(currentKey) || 0;
    const previousMonthEarnings = monthlyMap.get(prevKey) || 0;

    const trend = previousMonthEarnings > 0
      ? Math.round(((currentMonthEarnings - previousMonthEarnings) / previousMonthEarnings) * 100)
      : 0;

    // Category breakdown from jobs
    const categoryMap = new Map<string, number>();
    for (const job of jobs) {
      const cat = job.category || 'Khác';
      categoryMap.set(cat, (categoryMap.get(cat) || 0) + (job.totalFee || 0));
    }
    const totalCategoryAmount = Array.from(categoryMap.values()).reduce((a, b) => a + b, 0) || 1;
    const categoryBreakdown: CategoryBreakdown[] = Array.from(categoryMap.entries())
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: Math.round((amount / totalCategoryAmount) * 100),
      }))
      .sort((a, b) => b.amount - a.amount);

    // Simple forecast: current month pace extrapolated
    const dayOfMonth = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const forecast = dayOfMonth > 0
      ? Math.round((currentMonthEarnings / dayOfMonth) * daysInMonth)
      : 0;

    return {
      totalEarnings,
      currentMonthEarnings,
      previousMonthEarnings,
      trend,
      monthlyEarnings,
      categoryBreakdown,
      forecast,
      completedJobsCount: jobs.length,
    };
  } catch (error) {
    console.error('Error fetching freelancer earnings:', error);
    return getEmptyEarnings();
  }
};

function getEmptyEarnings(): FreelancerEarningsData {
  return {
    totalEarnings: 0,
    currentMonthEarnings: 0,
    previousMonthEarnings: 0,
    trend: 0,
    monthlyEarnings: [],
    categoryBreakdown: [],
    forecast: 0,
    completedJobsCount: 0,
  };
}
