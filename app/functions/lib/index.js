"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.onReviewCreated = exports.generateInvoicePDF = exports.scheduledLeaderboard = exports.scheduledDeadlineCheck = exports.onContractSubmitted = exports.onContractStatusChange = exports.onPaymentUpdated = exports.onApplicationUpdated = exports.onApplicationSubmitted = exports.onJobStatusChange = exports.requestPaymentOrder = exports.onCreateContractPDF = void 0;
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
    const c = snap.data();
    const contractId = event.params.contractId;
    const bucket = storage.bucket();
    const filePath = `contracts/${contractId}.pdf`;
    const doc = new pdfkit_1.default({ margin: 50, size: 'A4' });
    const buffers = [];
    doc.on('data', (chunk) => buffers.push(chunk));
    const now = new Date();
    const dateStr = `ngày ${now.getDate()} tháng ${now.getMonth() + 1} năm ${now.getFullYear()}`;
    // ── Header ──────────────────────────────────────────────────────
    doc.fontSize(13).font('Helvetica-Bold')
        .text('CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM', { align: 'center' });
    doc.fontSize(11).font('Helvetica')
        .text('Độc lập - Tự do - Hạnh phúc', { align: 'center' });
    doc.moveDown(0.5);
    doc.moveTo(150, doc.y).lineTo(450, doc.y).stroke();
    doc.moveDown(1);
    doc.fontSize(16).font('Helvetica-Bold')
        .text('HỢP ĐỒNG GIAO KHOÁN', { align: 'center' });
    doc.fontSize(11).font('Helvetica')
        .text(`Số: ${c.contractNumber}`, { align: 'center' });
    doc.text(`Về việc: ${c.jobTitle}`, { align: 'center' });
    doc.moveDown(1);
    // ── Section I ──────────────────────────────────────────────────
    doc.fontSize(12).font('Helvetica-Bold').text('PHẦN I. CÁC CĂN CỨ KÝ KẾT HỢP ĐỒNG');
    doc.fontSize(10).font('Helvetica').moveDown(0.3)
        .text('- Luật Xây dựng số 50/2014 ngày 18/06/2014; Luật Dân sự ngày 14/06/2005;')
        .text('- Luật thuế thu nhập cá nhân hiện hành;')
        .text('- Và các văn bản pháp quy hiện hành có liên quan;')
        .text('- Căn cứ năng lực của Bên B và nhu cầu của Bên A.');
    doc.moveDown(0.8);
    // ── Section II ─────────────────────────────────────────────────
    doc.fontSize(12).font('Helvetica-Bold').text('PHẦN II. CÁC ĐIỀU KHOẢN VÀ ĐIỀU KIỆN CỦA HỢP ĐỒNG');
    doc.fontSize(10).font('Helvetica').moveDown(0.3)
        .text(`Hôm nay, ${dateStr} tại Công ty TNHH Tư vấn Kiến trúc Việt Nam VAA, chúng tôi gồm các bên:`);
    doc.moveDown(0.5);
    // Party A
    doc.fontSize(11).font('Helvetica-Bold').text('1. Bên A: CÔNG TY TNHH TƯ VẤN KIẾN TRÚC VIỆT NAM VAA');
    doc.fontSize(10).font('Helvetica')
        .text('Đại diện: Ông Đỗ Tất Kiên')
        .text('Chức vụ: Tổng giám đốc')
        .text('Địa chỉ: Số 40, phố Tăng Bạt Hổ, Phường Hai Bà Trưng, Hà Nội')
        .text('Mã số thuế: 0102341714');
    doc.moveDown(0.8);
    // Party B
    doc.fontSize(11).font('Helvetica-Bold').text(`2. Bên B: Ông/bà ${c.partyB?.name || ''}`);
    doc.fontSize(10).font('Helvetica')
        .text(`Ngày sinh: ${c.partyB?.dateOfBirth || '.....................'}`)
        .text(`Số CCCD: ${c.partyB?.idNumber || '.....................'}`)
        .text(`Điện thoại: ${c.partyB?.phone || '.....................'}`)
        .text(`Địa chỉ: ${c.partyB?.address || '.....................'}`)
        .text(`Mã số thuế: ${c.partyB?.taxId || '.....................'}`)
        .text(`Số tài khoản: ${c.partyB?.bankAccount || '.....................'} tại ${c.partyB?.bankName || '.....................'}`)
        .text(`Chi nhánh: ${c.partyB?.bankBranch || '.....................'}`);
    doc.moveDown(1);
    // Article 1 — Scope
    doc.fontSize(12).font('Helvetica-Bold').text('ĐIỀU 1. PHẠM VI CÔNG VIỆC');
    doc.fontSize(10).font('Helvetica').moveDown(0.3)
        .text(c.jobDescription || c.scope || '(Theo mô tả công việc của job được giao)', { lineGap: 2 });
    doc.moveDown(0.8);
    // Article 2 — Value
    doc.fontSize(12).font('Helvetica-Bold').text('ĐIỀU 2. GIÁ TRỊ HỢP ĐỒNG, TẠM ỨNG VÀ THANH TOÁN');
    doc.fontSize(10).font('Helvetica').moveDown(0.3)
        .text(`Giá trị hợp đồng (trọn gói): ${Number(c.totalValue || 0).toLocaleString('vi-VN')} đồng`)
        .text('Giá hợp đồng là thu nhập thực nhận sau khi khấu trừ thuế TNCN. Bên A có trách nhiệm kê khai và nộp thuế thay Bên B.');
    doc.moveDown(0.8);
    // Article 3 — Payment schedule
    doc.fontSize(12).font('Helvetica-Bold').text('ĐIỀU 3. PHƯƠNG THỨC THANH TOÁN');
    doc.fontSize(10).font('Helvetica').moveDown(0.3)
        .text('Hình thức thanh toán: Chuyển khoản');
    if (c.milestones && c.milestones.length > 0) {
        doc.text('Các đợt thanh toán:').moveDown(0.2);
        c.milestones.forEach((m, i) => {
            doc.text(`  Đợt ${i + 1}: ${m.name} — ${m.percentage}% — ${Number(m.amount || 0).toLocaleString('vi-VN')} đồng`);
        });
    }
    doc.moveDown(0.8);
    // Article 5 — Timeline
    doc.fontSize(12).font('Helvetica-Bold').text('ĐIỀU 5. TIẾN ĐỘ THỰC HIỆN HỢP ĐỒNG');
    doc.fontSize(10).font('Helvetica').moveDown(0.3)
        .text('Thời gian bắt đầu: Ngay sau khi hợp đồng được ký kết.')
        .text('Thời gian hoàn thành: Theo tiến độ chung của dự án.');
    doc.moveDown(0.8);
    // Note about full terms
    doc.fontSize(9).font('Helvetica').fillColor('#666666')
        .text('(Các điều khoản 4, 6-17 bao gồm: điều chỉnh giá, quyền và nghĩa vụ các bên, chế tài vi phạm, bảo mật, bảo hiểm, bất khả kháng và giải quyết tranh chấp — theo mẫu hợp đồng tiêu chuẩn của VAA.)', { lineGap: 2 });
    doc.fillColor('#000000');
    doc.moveDown(1.5);
    // Signatures
    doc.fontSize(12).font('Helvetica-Bold')
        .text('ĐẠI DIỆN BÊN A', { continued: true, width: 250 })
        .text('ĐẠI DIỆN BÊN B', { align: 'right' });
    doc.fontSize(10).font('Helvetica').moveDown(0.3)
        .text('(Chữ ký điện tử)', { continued: true, width: 250 })
        .text('(Chữ ký điện tử)', { align: 'right' });
    doc.moveDown(3);
    doc.fontSize(11).font('Helvetica-Bold')
        .text('Đỗ Tất Kiên', { continued: true, width: 250 })
        .text(c.partyB?.name || '', { align: 'right' });
    doc.fontSize(9).font('Helvetica')
        .text(`Ký lúc: ${now.toLocaleString('vi-VN')}`, { continued: true, width: 250 })
        .text(c.signedByWorkerAt ? `Ký lúc: ${new Date(c.signedByWorkerAt?.toDate?.() || c.signedByWorkerAt).toLocaleString('vi-VN')}` : '', { align: 'right' });
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
    // Job assigned → auto-create contract + notify freelancer
    if (before.status !== 'assigned' && after.status === 'assigned' && after.assignedTo) {
        // Map job category to abbreviation for contract number
        const CATEGORY_CODES = {
            'Kiến trúc': 'KT', 'Kết cấu': 'KC', 'MEP': 'MEP',
            'BIM': 'BIM', 'Dự toán': 'DT', 'Giám sát': 'GS', 'Thẩm tra': 'TT',
        };
        const catCode = CATEGORY_CODES[after.category] || 'VAA';
        const year = new Date().getFullYear();
        // Generate sequential contract number for this year
        const yearStart = new Date(`${year}-01-01`);
        const countSnap = await db.collection('contracts')
            .where('createdAt', '>=', yearStart).get();
        const seqNum = countSnap.size + 1;
        const contractNumber = `${seqNum}/${year}/VAA/${catCode}`;
        // Contract deadline: 3 days from now
        const contractDeadline = new Date();
        contractDeadline.setDate(contractDeadline.getDate() + 3);
        // Fetch freelancer profile for partyB pre-fill
        const workerSnap = await db.collection('users').doc(after.assignedTo).get();
        const worker = workerSnap.exists ? workerSnap.data() : {};
        const contractRef = await db.collection('contracts').add({
            contractNumber,
            jobId,
            jobTitle: after.title,
            jobCategory: after.category,
            jobDescription: after.description || '',
            milestones: after.milestones || [],
            partyA: {
                name: 'CÔNG TY TNHH TƯ VẤN KIẾN TRÚC VIỆT NAM VAA',
                representative: 'Đỗ Tất Kiên',
                position: 'Tổng giám đốc',
            },
            partyB: {
                uid: after.assignedTo,
                name: worker.displayName || '',
                idNumber: worker.idNumber || '',
                phone: worker.phone || '',
                address: worker.address || '',
                taxId: worker.taxId || '',
                bankAccount: worker.bankAccountNumber || '',
                bankName: worker.bankName || '',
                bankBranch: worker.bankBranch || '',
            },
            scope: after.description || '',
            totalValue: after.totalFee || 0,
            paymentTerms: 'Chuyển khoản theo các đợt milestone đã thỏa thuận.',
            terms: '',
            contractDeadline,
            status: 'pending_signature',
            createdBy: after.jobMaster || after.createdBy || '',
            createdAt: firestore_1.FieldValue.serverTimestamp(),
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        });
        // Notify freelancer
        await createNotification({
            recipientId: after.assignedTo, type: 'contract_ready',
            title: 'Chúc mừng! Bạn đã được chọn',
            body: `Bạn đã được chọn nhận job "${after.title}". Vui lòng ký hợp đồng trong 3 ngày.`,
            link: `/freelancer/contracts/${contractRef.id}/sign`,
            metadata: { contractId: contractRef.id, contractDeadline: contractDeadline.toISOString() },
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
// 8. onContractSubmitted — Notify jobmaster + accountants when freelancer signs
// ============================================================
exports.onContractSubmitted = (0, firestore_2.onDocumentUpdated)('contracts/{contractId}', async (event) => {
    const change = event.data;
    if (!change)
        return;
    const before = change.before.data();
    const after = change.after.data();
    const contractId = event.params.contractId;
    // Trigger: status moved from pending_signature → active (freelancer signed)
    if (before.status !== 'active' && after.status === 'active' && after.signedByWorkerAt) {
        const notifPayload = {
            type: 'contract_submitted',
            title: `Hợp đồng đã được ký: ${after.contractNumber}`,
            body: `${after.partyB?.name || 'Freelancer'} đã ký hợp đồng "${after.jobTitle}". Vui lòng xem xét.`,
            link: `/admin/contracts`,
            metadata: { contractId, jobId: after.jobId },
        };
        // Notify contract creator (jobmaster)
        if (after.createdBy) {
            await createNotification({ ...notifPayload, recipientId: after.createdBy });
        }
        // Notify all accountants
        const accountants = await getUsersByRole('accountant');
        for (const accId of accountants) {
            await createNotification({ ...notifPayload, recipientId: accId, link: '/accountant' });
        }
        // Also notify admins
        const admins = await getUsersByRole('admin');
        for (const adminId of admins) {
            await createNotification({ ...notifPayload, recipientId: adminId });
        }
        // Trigger PDF re-generation with signature info
        // The onCreateContractPDF only triggers on create; call update to regenerate
        // We store a flag so an admin can manually regenerate or use generateContractPDF callable
    }
});
// ============================================================
// 9. scheduledDeadlineCheck — Multi-tier (C1) + Contract deadline
// ============================================================
exports.scheduledDeadlineCheck = (0, scheduler_1.onSchedule)({ schedule: 'every day 09:00', timeZone: 'Asia/Ho_Chi_Minh' }, async () => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    // ── 1. Job deadlines ────────────────────────────────────────────
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
        // Dedup: skip if already sent this tier today
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
    // ── 2. Contract signing deadlines ───────────────────────────────
    const contractsSnap = await db.collection('contracts')
        .where('status', '==', 'pending_signature').get();
    for (const contractDoc of contractsSnap.docs) {
        const contract = contractDoc.data();
        if (!contract.contractDeadline)
            continue;
        const contractDeadline = contract.contractDeadline?.toDate
            ? contract.contractDeadline.toDate()
            : new Date(contract.contractDeadline);
        const daysLeft = Math.ceil((contractDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        // Only warn at 2 days left, 1 day left, and overdue
        if (daysLeft > 2)
            continue;
        const isOverdue = daysLeft <= 0;
        const warnTitle = isOverdue
            ? `⚠️ Quá hạn ký hợp đồng!`
            : `⚠️ Hợp đồng cần ký trong ${daysLeft} ngày!`;
        const warnBody = `Hợp đồng ${contract.contractNumber} (${contract.jobTitle}) ${isOverdue ? 'đã quá hạn ký.' : `cần được ký trước ${contractDeadline.toLocaleDateString('vi-VN')}.`}`;
        // Dedup
        const existingContractWarn = await db.collection('notifications')
            .where('type', '==', 'contract_deadline_warning')
            .where('metadata.contractId', '==', contractDoc.id)
            .where('metadata.date', '==', today)
            .limit(1).get();
        if (!existingContractWarn.empty)
            continue;
        // Warn the freelancer
        if (contract.partyB?.uid) {
            await createNotification({
                recipientId: contract.partyB.uid,
                type: 'contract_deadline_warning',
                title: warnTitle,
                body: warnBody,
                link: `/freelancer/contracts/${contractDoc.id}/sign`,
                metadata: { contractId: contractDoc.id, date: today },
            });
        }
        // Warn the jobmaster (createdBy)
        if (contract.createdBy) {
            await createNotification({
                recipientId: contract.createdBy,
                type: 'contract_deadline_warning',
                title: warnTitle,
                body: `${contract.partyB?.name || 'Freelancer'} chưa ký: ${warnBody}`,
                link: `/jobmaster/jobs/${contract.jobId}`,
                metadata: { contractId: contractDoc.id, date: today },
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
            uid: userDoc.id, name: user.nickname || user.displayName, level: user.currentLevel,
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