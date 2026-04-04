/**
 * ============================================
 * VAA JOB — Extended Firestore helpers
 * ============================================
 * 
 * New Firestore functions for Phase 1-2 features:
 * - Scoring & matching storage
 * - Deadline alerts
 * - Escrow milestone operations
 * - Notification CRUD
 * - Saved jobs & freelancers
 * - Job invitations
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  addDoc,
  deleteDoc,
  arrayUnion,
  arrayRemove,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  onSnapshot,
  writeBatch,
  QueryConstraint,
  increment,
  Timestamp,
} from 'firebase/firestore';
import { db } from './config';
import type {
  Job, JobApplication, PaymentMilestone,
  Notification, NotificationType, UserProfile,
  MilestoneSubmission, SubmissionStatus,
} from '@/types';

// =====================
// SCORING / MATCHING
// =====================

/**
 * Store computed match score on an application document
 */
export const saveApplicationMatchScore = async (
  applicationId: string,
  matchScore: number,
  matchBadge: 'top_match' | 'recommended' | null,
  matchReasons: string[],
): Promise<void> => {
  if (!db) return;
  await updateDoc(doc(db, 'applications', applicationId), {
    matchScore,
    matchBadge,
    matchReasons,
  });
};

/**
 * Batch-update match scores for all applications on a job
 */
export const batchUpdateMatchScores = async (
  updates: Array<{ applicationId: string; score: number; badge: string | null; reasons: string[] }>,
): Promise<void> => {
  if (!db || updates.length === 0) return;
  const batch = writeBatch(db);
  for (const u of updates) {
    const ref = doc(db, 'applications', u.applicationId);
    batch.update(ref, {
      matchScore: u.score,
      matchBadge: u.badge,
      matchReasons: u.reasons,
    });
  }
  await batch.commit();
};

// =====================
// TRUST SCORE
// =====================

/**
 * Update a user's trust score and badge in their profile
 */
export const updateUserTrustScore = async (
  uid: string,
  trustScore: number,
  trustBadge: 'trusted' | 'rising' | 'new',
): Promise<void> => {
  if (!db) return;
  await updateDoc(doc(db, 'users', uid), {
    trustScore,
    trustBadge,
    'stats.trustScore': trustScore,
  });
};

// =====================
// AVAILABILITY
// =====================

export const updateAvailability = async (
  uid: string,
  status: 'available' | 'partially_busy' | 'unavailable',
): Promise<void> => {
  if (!db) return;
  await updateDoc(doc(db, 'users', uid), {
    'availability.status': status,
    'availability.lastUpdated': serverTimestamp(),
  });
};

// =====================
// MILESTONE / ESCROW
// =====================

/**
 * Update a single milestone's status on a job
 */
export const updateMilestoneStatus = async (
  jobId: string,
  milestoneId: string,
  newStatus: PaymentMilestone['status'],
): Promise<void> => {
  if (!db) return;
  const jobRef = doc(db, 'jobs', jobId);
  const jobSnap = await getDoc(jobRef);
  if (!jobSnap.exists()) return;

  const data = jobSnap.data();
  const milestones = (data.milestones || []) as PaymentMilestone[];
  const updated = milestones.map(m =>
    m.id === milestoneId ? { ...m, status: newStatus } : m
  );

  await updateDoc(jobRef, { milestones: updated });
};

// =====================
// MILESTONE SUBMISSIONS (subcollection)
// =====================

/**
 * Freelancer creates a submission for a milestone.
 * This goes to jobs/{jobId}/submissions subcollection.
 * Milestone status is NOT changed — only jobmaster can do that.
 */
export const createMilestoneSubmission = async (
  submission: Omit<MilestoneSubmission, 'id' | 'submittedAt' | 'status'>,
): Promise<string | null> => {
  if (!db) return null;
  const subsRef = collection(db, 'jobs', submission.jobId, 'submissions');
  const ref = await addDoc(subsRef, {
    ...submission,
    status: 'pending_review' as SubmissionStatus,
    submittedAt: serverTimestamp(),
  });
  return ref.id;
};

/**
 * Get all submissions for a job, ordered by newest first.
 */
export const getMilestoneSubmissions = async (
  jobId: string,
  filterStatus?: SubmissionStatus,
): Promise<MilestoneSubmission[]> => {
  if (!db) return [];
  const subsRef = collection(db, 'jobs', jobId, 'submissions');
  const constraints: QueryConstraint[] = [orderBy('submittedAt', 'desc')];
  if (filterStatus) {
    constraints.unshift(where('status', '==', filterStatus));
  }
  const q = query(subsRef, ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map(d => ({
    id: d.id,
    ...d.data(),
    submittedAt: d.data().submittedAt?.toDate?.() || new Date(),
  } as MilestoneSubmission));
};

/**
 * Get the latest submission for a specific milestone.
 */
export const getLatestSubmissionForMilestone = async (
  jobId: string,
  milestoneId: string,
): Promise<MilestoneSubmission | null> => {
  if (!db) return null;
  const subsRef = collection(db, 'jobs', jobId, 'submissions');
  const q = query(
    subsRef,
    where('milestoneId', '==', milestoneId),
    orderBy('submittedAt', 'desc'),
    limit(1),
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return {
    id: d.id,
    ...d.data(),
    submittedAt: d.data().submittedAt?.toDate?.() || new Date(),
  } as MilestoneSubmission;
};

/**
 * Jobmaster/Admin reviews a submission:
 * - approved: milestone status → 'review', progress auto-calculated,
 *   job status → 'review' if ALL milestones are now in review/approved/done
 * - rejected: submission status = 'rejected', milestone stays in_progress
 */
export const reviewMilestoneSubmission = async (params: {
  jobId: string;
  submissionId: string;
  milestoneId: string;
  decision: 'approved' | 'rejected';
  rejectionReason?: string;
  reviewerId: string;
  reviewerName: string;
}): Promise<void> => {
  if (!db) return;
  const subRef = doc(db, 'jobs', params.jobId, 'submissions', params.submissionId);

  if (params.decision === 'approved') {
    // Mark submission as approved
    await updateDoc(subRef, {
      status: 'approved' as SubmissionStatus,
      reviewedAt: serverTimestamp(),
      reviewedBy: params.reviewerId,
    });
    // Update milestone status to 'review' (ready for payment approval)
    await updateMilestoneStatus(params.jobId, params.milestoneId, 'review');

    // Auto-calculate progress & check if job should go to 'review'
    const jobRef = doc(db, 'jobs', params.jobId);
    const jobSnap = await getDoc(jobRef);
    if (jobSnap.exists()) {
      const milestones = (jobSnap.data().milestones || []) as PaymentMilestone[];
      // Calculate progress: sum of percentages for milestones that are review/approved/released/paid
      const doneStatuses = ['review', 'approved', 'released', 'paid'];
      const progress = milestones.reduce((sum, m) => {
        // The current milestone was just set to 'review' above
        const effectiveStatus = m.id === params.milestoneId ? 'review' : m.status;
        return sum + (doneStatuses.includes(effectiveStatus) ? m.percentage : 0);
      }, 0);

      const updateData: Record<string, unknown> = {
        progress: Math.min(progress, 100),
        updatedAt: serverTimestamp(),
      };

      // If ALL milestones are now in review/approved/done → set job status to 'review'
      const allSubmitted = milestones.every(m => {
        const effectiveStatus = m.id === params.milestoneId ? 'review' : m.status;
        return doneStatuses.includes(effectiveStatus);
      });
      if (allSubmitted && jobSnap.data().status === 'in_progress') {
        updateData.status = 'review';
      }

      await updateDoc(jobRef, updateData);
    }
  } else {
    // Mark submission as rejected with reason
    await updateDoc(subRef, {
      status: 'rejected' as SubmissionStatus,
      rejectionReason: params.rejectionReason || '',
      rejectedBy: params.reviewerId,
      rejectedByName: params.reviewerName,
      rejectedAt: new Date().toISOString(),
      reviewedAt: serverTimestamp(),
      reviewedBy: params.reviewerId,
    });
  }
};

/**
 * Lock all milestones (escrow lock on job assignment)
 */
export const lockAllMilestones = async (jobId: string): Promise<void> => {
  if (!db) return;
  const jobRef = doc(db, 'jobs', jobId);
  const jobSnap = await getDoc(jobRef);
  if (!jobSnap.exists()) return;

  const data = jobSnap.data();
  const milestones = (data.milestones || []) as PaymentMilestone[];
  let firstActivated = false;
  const locked = milestones.map(m => {
    // Set the first milestone to in_progress, rest to locked
    if (!firstActivated && (m.status === 'pending' || !m.status)) {
      firstActivated = true;
      return { ...m, status: 'in_progress' as const };
    }
    return {
      ...m,
      status: m.status === 'pending' || !m.status ? 'locked' as const : m.status,
    };
  });

  await updateDoc(jobRef, {
    milestones: locked,
    escrowStatus: 'locked',
  });
};

/**
 * Release a milestone (escrow release on approval)
 */
export const releaseMilestoneEscrow = async (
  jobId: string,
  milestoneId: string,
): Promise<void> => {
  if (!db) return;
  const jobRef = doc(db, 'jobs', jobId);
  const jobSnap = await getDoc(jobRef);
  if (!jobSnap.exists()) return;

  const data = jobSnap.data();
  const milestones = (data.milestones || []) as PaymentMilestone[];
  const updated = milestones.map(m =>
    m.id === milestoneId ? { ...m, status: 'released' as const } : m
  );

  // Check if all are released
  const allReleased = updated.every(m => m.status === 'released' || m.status === 'paid');
  const escrowStatus = allReleased ? 'fully_released' : 'partially_released';

  await updateDoc(jobRef, { milestones: updated, escrowStatus });
};

// =====================
// PAYMENT ORDER CREATION
// =====================

/**
 * Create a payment order document in Firestore for accountant to process.
 * Called when jobmaster approves a milestone.
 */
export const createPaymentOrder = async (data: {
  jobId: string;
  jobTitle: string;
  milestoneId: string;
  milestoneName: string;
  amount: number;
  workerId: string;
  workerName: string;
  approvedBy: string;
  approvedByName: string;
}): Promise<string | null> => {
  if (!db) return null;
  const ref = await addDoc(collection(db, 'payments'), {
    jobId: data.jobId,
    contractId: '',
    milestoneId: data.milestoneId,
    workerId: data.workerId,
    workerName: data.workerName,
    amount: data.amount,
    reason: `[${data.milestoneName}] — ${data.jobTitle}`,
    status: 'pending',
    triggeredByMilestone: true,
    approvedByJobMaster: data.approvedBy,
    approvedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
};

/**
 * Orchestrator: Approve a milestone, release escrow, create payment, notify.
 * Called from jobmaster page when they click "Phê duyệt & Yêu cầu thanh toán".
 */
export const approveMilestoneAndPay = async (params: {
  jobId: string;
  milestoneId: string;
  jobTitle: string;
  milestoneName: string;
  milestoneAmount: number;
  workerId: string;
  workerName: string;
  jobMasterId: string;
  jobMasterName: string;
}): Promise<{ allDone: boolean; paymentId: string | null }> => {
  if (!db) return { allDone: false, paymentId: null };

  const jobRef = doc(db, 'jobs', params.jobId);
  const jobSnap = await getDoc(jobRef);
  if (!jobSnap.exists()) throw new Error('Job not found');

  const data = jobSnap.data();
  const milestones = (data.milestones || []) as (PaymentMilestone & { submissionNote?: string; submissionLinks?: string[] })[];

  // 1. Update milestone status → released + approvedAt/By
  const updated = milestones.map(m =>
    m.id === params.milestoneId
      ? { ...m, status: 'released' as const, approvedAt: new Date().toISOString(), approvedBy: params.jobMasterId }
      : m
  );

  // 2. Activate the NEXT milestone automatically
  // Find the first milestone that is still 'pending' or has no active status
  let nextActivated = false;
  const withNextActivated = updated.map(m => {
    if (!nextActivated && m.id !== params.milestoneId && 
        m.status !== 'released' && m.status !== 'paid' && m.status !== 'approved' && m.status !== 'review' && m.status !== 'in_progress') {
      nextActivated = true;
      return { ...m, status: 'in_progress' as const };
    }
    return m;
  });

  // 3. Calculate progress based on released/paid/approved milestones
  const releasedPercentage = withNextActivated
    .filter(m => m.status === 'released' || m.status === 'paid' || m.status === 'approved')
    .reduce((sum, m) => sum + (m.percentage || 0), 0);

  // 4. Check if all milestones are now released/paid → update escrow + job status
  const allReleased = withNextActivated.every(m => m.status === 'released' || m.status === 'paid' || m.status === 'approved');
  const escrowStatus = allReleased ? 'fully_released' : 'partially_released';

  const jobUpdate: Record<string, unknown> = {
    milestones: withNextActivated,
    escrowStatus,
    progress: Math.min(releasedPercentage, 100),
    updatedAt: serverTimestamp(),
  };

  // If all milestones approved → job is completed
  if (allReleased) {
    jobUpdate.status = 'completed';
    jobUpdate.progress = 100;
  } else {
    // Keep job in_progress while there are remaining milestones
    jobUpdate.status = 'in_progress';
  }

  await updateDoc(jobRef, jobUpdate);

  // 3. Create payment order for accountant
  const paymentId = await createPaymentOrder({
    jobId: params.jobId,
    jobTitle: params.jobTitle,
    milestoneId: params.milestoneId,
    milestoneName: params.milestoneName,
    amount: params.milestoneAmount,
    workerId: params.workerId,
    workerName: params.workerName,
    approvedBy: params.jobMasterId,
    approvedByName: params.jobMasterName,
  });

  // 4. Send notifications
  // Notify freelancer
  await createNotification({
    recipientId: params.workerId,
    type: 'payment_pending' as NotificationType,
    title: `Milestone "${params.milestoneName}" đã được phê duyệt`,
    body: `Job Master đã nghiệm thu giai đoạn của bạn. Kế toán sẽ thanh toán ${params.milestoneAmount.toLocaleString('vi-VN')}₫ sớm.`,
    link: `/freelancer/jobs/${params.jobId}`,
    read: false,
  });

  // Notify all accountants (we send to special topic — in practice, query users with role=accountant)
  // For now, we create a generic notification that accountants will see
  try {
    const accountantsQ = query(collection(db, 'users'), where('role', '==', 'accountant'), limit(10));
    const accSnap = await getDocs(accountantsQ);
    for (const accDoc of accSnap.docs) {
      await createNotification({
        recipientId: accDoc.id,
        type: 'payment_pending' as NotificationType,
        title: `Lệnh chi mới: ${params.milestoneName}`,
        body: `JM ${params.jobMasterName} phê duyệt ${params.milestoneAmount.toLocaleString('vi-VN')}₫ cho ${params.workerName}.`,
        link: '/accountant/payments',
        read: false,
      });
    }
  } catch {
    // Non-critical — don't block the approval on notification failure
    console.warn('Failed to send accountant notifications');
  }

  if (allReleased) {
    // Notify jobmaster that job is completed
    await createNotification({
      recipientId: params.jobMasterId,
      type: 'progress_update' as NotificationType,
      title: `Dự án "${params.jobTitle}" đã hoàn thành 100%`,
      body: 'Tất cả các giai đoạn đã được nghiệm thu. Đang chờ kế toán thanh toán.',
      link: `/jobmaster/jobs/${params.jobId}`,
      read: false,
    });
  }

  return { allDone: allReleased, paymentId };
};

/**
 * Reject a milestone — send it back to in_progress for revision.
 */
export const rejectMilestone = async (params: {
  jobId: string;
  milestoneId: string;
  jobTitle: string;
  milestoneName: string;
  workerId: string;
  jobMasterName: string;
}): Promise<void> => {
  if (!db) return;
  await updateMilestoneStatus(params.jobId, params.milestoneId, 'in_progress');

  // Notify freelancer
  await createNotification({
    recipientId: params.workerId,
    type: 'milestone_reached' as NotificationType,
    title: `Yêu cầu sửa đổi: ${params.milestoneName}`,
    body: `JM ${params.jobMasterName} yêu cầu sửa đổi giai đoạn này. Vui lòng kiểm tra và nộp lại.`,
    link: `/freelancer/jobs/${params.jobId}`,
    read: false,
  });
};

/**
 * Approve ALL milestones in review status at once (bulk approve).
 */
export const approveAllMilestones = async (params: {
  jobId: string;
  jobTitle: string;
  workerId: string;
  workerName: string;
  jobMasterId: string;
  jobMasterName: string;
}): Promise<{ paymentIds: string[] }> => {
  if (!db) return { paymentIds: [] };

  const jobRef = doc(db, 'jobs', params.jobId);
  const jobSnap = await getDoc(jobRef);
  if (!jobSnap.exists()) throw new Error('Job not found');

  const data = jobSnap.data();
  const milestones = (data.milestones || []) as PaymentMilestone[];
  const paymentIds: string[] = [];

  // Approve all milestones (those in review go to released, those pending/in_progress/locked also go to released)
  const updated = milestones.map(m => {
    if (m.status === 'released' || m.status === 'paid' || m.status === 'approved') return m;
    return { ...m, status: 'released' as const, approvedAt: new Date().toISOString(), approvedBy: params.jobMasterId };
  });

  // Update job
  await updateDoc(jobRef, {
    milestones: updated,
    escrowStatus: 'fully_released',
    status: 'completed',
    progress: 100,
    updatedAt: serverTimestamp(),
  });

  // Create payment orders for each newly released milestone
  for (const ms of updated) {
    const original = milestones.find(m => m.id === ms.id);
    if (original && original.status !== 'released' && original.status !== 'paid' && original.status !== 'approved') {
      const pid = await createPaymentOrder({
        jobId: params.jobId,
        jobTitle: params.jobTitle,
        milestoneId: ms.id,
        milestoneName: ms.name,
        amount: ms.amount,
        workerId: params.workerId,
        workerName: params.workerName,
        approvedBy: params.jobMasterId,
        approvedByName: params.jobMasterName,
      });
      if (pid) paymentIds.push(pid);
    }
  }

  // Notify freelancer
  await createNotification({
    recipientId: params.workerId,
    type: 'payment_pending' as NotificationType,
    title: `Toàn bộ dự án "${params.jobTitle}" đã được nghiệm thu`,
    body: `Tất cả giai đoạn đã được phê duyệt. Thanh toán sẽ được xử lý bởi kế toán.`,
    link: `/freelancer/jobs/${params.jobId}`,
    read: false,
  });

  // Notify accountants
  try {
    const accountantsQ = query(collection(db, 'users'), where('role', '==', 'accountant'), limit(10));
    const accSnap = await getDocs(accountantsQ);
    for (const accDoc of accSnap.docs) {
      await createNotification({
        recipientId: accDoc.id,
        type: 'payment_pending' as NotificationType,
        title: `${paymentIds.length} lệnh chi mới — ${params.jobTitle}`,
        body: `JM ${params.jobMasterName} nghiệm thu toàn bộ dự án cho ${params.workerName}.`,
        link: '/accountant/payments',
        read: false,
      });
    }
  } catch {
    console.warn('Failed to send accountant notifications');
  }

  return { paymentIds };
};

/**
 * Called when accountant confirms payment — update milestone + check if job should be "paid"
 */
export const onPaymentConfirmed = async (params: {
  paymentId: string;
  jobId: string;
  milestoneId: string;
  workerId: string;
  workerName: string;
  jobMasterId: string;
  accountantId: string;
  accountantName: string;
  amount: number;
}): Promise<{ jobFullyPaid: boolean }> => {
  if (!db) return { jobFullyPaid: false };

  const jobRef = doc(db, 'jobs', params.jobId);
  const jobSnap = await getDoc(jobRef);
  if (!jobSnap.exists()) return { jobFullyPaid: false };

  const data = jobSnap.data();
  const milestones = (data.milestones || []) as PaymentMilestone[];

  // Update milestone status → paid
  const updated = milestones.map(m =>
    m.id === params.milestoneId
      ? { ...m, status: 'paid' as const, paidAt: new Date().toISOString(), paidBy: params.accountantId }
      : m
  );

  const allPaid = updated.every(m => m.status === 'paid');

  const jobUpdate: Record<string, unknown> = {
    milestones: updated,
    updatedAt: serverTimestamp(),
  };

  if (allPaid) {
    jobUpdate.status = 'paid';
  }

  await updateDoc(jobRef, jobUpdate);

  // Notify freelancer
  await createNotification({
    recipientId: params.workerId,
    type: 'payment_completed' as NotificationType,
    title: `Thanh toán ${params.amount.toLocaleString('vi-VN')}₫ đã hoàn tất`,
    body: allPaid
      ? 'Toàn bộ dự án đã được thanh toán. Cảm ơn bạn!'
      : 'Khoản thanh toán đã được chuyển khoản thành công.',
    link: `/freelancer/jobs/${params.jobId}`,
    read: false,
  });

  // Notify jobmaster
  if (params.jobMasterId) {
    await createNotification({
      recipientId: params.jobMasterId,
      type: 'payment_completed' as NotificationType,
      title: allPaid ? `Dự án hoàn tất thanh toán` : `Thanh toán milestone thành công`,
      body: `${params.accountantName} đã xác nhận chuyển khoản ${params.amount.toLocaleString('vi-VN')}₫ cho ${params.workerName}.`,
      link: `/jobmaster/jobs/${params.jobId}`,
      read: false,
    });
  }

  return { jobFullyPaid: allPaid };
};

// =====================
// NOTIFICATIONS
// =====================

/**
 * Create a notification
 */
export const createNotification = async (
  notification: Omit<Notification, 'id' | 'createdAt'>,
): Promise<string | null> => {
  if (!db) return null;
  const ref = await addDoc(collection(db, 'notifications'), {
    ...notification,
    createdAt: serverTimestamp(),
  });
  return ref.id;
};

/**
 * Mark a notification as read
 */
export const markNotificationRead = async (notificationId: string): Promise<void> => {
  if (!db) return;
  await updateDoc(doc(db, 'notifications', notificationId), { read: true });
};

/**
 * Mark all notifications as read for a user
 */
export const markAllNotificationsRead = async (userId: string): Promise<void> => {
  if (!db) return;
  const q = query(
    collection(db, 'notifications'),
    where('recipientId', '==', userId),
    where('read', '==', false),
  );
  const snap = await getDocs(q);
  const batch = writeBatch(db);
  snap.docs.forEach(d => batch.update(d.ref, { read: true }));
  await batch.commit();
};

/**
 * Listen to real-time notifications
 */
export const subscribeToNotifications = (
  userId: string,
  callback: (notifications: Notification[]) => void,
) => {
  if (!db) return () => {};
  const q = query(
    collection(db, 'notifications'),
    where('recipientId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(50),
  );
  return onSnapshot(q, (snapshot) => {
    const items = snapshot.docs.map(d => ({
      id: d.id,
      ...d.data(),
      createdAt: d.data().createdAt?.toDate?.() || new Date(),
    } as Notification));
    callback(items);
  });
};

// =====================
// SAVED JOBS / FREELANCERS
// =====================

export const toggleSavedJob = async (userId: string, jobId: string, save: boolean): Promise<void> => {
  if (!db) return;
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    savedJobs: save ? arrayUnion(jobId) : arrayRemove(jobId),
  });
};

export const toggleSavedFreelancer = async (userId: string, freelancerId: string, save: boolean): Promise<void> => {
  if (!db) return;
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    savedFreelancers: save ? arrayUnion(freelancerId) : arrayRemove(freelancerId),
  });
};

// =====================
// JOB INVITATIONS
// =====================

export const sendJobInvitation = async (
  jobId: string,
  freelancerId: string,
  jobmasterId: string,
  message?: string,
): Promise<string | null> => {
  if (!db) return null;
  const ref = await addDoc(collection(db, 'invitations'), {
    jobId,
    freelancerId,
    jobmasterId,
    message: message || '',
    status: 'pending',
    createdAt: serverTimestamp(),
  });

  // Also notify the freelancer
  await createNotification({
    recipientId: freelancerId,
    type: 'job_invitation',
    title: 'Bạn được mời tham gia dự án',
    body: message || 'Một Jobmaster đã mời bạn apply cho dự án của họ.',
    link: `/freelancer/jobs/${jobId}`,
    read: false,
  });

  return ref.id;
};

export const respondToInvitation = async (
  invitationId: string,
  response: 'accepted' | 'declined',
): Promise<void> => {
  if (!db) return;
  await updateDoc(doc(db, 'invitations', invitationId), {
    status: response,
    respondedAt: serverTimestamp(),
  });
};

// =====================
// SAVED QUERIES — getSavedJobs, getSavedFreelancers
// =====================

export const getSavedJobs = async (userId: string): Promise<string[]> => {
  if (!db) return [];
  const snap = await getDoc(doc(db, 'users', userId));
  if (!snap.exists()) return [];
  return (snap.data().savedJobs || []) as string[];
};

export const getSavedFreelancers = async (userId: string): Promise<string[]> => {
  if (!db) return [];
  const snap = await getDoc(doc(db, 'users', userId));
  if (!snap.exists()) return [];
  return (snap.data().savedFreelancers || []) as string[];
};

// =====================
// REHIRE — Collaboration History
// =====================

export const getCollaborationHistory = async (
  jobmasterId: string,
  freelancerId: string,
): Promise<number> => {
  if (!db) return 0;
  const q = query(
    collection(db, 'jobs'),
    where('jobMaster', '==', jobmasterId),
    where('assignedTo', '==', freelancerId),
    where('status', 'in', ['completed', 'paid']),
  );
  const snap = await getDocs(q);
  return snap.size;
};

export const rehireFreelancer = async (
  jobId: string,
  freelancerId: string,
  freelancerName: string,
): Promise<void> => {
  if (!db) return;
  const jobRef = doc(db, 'jobs', jobId);
  await updateDoc(jobRef, {
    assignedTo: freelancerId,
    assignedWorkerName: freelancerName,
    status: 'assigned',
    escrowStatus: 'not_started',
  });

  // Notify the freelancer
  await createNotification({
    recipientId: freelancerId,
    type: 'application_accepted',
    title: 'Bạn được giao dự án mới!',
    body: `Bạn được thuê lại cho dự án mới.`,
    link: `/freelancer/jobs/${jobId}`,
    read: false,
  });
};

// =====================
// INVITATIONS — Query for freelancer
// =====================

export const getInvitationsForFreelancer = async (
  freelancerId: string,
): Promise<Array<{ id: string; jobId: string; jobmasterId: string; message: string; status: string; createdAt: unknown }>> => {
  if (!db) return [];
  const q = query(
    collection(db, 'invitations'),
    where('freelancerId', '==', freelancerId),
    where('status', '==', 'pending'),
    orderBy('createdAt', 'desc'),
    limit(10),
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as { id: string; jobId: string; jobmasterId: string; message: string; status: string; createdAt: unknown }));
};

// =====================
// PROGRESS UPDATE
// =====================

export const updateJobProgress = async (
  jobId: string,
  progress: number,
): Promise<void> => {
  if (!db) return;
  await updateDoc(doc(db, 'jobs', jobId), { progress });
};

// =====================
// REVIEWS
// =====================

/**
 * Submit a review for a completed job
 */
export const submitReview = async (review: {
  jobId: string;
  jobTitle: string;
  reviewerId: string;
  reviewerName: string;
  reviewerRole: 'freelancer' | 'jobmaster';
  revieweeId: string;
  revieweeName: string;
  rating: number;
  communication: number;
  quality: number;
  timeliness: number;
  comment: string;
}): Promise<string | null> => {
  if (!db) return null;
  const ref = await addDoc(collection(db, 'reviews'), {
    ...review,
    visible: false,
    createdAt: serverTimestamp(),
  });

  // Check if both sides have reviewed -> make both visible
  const existingReviews = await getDocs(
    query(
      collection(db, 'reviews'),
      where('jobId', '==', review.jobId),
    )
  );

  const reviewerRoles = new Set(existingReviews.docs.map(d => d.data().reviewerRole));
  if (reviewerRoles.has('freelancer') && reviewerRoles.has('jobmaster')) {
    const batch = writeBatch(db);
    existingReviews.docs.forEach(d => batch.update(d.ref, { visible: true }));
    await batch.commit();
  }

  return ref.id;
};

/**
 * Check if a user has already reviewed a job
 */
export const hasUserReviewedJob = async (
  jobId: string,
  reviewerId: string,
): Promise<boolean> => {
  if (!db) return false;
  const q = query(
    collection(db, 'reviews'),
    where('jobId', '==', jobId),
    where('reviewerId', '==', reviewerId),
    limit(1),
  );
  const snap = await getDocs(q);
  return !snap.empty;
};

/**
 * Count active jobs for a freelancer (assigned, in_progress, review)
 */
export const getActiveJobCount = async (freelancerId: string): Promise<number> => {
  if (!db) return 0;
  const q = query(
    collection(db, 'jobs'),
    where('assignedTo', '==', freelancerId),
    where('status', 'in', ['assigned', 'in_progress', 'review']),
  );
  const snap = await getDocs(q);
  return snap.size;
};

// =====================
// JOB INVITATIONS — Types & getInvitationsForJob
// =====================

export interface JobInvitation {
  id: string;
  jobId: string;
  jobTitle?: string;
  freelancerId: string;
  freelancerName?: string;
  jobmasterId?: string;
  invitedBy?: string;
  invitedByName?: string;
  message?: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: unknown;
  respondedAt?: unknown;
}

/**
 * Get invitations sent by a jobmaster for a specific job
 */
export const getInvitationsForJob = async (jobId: string): Promise<JobInvitation[]> => {
  if (!db) return [];
  const q = query(
    collection(db, 'invitations'),
    where('jobId', '==', jobId),
    orderBy('createdAt', 'desc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as JobInvitation));
};
