/**
 * Analytics Service — P5 Analytics Dashboard
 * Aggregates metrics from jobs, payments, and applications.
 */

import {
  collection, getDocs, query, where, Timestamp,
} from 'firebase/firestore';
import { db } from './config';

// =====================
// TYPES
// =====================

export interface AnalyticsData {
  // Revenue
  totalRevenue: number;
  monthlyRevenue: { month: string; revenue: number }[];

  // Jobs
  totalJobs: number;
  activeJobs: number;
  completedJobs: number;
  cancelledJobs: number;

  // Applications & Conversion
  totalApplications: number;
  conversionRate: number; // applications → hired (%)
  avgTimeToHire: number; // hours

  // Users
  totalFreelancers: number;
  totalJobMasters: number;
  activeUsersThisMonth: number;

  // Disputes
  totalDisputes: number;
  openDisputes: number;
}

// =====================
// DATA FETCHING
// =====================

export async function getAnalyticsData(): Promise<AnalyticsData> {
  if (!db) {
    return getEmptyAnalytics();
  }

  try {
    const [jobsData, paymentsData, applicationsData, usersData, disputesData] = await Promise.all([
      fetchJobsMetrics().catch(e => { console.warn('[Analytics] jobs fetch failed:', e); return { total: 0, active: 0, completed: 0, cancelled: 0 }; }),
      fetchPaymentsMetrics().catch(e => { console.warn('[Analytics] payments fetch failed:', e); return { totalRevenue: 0, monthlyRevenue: [] as { month: string; revenue: number }[] }; }),
      fetchApplicationsMetrics().catch(e => { console.warn('[Analytics] applications fetch failed:', e); return { totalApps: 0, hiredCount: 0, avgTimeToHire: 0 }; }),
      fetchUsersMetrics().catch(e => { console.warn('[Analytics] users fetch failed:', e); return { freelancers: 0, jobmasters: 0, activeThisMonth: 0 }; }),
      fetchDisputesMetrics().catch(e => { console.warn('[Analytics] disputes fetch failed:', e); return { total: 0, open: 0 }; }),
    ]);

    // Calculate conversion rate
    const conversionRate = applicationsData.totalApps > 0
      ? (applicationsData.hiredCount / applicationsData.totalApps) * 100
      : 0;

    return {
      totalRevenue: paymentsData.totalRevenue,
      monthlyRevenue: paymentsData.monthlyRevenue,
      totalJobs: jobsData.total,
      activeJobs: jobsData.active,
      completedJobs: jobsData.completed,
      cancelledJobs: jobsData.cancelled,
      totalApplications: applicationsData.totalApps,
      conversionRate: Math.round(conversionRate * 10) / 10,
      avgTimeToHire: applicationsData.avgTimeToHire,
      totalFreelancers: usersData.freelancers,
      totalJobMasters: usersData.jobmasters,
      activeUsersThisMonth: usersData.activeThisMonth,
      totalDisputes: disputesData.total,
      openDisputes: disputesData.open,
    };
  } catch (err) {
    console.error('[Analytics] Failed to fetch analytics:', err);
    return getEmptyAnalytics();
  }
}

// =====================
// INDIVIDUAL METRIC FETCHERS
// =====================

async function fetchJobsMetrics() {
  const snapshot = await getDocs(collection(db!, 'jobs'));
  let total = 0, active = 0, completed = 0, cancelled = 0;

  snapshot.forEach(doc => {
    total++;
    const status = doc.data().status;
    if (['open', 'assigned', 'in_progress', 'review'].includes(status)) active++;
    if (['completed', 'paid'].includes(status)) completed++;
    if (status === 'cancelled') cancelled++;
  });

  return { total, active, completed, cancelled };
}

async function fetchPaymentsMetrics() {
  const snapshot = await getDocs(collection(db!, 'payments'));
  let totalRevenue = 0;
  const monthMap: Record<string, number> = {};

  snapshot.forEach(doc => {
    const data = doc.data();
    if (data.status === 'paid' && data.amount) {
      totalRevenue += data.amount;
      const paidAt = (data.paidAt as Timestamp)?.toDate?.() || (data.createdAt as Timestamp)?.toDate?.();
      if (paidAt) {
        const key = `${paidAt.getFullYear()}-${String(paidAt.getMonth() + 1).padStart(2, '0')}`;
        monthMap[key] = (monthMap[key] || 0) + data.amount;
      }
    }
  });

  // Sort and get last 6 months
  const monthlyRevenue = Object.entries(monthMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([month, revenue]) => ({ month, revenue }));

  return { totalRevenue, monthlyRevenue };
}

async function fetchApplicationsMetrics() {
  const snapshot = await getDocs(collection(db!, 'applications'));
  let totalApps = 0;
  let hiredCount = 0;
  let totalTimeToHire = 0;
  let hiredWithTime = 0;

  snapshot.forEach(doc => {
    totalApps++;
    const data = doc.data();
    if (data.status === 'accepted') {
      hiredCount++;
      // Calculate time to hire if data available
      const created = (data.createdAt as Timestamp)?.toDate?.();
      const accepted = (data.updatedAt as Timestamp)?.toDate?.();
      if (created && accepted) {
        const hours = (accepted.getTime() - created.getTime()) / (1000 * 60 * 60);
        totalTimeToHire += hours;
        hiredWithTime++;
      }
    }
  });

  const avgTimeToHire = hiredWithTime > 0
    ? Math.round(totalTimeToHire / hiredWithTime)
    : 0;

  return { totalApps, hiredCount, avgTimeToHire };
}

async function fetchUsersMetrics() {
  const snapshot = await getDocs(collection(db!, 'users'));
  let freelancers = 0, jobmasters = 0, activeThisMonth = 0;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  snapshot.forEach(doc => {
    const data = doc.data();
    if (data.role === 'freelancer') freelancers++;
    if (data.role === 'jobmaster') jobmasters++;
    const updatedAt = (data.updatedAt as Timestamp)?.toDate?.();
    if (updatedAt && updatedAt >= monthStart) activeThisMonth++;
  });

  return { freelancers, jobmasters, activeThisMonth };
}

async function fetchDisputesMetrics() {
  const snapshot = await getDocs(collection(db!, 'disputes'));
  let total = 0, open = 0;

  snapshot.forEach(doc => {
    total++;
    const status = doc.data().status;
    if (['open', 'under_review', 'escalated'].includes(status)) open++;
  });

  return { total, open };
}

// =====================
// HELPERS
// =====================

function getEmptyAnalytics(): AnalyticsData {
  return {
    totalRevenue: 0,
    monthlyRevenue: [],
    totalJobs: 0,
    activeJobs: 0,
    completedJobs: 0,
    cancelledJobs: 0,
    totalApplications: 0,
    conversionRate: 0,
    avgTimeToHire: 0,
    totalFreelancers: 0,
    totalJobMasters: 0,
    activeUsersThisMonth: 0,
    totalDisputes: 0,
    openDisputes: 0,
  };
}
