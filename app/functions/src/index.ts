import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import {
  onDocumentCreated,
  onDocumentUpdated,
} from 'firebase-functions/v2/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import PDFDocument from 'pdfkit';

initializeApp();
const db = getFirestore();
const storage = getStorage();

// ============================================================
// HELPER: Create notification document
// ============================================================
async function createNotification(data: {
  recipientId: string;
  type: string;
  title: string;
  body: string;
  link: string;
  metadata?: Record<string, unknown>;
}) {
  await db.collection('notifications').add({
    ...data,
    read: false,
    createdAt: FieldValue.serverTimestamp(),
  });
}

// Helper: get users by role
async function getUsersByRole(role: string): Promise<string[]> {
  const snap = await db.collection('users').where('role', '==', role).get();
  return snap.docs.map(d => d.id);
}

// ============================================================
// HELPER: Check and award badges
// ============================================================
async function checkAndAwardBadges(userId: string) {
  const userSnap = await db.collection('users').doc(userId).get();
  if (!userSnap.exists) return;

  const user = userSnap.data()!;
  const stats = user.stats || {};
  const badgesRef = db.collection('users').doc(userId).collection('badges');
  const existingBadges = await badgesRef.get();
  const existingTypes = new Set(existingBadges.docs.map(d => d.data().badgeType));

  // Loyal Partner: 20+ completed jobs
  if (stats.completedJobs >= 20 && !existingTypes.has('loyal_partner')) {
    await badgesRef.add({
      badgeType: 'loyal_partner',
      earnedAt: FieldValue.serverTimestamp(),
    });
    await createNotification({
      recipientId: userId,
      type: 'badge_earned',
      title: 'Huy hiệu mới: Loyal Partner!',
      body: 'Bạn đã hoàn thành 20+ job. Cảm ơn sự gắn bó!',
      link: `/freelancer`,
    });
  }

  // 5 Stars: avg rating >= 4.8 with 5+ ratings
  if (stats.avgRating >= 4.8 && stats.ratingCount >= 5 && !existingTypes.has('5_stars')) {
    await badgesRef.add({
      badgeType: '5_stars',
      earnedAt: FieldValue.serverTimestamp(),
    });
    await createNotification({
      recipientId: userId,
      type: 'badge_earned',
      title: 'Huy hiệu mới: 5 Stars!',
      body: 'Chất lượng công việc của bạn luôn xuất sắc!',
      link: `/freelancer`,
    });
  }
}

// ============================================================
// 1. onCreateContractPDF — Generate PDF on contract creation
// ============================================================
export const onCreateContractPDF = onDocumentCreated(
  'contracts/{contractId}',
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const contract = snap.data();
    const contractId = event.params.contractId;
    const bucket = storage.bucket();
    const filePath = `contracts/${contractId}.pdf`;
    const doc = new PDFDocument();

    const buffers: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => buffers.push(chunk));

    // Simple PDF Structure
    doc.fontSize(20).text('CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM', { align: 'center' });
    doc.fontSize(16).text('HỢP ĐỒNG KINH TẾ (THIẾT KẾ / OUTSOURCING)', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Số hợp đồng: ${contract.contractNumber}`);
    doc.text(`Tên dự án: ${contract.jobTitle}`);
    doc.moveDown();
    doc.text(`BÊN A (Chủ sở hữu): ${contract.partyA?.name || ''}`);
    doc.text(`BÊN B (Freelancer): ${contract.partyB?.name || ''}`);
    doc.moveDown();
    doc.text('ĐIỀU KHOẢN THANH TOÁN:');
    doc.text(contract.paymentTerms || '');
    doc.moveDown();
    doc.text('XÁC NHẬN KÝ KẾT ĐIỆN TỬ:');
    doc.text(`Thời điểm khởi tạo: ${new Date().toLocaleString('vi-VN')}`);

    doc.end();

    return new Promise<void>((resolve, reject) => {
      doc.on('end', async () => {
        try {
          const finalBuffer = Buffer.concat(buffers);
          const file = bucket.file(filePath);
          await file.save(finalBuffer, {
            metadata: { contentType: 'application/pdf' },
          });

          const pdfURL = `https://storage.googleapis.com/${bucket.name}/${filePath}`;
          await snap.ref.update({ pdfURL });
          resolve();
        } catch (err) {
          reject(err);
        }
      });
      doc.on('error', reject);
    });
  }
);

// ============================================================
// 2. requestPaymentOrder — Callable function for payment orders
//    A1: Uses transaction to prevent race conditions
//    A2: Idempotency check to prevent duplicate payments
// ============================================================
export const requestPaymentOrder = onCall(
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Yêu cầu đăng nhập.');
    }

    const { jobId, milestoneId, amount, workerId, workerName, reason } = request.data;

    // Verify Role is Job Master or Admin via collection lookup
    const userSnap = await db.collection('users').doc(request.auth.uid).get();
    const profile = userSnap.data();
    if (!profile || (profile.role !== 'jobmaster' && profile.role !== 'admin')) {
      throw new HttpsError('permission-denied', 'Bạn không có quyền thực hiện thanh toán.');
    }

    // A2: Idempotency — check if payment for this milestone already exists
    const existingPayment = await db.collection('payments')
      .where('jobId', '==', jobId)
      .where('milestoneId', '==', milestoneId)
      .where('status', 'in', ['pending', 'approved', 'paid'])
      .limit(1)
      .get();

    if (!existingPayment.empty) {
      throw new HttpsError(
        'already-exists',
        `Yêu cầu thanh toán cho milestone này đã tồn tại (ID: ${existingPayment.docs[0].id}).`
      );
    }

    // A1: Use Firestore transaction to prevent race conditions
    const paymentId = await db.runTransaction(async (transaction) => {
      const jobRef = db.collection('jobs').doc(jobId);
      const jobSnap = await transaction.get(jobRef);
      const jobData = jobSnap.data();

      if (!jobData) {
        throw new HttpsError('not-found', 'Job không tồn tại.');
      }

      // Verify milestone exists and is not already approved/paid
      if (jobData.milestones) {
        const milestone = jobData.milestones.find((m: any) => m.id === milestoneId);
        if (!milestone) {
          throw new HttpsError('not-found', 'Milestone không tồn tại.');
        }
        if (milestone.status === 'approved' || milestone.status === 'paid') {
          throw new HttpsError('failed-precondition', 'Milestone này đã được duyệt.');
        }
      }

      // Create payment document within transaction
      const paymentRef = db.collection('payments').doc();
      transaction.set(paymentRef, {
        jobId,
        milestoneId,
        workerId,
        workerName,
        amount,
        reason,
        status: 'pending',
        triggeredByMilestone: true,
        approvedByJobMaster: request.auth!.uid,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      // Update milestone status atomically
      if (jobData.milestones) {
        const updatedMilestones = jobData.milestones.map((m: any) =>
          m.id === milestoneId
            ? { ...m, status: 'approved', approvedBy: request.auth!.uid, approvedAt: new Date() }
            : m
        );
        transaction.update(jobRef, { milestones: updatedMilestones });
      }

      return paymentRef.id;
    });

    return { success: true, paymentId };
  }
);

// ============================================================
// 3. onJobStatusChange — When job status changes
// ============================================================
export const onJobStatusChange = onDocumentUpdated(
  'jobs/{jobId}',
  async (event) => {
    const change = event.data;
    if (!change) return;

    const before = change.before.data();
    const after = change.after.data();
    const jobId = event.params.jobId;

    // Job approved: pending_approval -> open
    if (before.status === 'pending_approval' && after.status === 'open') {
      const category = after.category;
      const matchingUsers = await db.collection('users')
        .where('role', '==', 'freelancer')
        .where('specialties', 'array-contains', category)
        .where('status', '==', 'active')
        .limit(100)
        .get();

      const batch = db.batch();
      matchingUsers.docs.forEach(userDoc => {
        const notifRef = db.collection('notifications').doc();
        batch.set(notifRef, {
          recipientId: userDoc.id,
          type: 'job_new',
          title: 'Job mới phù hợp với bạn!',
          body: `"${after.title}" (${category}) - ${after.level} - Thù lao: ${Number(after.totalFee).toLocaleString('vi-VN')}₫`,
          link: `/jobs/${jobId}`,
          read: false,
          createdAt: FieldValue.serverTimestamp(),
        });
      });
      await batch.commit();
    }

    // Job assigned: open -> assigned
    if (before.status !== 'assigned' && after.status === 'assigned' && after.assignedTo) {
      await createNotification({
        recipientId: after.assignedTo,
        type: 'application_accepted',
        title: 'Chúc mừng! Bạn đã được chọn',
        body: `Bạn đã được chọn nhận job "${after.title}". Hãy kiểm tra hợp đồng.`,
        link: `/freelancer/jobs/${jobId}`,
      });
    }

    // Job completed: review -> completed
    if (before.status !== 'completed' && after.status === 'completed') {
      const admins = await getUsersByRole('admin');
      for (const adminId of admins) {
        await createNotification({
          recipientId: adminId,
          type: 'progress_update',
          title: 'Job hoàn thành nghiệm thu',
          body: `Job "${after.title}" đã hoàn thành nghiệm thu.`,
          link: `/admin`,
        });
      }

      // Update worker stats
      if (after.assignedTo) {
        const workerRef = db.collection('users').doc(after.assignedTo);
        const workerSnap = await workerRef.get();
        if (workerSnap.exists) {
          const stats = workerSnap.data()?.stats || {};
          await workerRef.update({
            'stats.completedJobs': (stats.completedJobs || 0) + 1,
            updatedAt: FieldValue.serverTimestamp(),
          });

          await checkAndAwardBadges(after.assignedTo);
        }
      }
    }
  }
);

// ============================================================
// 4. onApplicationSubmitted — Notify job master + admin
// ============================================================
export const onApplicationSubmitted = onDocumentCreated(
  'applications/{applicationId}',
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const application = snap.data();
    const jobSnap = await db.collection('jobs').doc(application.jobId).get();
    const job = jobSnap.data();

    if (!job) return;

    // Notify Job Master
    if (job.jobMaster) {
      await createNotification({
        recipientId: job.jobMaster,
        type: 'application_received',
        title: 'Ứng tuyển mới',
        body: `${application.applicantName || application.freelancerName || 'Ứng viên'} đã ứng tuyển job "${job.title}"`,
        link: `/jobmaster/applications`,
      });
    }

    // Notify Admins
    const admins = await getUsersByRole('admin');
    for (const adminId of admins) {
      await createNotification({
        recipientId: adminId,
        type: 'application_received',
        title: 'Ứng tuyển mới',
        body: `${application.applicantName || application.freelancerName || 'Ứng viên'} ứng tuyển "${job.title}"`,
        link: `/admin`,
      });
    }
  }
);

// ============================================================
// 5. onApplicationUpdated — Notify freelancer on accept/reject
// ============================================================
export const onApplicationUpdated = onDocumentUpdated(
  'applications/{applicationId}',
  async (event) => {
    const change = event.data;
    if (!change) return;

    const before = change.before.data();
    const after = change.after.data();

    // Application accepted
    if (before.status !== 'accepted' && after.status === 'accepted') {
      await createNotification({
        recipientId: after.freelancerId,
        type: 'application_accepted',
        title: 'Ứng tuyển được chấp nhận!',
        body: `Ứng tuyển của bạn cho job đã được chấp nhận. Hãy kiểm tra hợp đồng.`,
        link: `/freelancer/contracts`,
      });
    }

    // Application rejected
    if (before.status !== 'rejected' && after.status === 'rejected') {
      await createNotification({
        recipientId: after.freelancerId,
        type: 'application_rejected',
        title: 'Ứng tuyển không được chọn',
        body: after.rejectionReason
          ? `Lý do: ${after.rejectionReason}`
          : 'Ứng tuyển của bạn chưa phù hợp lần này. Hãy thử lại với job khác!',
        link: `/freelancer/jobs`,
      });
    }
  }
);

// ============================================================
// 6. onPaymentUpdated — Notify freelancer + admin on payment
// ============================================================
export const onPaymentUpdated = onDocumentUpdated(
  'payments/{paymentId}',
  async (event) => {
    const change = event.data;
    if (!change) return;

    const before = change.before.data();
    const after = change.after.data();

    // Payment marked as paid
    if (before.status !== 'paid' && after.status === 'paid') {
      // Notify freelancer
      await createNotification({
        recipientId: after.workerId,
        type: 'payment_completed',
        title: 'Đã thanh toán!',
        body: `Bạn đã nhận thanh toán ${Number(after.amount).toLocaleString('vi-VN')}₫ cho "${after.reason}".`,
        link: `/freelancer/jobs`,
      });

      // Notify admins
      const admins = await getUsersByRole('admin');
      for (const adminId of admins) {
        await createNotification({
          recipientId: adminId,
          type: 'payment_completed',
          title: 'Thanh toán hoàn tất',
          body: `Đã TT ${Number(after.amount).toLocaleString('vi-VN')}₫ cho ${after.workerName}`,
          link: `/admin`,
        });
      }

      // Update worker earnings
      const workerRef = db.collection('users').doc(after.workerId);
      const workerSnap = await workerRef.get();
      if (workerSnap.exists) {
        const stats = workerSnap.data()?.stats || {};
        await workerRef.update({
          'stats.totalEarnings': (stats.totalEarnings || 0) + after.amount,
          'stats.currentMonthEarnings': (stats.currentMonthEarnings || 0) + after.amount,
          updatedAt: FieldValue.serverTimestamp(),
        });
      }

      // Check if all milestones for the job are paid -> mark job as 'paid'
      if (after.jobId) {
        const jobRef = db.collection('jobs').doc(after.jobId);
        const jobSnap = await jobRef.get();
        const job = jobSnap.data();
        if (job && job.milestones) {
          const allPaid = job.milestones.every((m: any) => m.status === 'paid');
          if (allPaid) {
            await jobRef.update({ status: 'paid', updatedAt: FieldValue.serverTimestamp() });
          }
        }
      }
    }

    // Payment pending -> Notify accountant
    if (before.status !== 'pending' && after.status === 'pending') {
      const accountants = await getUsersByRole('accountant');
      for (const accId of accountants) {
        await createNotification({
          recipientId: accId,
          type: 'payment_pending',
          title: 'Yêu cầu thanh toán mới',
          body: `${Number(after.amount).toLocaleString('vi-VN')}₫ cho ${after.workerName} - ${after.reason}`,
          link: `/accountant/payments`,
        });
      }
    }
  }
);

// ============================================================
// 7. onContractStatusChange — Notify freelancer to sign
// ============================================================
export const onContractStatusChange = onDocumentUpdated(
  'contracts/{contractId}',
  async (event) => {
    const change = event.data;
    if (!change) return;

    const before = change.before.data();
    const after = change.after.data();

    // Contract ready for signing
    if (before.status !== 'pending_signature' && after.status === 'pending_signature') {
      const freelancerUid = after.partyB?.uid;
      if (freelancerUid) {
        await createNotification({
          recipientId: freelancerUid,
          type: 'contract_ready',
          title: 'Hợp đồng cần ký',
          body: `Hợp đồng "${after.jobTitle}" đã sẵn sàng. Vui lòng xem và ký.`,
          link: `/freelancer/contracts`,
        });
      }
    }
  }
);

// ============================================================
// 8. scheduledDeadlineCheck — Daily cron, warn 3 days before deadline
// ============================================================
export const scheduledDeadlineCheck = onSchedule(
  {
    schedule: 'every day 09:00',
    timeZone: 'Asia/Ho_Chi_Minh',
  },
  async () => {
    const now = new Date();
    const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    const jobsSnap = await db.collection('jobs')
      .where('status', 'in', ['assigned', 'in_progress'])
      .get();

    for (const jobDoc of jobsSnap.docs) {
      const job = jobDoc.data();
      const deadline = job.deadline?.toDate ? job.deadline.toDate() : new Date(job.deadline);

      if (deadline <= threeDaysLater && deadline > now) {
        const daysLeft = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        // Notify worker
        if (job.assignedTo) {
          await createNotification({
            recipientId: job.assignedTo,
            type: 'deadline_warning',
            title: `Deadline còn ${daysLeft} ngày!`,
            body: `Job "${job.title}" sẽ đến hạn ngày ${deadline.toLocaleDateString('vi-VN')}.`,
            link: `/freelancer/jobs/${jobDoc.id}`,
          });
        }

        // Notify job master
        if (job.jobMaster) {
          await createNotification({
            recipientId: job.jobMaster,
            type: 'deadline_warning',
            title: `Deadline còn ${daysLeft} ngày`,
            body: `Job "${job.title}" — Worker: ${job.assignedWorkerName || 'N/A'}`,
            link: `/jobmaster/jobs/${jobDoc.id}`,
          });
        }
      }
    }
  }
);

// ============================================================
// 9. scheduledLeaderboard — Monthly cron, generate leaderboard
//    S3: Fixed month bug (getMonth() is 0-indexed)
//    A6: Properly computes previous month, resets currentMonthEarnings
// ============================================================
export const scheduledLeaderboard = onSchedule(
  {
    schedule: '0 0 1 * *', // 1st of every month at midnight
    timeZone: 'Asia/Ho_Chi_Minh',
  },
  async () => {
    const now = new Date();

    // S3 FIX: getMonth() is 0-indexed. On the 1st, we generate for the PREVIOUS month.
    // e.g., Running on Apr 1 → generate for March (month=3, but getMonth()=2 for March)
    const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const month = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;

    // A6: Sort by currentMonthEarnings (not totalEarnings) for monthly ranking
    const usersSnap = await db.collection('users')
      .where('role', '==', 'freelancer')
      .where('status', '==', 'active')
      .orderBy('stats.currentMonthEarnings', 'desc')
      .limit(50)
      .get();

    const batch = db.batch();

    // Clear old leaderboard for this period
    const oldEntries = await db.collection('leaderboard').where('period', '==', month).get();
    oldEntries.docs.forEach(doc => batch.delete(doc.ref));

    // Create new leaderboard entries
    let rank = 1;
    for (const userDoc of usersSnap.docs) {
      const user = userDoc.data();
      const monthlyEarnings = user.stats?.currentMonthEarnings || 0;

      // Skip users with 0 earnings for the month
      if (monthlyEarnings === 0) continue;

      const entryRef = db.collection('leaderboard').doc();
      batch.set(entryRef, {
        uid: userDoc.id,
        name: user.displayName,
        level: user.currentLevel,
        specialty: user.specialties?.[0] || '',
        earnings: monthlyEarnings,
        totalEarnings: user.stats?.totalEarnings || 0,
        rating: user.stats?.avgRating || 0,
        completedJobs: user.stats?.completedJobs || 0,
        badges: [],
        rank,
        period: month,
        type: 'monthly',
        createdAt: FieldValue.serverTimestamp(),
      });
      rank++;
    }

    // A6: Reset currentMonthEarnings for all freelancers at start of new month
    for (const userDoc of usersSnap.docs) {
      batch.update(userDoc.ref, {
        'stats.currentMonthEarnings': 0,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    await batch.commit();

    // Award Top Earner badges to top 3
    const top3 = usersSnap.docs.slice(0, 3);
    for (const userDoc of top3) {
      await checkAndAwardBadges(userDoc.id);
    }
  }
);
