/**
 * Invoice Generator Service
 * Generates invoice data for completed payments/milestones.
 */

import type { Job, Payment, UserProfile } from '@/types';

export interface InvoiceData {
  invoiceNumber: string;
  date: string;
  // Party A (Job Master / Company)
  partyA: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  // Party B (Freelancer)
  partyB: {
    name: string;
    email?: string;
    phone?: string;
    idNumber?: string;
    bankAccount?: string;
    bankName?: string;
  };
  // Job info
  jobTitle: string;
  jobId: string;
  category: string;
  // Line items (milestones)
  items: Array<{
    description: string;
    amount: number;
  }>;
  subtotal: number;
  total: number;
  currency: string;
  notes?: string;
  status: 'draft' | 'issued' | 'paid';
}

/**
 * Generate a unique invoice number
 */
const generateInvoiceNumber = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `INV-${year}${month}-${random}`;
};

/**
 * Generate invoice data from a job and payment
 */
export const generateInvoice = (
  job: Job,
  payment: Payment,
  freelancer: UserProfile,
  jobMaster?: Partial<UserProfile>,
): InvoiceData => {
  const now = new Date();
  const milestones = job.milestones || [];

  // Build line items from paid milestones
  const paidMilestones = milestones.filter(
    m => m.status === 'paid' || m.status === 'released' || m.status === 'approved'
  );

  const items = paidMilestones.length > 0
    ? paidMilestones.map(m => ({
        description: `${m.name} (${m.percentage}%)`,
        amount: m.amount,
      }))
    : [{ description: job.title, amount: payment.amount || 0 }];

  const subtotal = items.reduce((sum, item) => sum + item.amount, 0);

  return {
    invoiceNumber: generateInvoiceNumber(),
    date: now.toLocaleDateString('vi-VN'),
    partyA: {
      name: jobMaster?.displayName || job.jobMasterName || 'Job Master',
      email: jobMaster?.email,
      phone: jobMaster?.phone,
    },
    partyB: {
      name: freelancer.displayName || 'Freelancer',
      email: freelancer.email,
      phone: freelancer.phone,
      bankAccount: freelancer.bankAccountNumber,
      bankName: freelancer.bankName,
    },
    jobTitle: job.title,
    jobId: job.id,
    category: job.category,
    items,
    subtotal,
    total: subtotal,
    currency: 'VND',
    notes: `Thanh toán cho dự án "${job.title}"`,
    status: payment.status === 'paid' ? 'paid' : 'issued',
  };
};

/**
 * Format currency for display in invoice
 */
export const formatInvoiceCurrency = (amount: number): string => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
};
