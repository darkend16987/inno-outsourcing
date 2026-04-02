"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.onReviewCreated = exports.generateInvoicePDF = exports.scheduledLeaderboard = exports.scheduledDeadlineCheck = exports.onContractStatusChange = exports.onPaymentUpdated = exports.onApplicationUpdated = exports.onApplicationSubmitted = exports.onJobStatusChange = exports.requestPaymentOrder = exports.onCreateContractPDF = void 0;
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const storage_1 = require("firebase-admin/storage");
const firestore_2 = require("firebase-functions/v2/firestore");
const https_1 = require("firebase-functions/v2/https");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const pdfkit_1 = __importDefault(require("pdfkit"));
(0, app_1.initializeApp)();
const db = (0, firestore_1.getFirestore)();
const storage = (0, storage_1.getStorage)();
// ============================================================
// HELPER: Create notification document
// ============================================================
async function createNotification(data) {
    await db.collection('notifications').add({
        ...data,
        read: false,
        createdAt: firestore_1.FieldValue.serverTimestamp(),
    });
}
async function getUsersByRole(role) {
    const snap = await db.collection('users').where('role', '==', role).get();
    return snap.docs.map(d => d.id);
}
// ============================================================
// HELPER: Check and award badges (enhanced)
// ============================================================
async function checkAndAwardBadges(userId) {
    const userSnap = await db.collection('users').doc(userId).get();
    if (!userSnap.exists)
        return;
    const user = userSnap.data();
    const stats = user.stats || {};
    const badgesRef = db.collection('users').doc(userId).collection('badges');
    const existingBadges = await badgesRef.get();
    const existingTypes = new Set(existingBadges.docs.map(d => d.data().badgeType));
    const awardsToMake = [];
    // Loyal Partner: 20+ completed jobs
    if (stats.completedJobs >= 20 && !existingTypes.has('loyal_partner')) {
        awardsToMake.push({ type: 'loyal_partner', title: 'Huy hiệu mới: Loyal Partner!', body: 'Bạn đã hoàn thành 20+ job. Cảm ơn sự gắn bó!' });
    }
    // 5 Stars: avg rating >= 4.8 with 5+ ratings
    if (stats.avgRating >= 4.8 && stats.ratingCount >= 5 && !existingTypes.has('5_stars')) {
        awardsToMake.push({ type: '5_stars', title: 'Huy hiệu mới: 5 Stars!', body: 'Chất lượng công việc của bạn luôn xuất sắc!' });
    }
    // Speed Master: 5+ on-time jobs (onTimeRate >= 0.9 with 5+ jobs)
    if (stats.completedJobs >= 5 && (stats.onTimeRate || 0) >= 0.9 && !existingTypes.has('speed_master')) {
        awardsToMake.push({ type: 'speed_master', title: 'Huy hiệu mới: Speed Master!', body: 'Bạn luôn hoàn thành đúng hạn. Ấn tượng!' });
    }
    // Rising Star: 3+ jobs completed && account < 90 days old
    if (stats.completedJobs >= 3 && !existingTypes.has('rising_star')) {
        const createdAt = user.createdAt?.toDate ? user.createdAt.toDate() : new Date(user.createdAt);
        const daysSinceCreation = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceCreation <= 90) {
            awardsToMake.push({ type: 'rising_star', title: 'Huy hiệu mới: Rising Star!', body: '3 job hoàn thành trong 90 ngày đầu. Bạn thật nổi bật!' });
        }
    }
    for (const award of awardsToMake) {
        await badgesRef.add({ badgeType: award.type, earnedAt: firestore_1.FieldValue.serverTimestamp() });
        await createNotification({
            recipientId: userId, type: 'badge_earned',
            title: award.title, body: award.body, link: `/freelancer`,
        });
    }
}
// ============================================================
// HELPER: Auto-score an application
// ============================================================
async function computeMatchScore(applicationData, jobData) {
    const applicantSnap = await db.collection('users').doc(applicationData.applicantId).get();
    const applicant = applicantSnap.exists ? applicantSnap.data() : {};
    const reasons = [];
    let totalScore = 0;
    const w = { skill: 0.25, level: 0.2, history: 0.15, availability: 0.1, price: 0.15, rating: 0.15 };
    // SkillMatch
    const userSkills = [...(applicant.specialties || []), ...(applicant.software || [])];
    const jobSkills = [...(jobData.requirements?.software || []), jobData.category].filter(Boolean);
    const overlap = userSkills.filter((s) => jobSkills.some((j) => j.toLowerCase() === s.toLowerCase()));
    const skillScore = jobSkills.length > 0 ? Math.min(1, overlap.length / jobSkills.length) : 0.5;
    if (skillScore >= 0.7)
        reasons.push(`Kỹ năng phù hợp ${Math.round(skillScore * 100)}%`);
    totalScore += w.skill * skillScore;
    // LevelMatch
    const levels = ['L1', 'L2', 'L3', 'L4', 'L5'];
    const userIdx = levels.indexOf(applicant.currentLevel || 'L1');
    const jobIdx = levels.indexOf(jobData.level || 'L1');
    const levelDiff = Math.abs(userIdx - jobIdx);
    const levelScore = Math.max(0, 1 - levelDiff * 0.25);
    if (levelScore >= 0.75)
        reasons.push(`Level phù hợp`);
    totalScore += w.level * levelScore;
    // HistoryScore
    const historyJobs = await db.collection('jobs')
        .where('assignedTo', '==', applicationData.applicantId)
        .where('status', '==', 'completed')
        .where('category', '==', jobData.category)
        .limit(20).get();
    const historyScore = Math.min(1, historyJobs.size / 5);
    if (historyJobs.size > 0)
        reasons.push(`${historyJobs.size} job cùng lĩnh vực`);
    totalScore += w.history * historyScore;
    // AvailabilityScore
    const activeJobs = await db.collection('jobs')
        .where('assignedTo', '==', applicationData.applicantId)
        .where('status', 'in', ['assigned', 'in_progress'])
        .limit(5).get();
    const availScore = activeJobs.size === 0 ? 1 : activeJobs.size <= 2 ? 0.5 : 0.2;
    if (availScore >= 0.5)
        reasons.push('Sẵn sàng nhận việc');
    totalScore += w.availability * availScore;
    // PriceScore
    const expectedFee = applicationData.expectedFee || 0;
    const budget = jobData.totalFee || 0;
    const priceScore = budget > 0 && expectedFee > 0
        ? Math.max(0, 1 - Math.abs(expectedFee - budget) / budget) : 0.5;
    if (priceScore >= 0.8)
        reasons.push('Giá phù hợp ngân sách');
    totalScore += w.price * priceScore;
    // RatingScore
    const stats = applicant.stats || {};
    const ratingScore = ((stats.avgRating || 0) / 5) * 0.7 + ((stats.onTimeRate || 0)) * 0.3;
    if ((stats.avgRating || 0) >= 4.0)
        reasons.push(`Rating ${stats.avgRating}/5`);
    totalScore += w.rating * ratingScore;
    const finalScore = Math.round(totalScore * 100);
    const badge = finalScore >= 85 ? 'top_match' : finalScore >= 65 ? 'recommended' : null;
    return { score: finalScore, badge, reasons };
}
// ============================================================
// 1. onCreateContractPDF
// ============================================================
exports.onCreateContractPDF = (0, firestore_2.onDocumentCreated)('contracts/{contractId}', async (event) => {
    const snap = event.data;
    if (!snap)
        return;
    const contract = snap.data();
    const contractId = event.params.contractId;
    const bucket = storage.bucket();
    const filePath = `contracts/${contractId}.pdf`;
    const doc = new pdfkit_1.default();
    const buffers = [];
    doc.on('data', (chunk) => buffers.push(chunk));
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
    return new Promise((resolve, reject) => {
        doc.on('end', async () => {
            try {
                const finalBuffer = Buffer.concat(buffers);
                const file = bucket.file(filePath);
                await file.save(finalBuffer, { metadata: { contentType: 'application/pdf' } });
                const pdfURL = `https://storage.googleapis.com/${bucket.name}/${filePath}`;
                await snap.ref.update({ pdfURL });
                resolve();
            }
            catch (err) {
                reject(err);
            }
        });
        doc.on('error', reject);
    });
});
// ============================================================
// 2. requestPaymentOrder — with escrow release
// ============================================================
exports.requestPaymentOrder = (0, https_1.onCall)(async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError('unauthenticated', 'Yêu cầu đăng nhập.');
    const { jobId, milestoneId, amount, workerId, workerName, reason } = request.data;
    const userSnap = await db.collection('users').doc(request.auth.uid).get();
    const profile = userSnap.data();
    if (!profile || (profile.role !== 'jobmaster' && profile.role !== 'admin')) {
        throw new https_1.HttpsError('permission-denied', 'Bạn không có quyền thực hiện thanh toán.');
    }
    const existingPayment = await db.collection('payments')
        .where('jobId', '==', jobId).where('milestoneId', '==', milestoneId)
        .where('status', 'in', ['pending', 'approved', 'paid']).limit(1).get();
    if (!existingPayment.empty) {
        throw new https_1.HttpsError('already-exists', `Yêu cầu thanh toán cho milestone này đã tồn tại.`);
    }
    const paymentId = await db.runTransaction(async (transaction) => {
        const jobRef = db.collection('jobs').doc(jobId);
        const jobSnap = await transaction.get(jobRef);
        const jobData = jobSnap.data();
        if (!jobData)
            throw new https_1.HttpsError('not-found', 'Job không tồn tại.');
        if (jobData.milestones) {
            const milestone = jobData.milestones.find((m) => m.id === milestoneId);
            if (!milestone)
                throw new https_1.HttpsError('not-found', 'Milestone không tồn tại.');
            if (milestone.status === 'approved' || milestone.status === 'paid') {
                throw new https_1.HttpsError('failed-precondition', 'Milestone này đã được duyệt.');
            }
            // C3: Update milestone + escrow status
            const updatedMilestones = jobData.milestones.map((m) => m.id === milestoneId
                ? { ...m, status: 'approved', approvedBy: request.auth.uid, approvedAt: new Date() }
                : m);
            const allApproved = updatedMilestones.every((m) => m.status === 'approved' || m.status === 'paid' || m.status === 'released');
            const escrowStatus = allApproved ? 'fully_released' : 'partially_released';
            transaction.update(jobRef, { milestones: updatedMilestones, escrowStatus });
        }
        const paymentRef = db.collection('payments').doc();
        transaction.set(paymentRef, {
            jobId, milestoneId, workerId, workerName, amount, reason,
            status: 'pending', triggeredByMilestone: true,
            approvedByJobMaster: request.auth.uid,
            createdAt: firestore_1.FieldValue.serverTimestamp(), updatedAt: firestore_1.FieldValue.serverTimestamp(),
        });
        return paymentRef.id;
    });
    return { success: true, paymentId };
});
// ============================================================
// 3. onJobStatusChange
// ============================================================
exports.onJobStatusChange = (0, firestore_2.onDocumentUpdated)('jobs/{jobId}', async (event) => {
    const change = event.data;
    if (!change)
        return;
    const before = change.before.data();
    const after = change.after.data();
    const jobId = event.params.jobId;
    // Job approved: pending_approval -> open
    if (before.status === 'pending_approval' && after.status === 'open') {
        const matchingUsers = await db.collection('users')
            .where('role', '==', 'freelancer').where('specialties', 'array-contains', after.category)
            .where('status', '==', 'active').limit(100).get();
        const batch = db.batch();
        matchingUsers.docs.forEach(userDoc => {
            const notifRef = db.collection('notifications').doc();
            batch.set(notifRef, {
                recipientId: userDoc.id, type: 'job_new',
                title: 'Job mới phù hợp với bạn!',
                body: `"${after.title}" (${after.category}) - ${after.level} - Thù lao: ${Number(after.totalFee).toLocaleString('vi-VN')}₫`,
                link: `/jobs/${jobId}`, read: false, createdAt: firestore_1.FieldValue.serverTimestamp(),
            });
        });
        await batch.commit();
    }
    // Job assigned
    if (before.status !== 'assigned' && after.status === 'assigned' && after.assignedTo) {
        await createNotification({
            recipientId: after.assignedTo, type: 'application_accepted',
            title: 'Chúc mừng! Bạn đã được chọn',
            body: `Bạn đã được chọn nhận job "${after.title}". Hãy kiểm tra hợp đồng.`,
            link: `/freelancer/jobs/${jobId}`,
        });
    }
    // Job completed
    if (before.status !== 'completed' && after.status === 'completed') {
        const admins = await getUsersByRole('admin');
        for (const adminId of admins) {
            await createNotification({
                recipientId: adminId, type: 'progress_update',
                title: 'Job hoàn thành nghiệm thu',
                body: `Job "${after.title}" đã hoàn thành nghiệm thu.`, link: `/admin`,
            });
        }
        if (after.assignedTo) {
            const workerRef = db.collection('users').doc(after.assignedTo);
            const workerSnap = await workerRef.get();
            if (workerSnap.exists) {
                const stats = workerSnap.data()?.stats || {};
                await workerRef.update({
                    'stats.completedJobs': (stats.completedJobs || 0) + 1,
                    updatedAt: firestore_1.FieldValue.serverTimestamp(),
                });
                await checkAndAwardBadges(after.assignedTo);
            }
        }
    }
});
// ============================================================
// 4. onApplicationSubmitted — with auto-scoring (C2)
// ============================================================
exports.onApplicationSubmitted = (0, firestore_2.onDocumentCreated)('applications/{applicationId}', async (event) => {
    const snap = event.data;
    if (!snap)
        return;
    const application = snap.data();
    const jobSnap = await db.collection('jobs').doc(application.jobId).get();
    const job = jobSnap.data();
    if (!job)
        return;
    // C2: Auto-score
    try {
        const { score, badge, reasons } = await computeMatchScore(application, job);
        await snap.ref.update({ matchScore: score, matchBadge: badge, matchReasons: reasons });
    }
    catch (e) {
        console.error('Auto-scoring failed:', e);
    }
    // Notify Job Master
    if (job.jobMaster) {
        await createNotification({
            recipientId: job.jobMaster, type: 'application_received',
            title: 'Ứng tuyển mới',
            body: `${application.applicantName || 'Ứng viên'} đã ứng tuyển job "${job.title}"`,
            link: `/jobmaster/applications`,
        });
    }
    const admins = await getUsersByRole('admin');
    for (const adminId of admins) {
        await createNotification({
            recipientId: adminId, type: 'application_received',
            title: 'Ứng tuyển mới',
            body: `${application.applicantName || 'Ứng viên'} ứng tuyển "${job.title}"`, link: `/admin`,
        });
    }
});
// ============================================================
// 5. onApplicationUpdated
// ============================================================
exports.onApplicationUpdated = (0, firestore_2.onDocumentUpdated)('applications/{applicationId}', async (event) => {
    const change = event.data;
    if (!change)
        return;
    const before = change.before.data();
    const after = change.after.data();
    if (before.status !== 'accepted' && after.status === 'accepted') {
        await createNotification({
            recipientId: after.freelancerId, type: 'application_accepted',
            title: 'Ứng tuyển được chấp nhận!',
            body: `Ứng tuyển của bạn cho job đã được chấp nhận. Hãy kiểm tra hợp đồng.`,
            link: `/freelancer/contracts`,
        });
    }
    if (before.status !== 'rejected' && after.status === 'rejected') {
        await createNotification({
            recipientId: after.freelancerId, type: 'application_rejected',
            title: 'Ứng tuyển không được chọn',
            body: after.rejectionReason || 'Ứng tuyển của bạn chưa phù hợp lần này.',
            link: `/freelancer/jobs`,
        });
    }
});
// ============================================================
// 6. onPaymentUpdated — with auto-invoice generation
// ============================================================
exports.onPaymentUpdated = (0, firestore_2.onDocumentUpdated)('payments/{paymentId}', async (event) => {
    const change = event.data;
    if (!change)
        return;
    const before = change.before.data();
    const after = change.after.data();
    const paymentId = event.params.paymentId;
    // Payment marked as paid
    if (before.status !== 'paid' && after.status === 'paid') {
        await createNotification({
            recipientId: after.workerId, type: 'payment_completed',
            title: 'Đã thanh toán!',
            body: `Bạn đã nhận thanh toán ${Number(after.amount).toLocaleString('vi-VN')}₫.`,
            link: `/freelancer/jobs`,
        });
        const admins = await getUsersByRole('admin');
        for (const adminId of admins) {
            await createNotification({
                recipientId: adminId, type: 'payment_completed',
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
                updatedAt: firestore_1.FieldValue.serverTimestamp(),
            });
        }
        // Check all milestones paid -> mark job as paid
        if (after.jobId) {
            const jobRef = db.collection('jobs').doc(after.jobId);
            const jobSnap = await jobRef.get();
            const job = jobSnap.data();
            if (job?.milestones) {
                const allPaid = job.milestones.every((m) => m.status === 'paid');
                if (allPaid)
                    await jobRef.update({ status: 'paid', updatedAt: firestore_1.FieldValue.serverTimestamp() });
            }
        }
        // Auto-generate Invoice
        try {
            const now = new Date();
            const seq = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
            const countSnap = await db.collection('invoices').where('invoiceNumber', '>=', `INV-${seq}`).get();
            const invoiceNumber = `INV-${seq}-${String(countSnap.size + 1).padStart(3, '0')}`;
            // Fetch job info for invoice
            let jobTitle = after.reason || '';
            let partyAName = 'VAA Engineering';
            if (after.jobId) {
                const jSnap = await db.collection('jobs').doc(after.jobId).get();
                if (jSnap.exists) {
                    jobTitle = jSnap.data()?.title || jobTitle;
                }
            }
            const workerData = workerSnap.exists ? workerSnap.data() : {};
            await db.collection('invoices').add({
                invoiceNumber, jobId: after.jobId || '', jobTitle, paymentId,
                milestoneId: after.milestoneId || '',
                partyA: { name: partyAName, representative: 'Giám đốc' },
                partyB: {
                    name: after.workerName || workerData.displayName || '',
                    idNumber: workerData.idNumber || '',
                    bankAccount: workerData.bankAccountNumber || '',
                    bankName: workerData.bankName || '',
                },
                amount: after.amount, description: `Thanh toán cho: ${jobTitle}`,
                status: 'issued', issuedAt: firestore_1.FieldValue.serverTimestamp(), createdAt: firestore_1.FieldValue.serverTimestamp(),
            });
        }
        catch (e) {
            console.error('Invoice auto-generation failed:', e);
        }
    }
    // Payment pending -> Notify accountant
    if (before.status !== 'pending' && after.status === 'pending') {
        const accountants = await getUsersByRole('accountant');
        for (const accId of accountants) {
            await createNotification({
                recipientId: accId, type: 'payment_pending',
                title: 'Yêu cầu thanh toán mới',
                body: `${Number(after.amount).toLocaleString('vi-VN')}₫ cho ${after.workerName}`,
                link: `/accountant/payments`,
            });
        }
    }
});
// ============================================================
// 7. onContractStatusChange
// ============================================================
exports.onContractStatusChange = (0, firestore_2.onDocumentUpdated)('contracts/{contractId}', async (event) => {
    const change = event.data;
    if (!change)
        return;
    const before = change.before.data();
    const after = change.after.data();
    if (before.status !== 'pending_signature' && after.status === 'pending_signature') {
        const freelancerUid = after.partyB?.uid;
        if (freelancerUid) {
            await createNotification({
                recipientId: freelancerUid, type: 'contract_ready',
                title: 'Hợp đồng cần ký',
                body: `Hợp đồng "${after.jobTitle}" đã sẵn sàng. Vui lòng xem và ký.`,
                link: `/freelancer/contracts`,
            });
        }
    }
});
// ============================================================
// 8. scheduledDeadlineCheck — Multi-tier (C1)
// ============================================================
exports.scheduledDeadlineCheck = (0, scheduler_1.onSchedule)({ schedule: 'every day 09:00', timeZone: 'Asia/Ho_Chi_Minh' }, async () => {
    const now = new Date();
    const jobsSnap = await db.collection('jobs')
        .where('status', 'in', ['assigned', 'in_progress']).get();
    for (const jobDoc of jobsSnap.docs) {
        const job = jobDoc.data();
        const deadline = job.deadline?.toDate ? job.deadline.toDate() : new Date(job.deadline);
        const daysLeft = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        let tier = null;
        let tierType = null;
        if (daysLeft < 0) {
            tier = 'QUÁ HẠN';
            tierType = 'deadline_overdue';
        }
        else if (daysLeft <= 1) {
            tier = '1 ngày';
            tierType = 'deadline_1day';
        }
        else if (daysLeft <= 3) {
            tier = `${daysLeft} ngày`;
            tierType = 'deadline_3days';
        }
        else if (daysLeft <= 7) {
            tier = `${daysLeft} ngày`;
            tierType = 'deadline_7days';
        }
        if (!tier || !tierType)
            continue;
        // Dedup: check if we already sent this tier today
        const today = now.toISOString().split('T')[0];
        const existing = await db.collection('notifications')
            .where('type', '==', tierType)
            .where('metadata.jobId', '==', jobDoc.id)
            .where('metadata.date', '==', today)
            .limit(1).get();
        if (!existing.empty)
            continue;
        const titleText = daysLeft < 0 ? `Deadline đã QUÁ HẠN!` : `Deadline còn ${tier}!`;
        const targets = [job.assignedTo, job.jobMaster].filter(Boolean);
        for (const uid of targets) {
            await createNotification({
                recipientId: uid, type: tierType,
                title: titleText,
                body: `Job "${job.title}" - Hạn: ${deadline.toLocaleDateString('vi-VN')}`,
                link: `/freelancer/jobs/${jobDoc.id}`,
                metadata: { jobId: jobDoc.id, date: today },
            });
        }
    }
});
// ============================================================
// 9. scheduledLeaderboard
// ============================================================
exports.scheduledLeaderboard = (0, scheduler_1.onSchedule)({ schedule: '0 0 1 * *', timeZone: 'Asia/Ho_Chi_Minh' }, async () => {
    const now = new Date();
    const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const month = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;
    const usersSnap = await db.collection('users')
        .where('role', '==', 'freelancer').where('status', '==', 'active')
        .orderBy('stats.currentMonthEarnings', 'desc').limit(50).get();
    const batch = db.batch();
    const oldEntries = await db.collection('leaderboard').where('period', '==', month).get();
    oldEntries.docs.forEach(doc => batch.delete(doc.ref));
    let rank = 1;
    for (const userDoc of usersSnap.docs) {
        const user = userDoc.data();
        const monthlyEarnings = user.stats?.currentMonthEarnings || 0;
        if (monthlyEarnings === 0)
            continue;
        const entryRef = db.collection('leaderboard').doc();
        batch.set(entryRef, {
            uid: userDoc.id, name: user.displayName, level: user.currentLevel,
            specialty: user.specialties?.[0] || '', earnings: monthlyEarnings,
            totalEarnings: user.stats?.totalEarnings || 0, rating: user.stats?.avgRating || 0,
            completedJobs: user.stats?.completedJobs || 0, badges: [], rank,
            period: month, type: 'monthly', createdAt: firestore_1.FieldValue.serverTimestamp(),
        });
        rank++;
    }
    for (const userDoc of usersSnap.docs) {
        batch.update(userDoc.ref, { 'stats.currentMonthEarnings': 0, updatedAt: firestore_1.FieldValue.serverTimestamp() });
    }
    await batch.commit();
    const top3 = usersSnap.docs.slice(0, 3);
    for (const userDoc of top3) {
        await checkAndAwardBadges(userDoc.id);
    }
});
// ============================================================
// 10. generateInvoicePDF — Callable, generates temp PDF
// ============================================================
exports.generateInvoicePDF = (0, https_1.onCall)(async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError('unauthenticated', 'Yêu cầu đăng nhập.');
    const { invoiceId } = request.data;
    if (!invoiceId)
        throw new https_1.HttpsError('invalid-argument', 'invoiceId is required.');
    const invoiceSnap = await db.collection('invoices').doc(invoiceId).get();
    if (!invoiceSnap.exists)
        throw new https_1.HttpsError('not-found', 'Invoice không tồn tại.');
    const invoice = invoiceSnap.data();
    const bucket = storage.bucket();
    const filePath = `invoices/${invoiceId}.pdf`;
    const doc = new pdfkit_1.default({ margin: 50 });
    const buffers = [];
    doc.on('data', (chunk) => buffers.push(chunk));
    // Header
    doc.fontSize(18).text('HÓA ĐƠN THANH TOÁN', { align: 'center' });
    doc.fontSize(10).text('VAA Engineering - Outsourcing Platform', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Số hóa đơn: ${invoice.invoiceNumber}`);
    doc.text(`Ngày phát hành: ${new Date().toLocaleDateString('vi-VN')}`);
    doc.moveDown();
    // Party A
    doc.fontSize(14).text('BÊN A (Chủ đầu tư):', { underline: true });
    doc.fontSize(12).text(`Tên: ${invoice.partyA?.name || ''}`);
    doc.text(`Đại diện: ${invoice.partyA?.representative || ''}`);
    doc.moveDown();
    // Party B
    doc.fontSize(14).text('BÊN B (Nhà thầu phụ / Freelancer):', { underline: true });
    doc.fontSize(12).text(`Tên: ${invoice.partyB?.name || ''}`);
    doc.text(`CMND/CCCD: ${invoice.partyB?.idNumber || ''}`);
    doc.text(`Ngân hàng: ${invoice.partyB?.bankName || ''} - ${invoice.partyB?.bankAccount || ''}`);
    doc.moveDown();
    // Details
    doc.fontSize(14).text('CHI TIẾT THANH TOÁN:', { underline: true });
    doc.fontSize(12).text(`Dự án: ${invoice.jobTitle}`);
    doc.text(`Mô tả: ${invoice.description}`);
    doc.text(`Số tiền: ${Number(invoice.amount).toLocaleString('vi-VN')}₫`);
    doc.moveDown(2);
    doc.text('Xác nhận điện tử — VAA JOB Platform', { align: 'center' });
    doc.end();
    return new Promise((resolve, reject) => {
        doc.on('end', async () => {
            try {
                const finalBuffer = Buffer.concat(buffers);
                const file = bucket.file(filePath);
                await file.save(finalBuffer, { metadata: { contentType: 'application/pdf' } });
                const pdfURL = `https://storage.googleapis.com/${bucket.name}/${filePath}`;
                await invoiceSnap.ref.update({ pdfURL });
                resolve({ pdfURL });
            }
            catch (err) {
                reject(err);
            }
        });
        doc.on('error', reject);
    });
});
// ============================================================
// 11. onReviewCreated — Update user ratings
// ============================================================
exports.onReviewCreated = (0, firestore_2.onDocumentCreated)('reviews/{reviewId}', async (event) => {
    const snap = event.data;
    if (!snap)
        return;
    const review = snap.data();
    // Update reviewee's avg rating
    const revieweeRef = db.collection('users').doc(review.revieweeId);
    const revieweeSnap = await revieweeRef.get();
    if (!revieweeSnap.exists)
        return;
    const stats = revieweeSnap.data()?.stats || {};
    const currentAvg = stats.avgRating || 0;
    const currentCount = stats.ratingCount || 0;
    const newCount = currentCount + 1;
    const newAvg = ((currentAvg * currentCount) + review.rating) / newCount;
    await revieweeRef.update({
        'stats.avgRating': Math.round(newAvg * 100) / 100,
        'stats.ratingCount': newCount,
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    });
    // Check for badge eligibility
    await checkAndAwardBadges(review.revieweeId);
    // Notify the reviewee
    await createNotification({
        recipientId: review.revieweeId,
        type: 'badge_earned',
        title: 'Bạn nhận được đánh giá mới',
        body: `${review.reviewerName} đã đánh giá bạn ${review.rating}/5 sao cho job "${review.jobTitle}"`,
        link: `/freelancer`,
    });
});
//# sourceMappingURL=index.js.map