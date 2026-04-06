/* eslint-disable @typescript-eslint/no-explicit-any -- Firestore document data is inherently untyped */
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
import * as path from 'path';
import * as crypto from 'crypto';

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

async function getUsersByRole(role: string): Promise<string[]> {
  const snap = await db.collection('users').where('role', '==', role).get();
  return snap.docs.map(d => d.id);
}

// ============================================================
// HELPER: Check and award badges (enhanced)
// ============================================================
async function checkAndAwardBadges(userId: string) {
  const userSnap = await db.collection('users').doc(userId).get();
  if (!userSnap.exists) return;

  const user = userSnap.data()!;
  const stats = user.stats || {};
  const badgesRef = db.collection('users').doc(userId).collection('badges');
  const existingBadges = await badgesRef.get();
  const existingTypes = new Set(existingBadges.docs.map(d => d.data().badgeType));

  const awardsToMake: Array<{ type: string; title: string; body: string }> = [];

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
    await badgesRef.add({ badgeType: award.type, earnedAt: FieldValue.serverTimestamp() });
    await createNotification({
      recipientId: userId, type: 'badge_earned',
      title: award.title, body: award.body, link: `/freelancer`,
    });
  }
}

// ============================================================
// HELPER: Auto-score an application
// ============================================================
async function computeMatchScore(applicationData: any, jobData: any): Promise<{
  score: number; badge: string | null; reasons: string[];
}> {
  const applicantSnap = await db.collection('users').doc(applicationData.applicantId).get();
  const applicant = applicantSnap.exists ? applicantSnap.data()! : {};

  const reasons: string[] = [];
  let totalScore = 0;
  const w = { skill: 0.25, level: 0.2, history: 0.15, availability: 0.1, price: 0.15, rating: 0.15 };

  // SkillMatch
  const userSkills = [...(applicant.specialties || []), ...(applicant.software || [])];
  const jobSkills = [...(jobData.requirements?.software || []), jobData.category].filter(Boolean);
  const overlap = userSkills.filter((s: string) => jobSkills.some((j: string) => j.toLowerCase() === s.toLowerCase()));
  const skillScore = jobSkills.length > 0 ? Math.min(1, overlap.length / jobSkills.length) : 0.5;
  if (skillScore >= 0.7) reasons.push(`Kỹ năng phù hợp ${Math.round(skillScore * 100)}%`);
  totalScore += w.skill * skillScore;

  // LevelMatch
  const levels = ['L1', 'L2', 'L3', 'L4', 'L5'];
  const userIdx = levels.indexOf(applicant.currentLevel || 'L1');
  const jobIdx = levels.indexOf(jobData.level || 'L1');
  const levelDiff = Math.abs(userIdx - jobIdx);
  const levelScore = Math.max(0, 1 - levelDiff * 0.25);
  if (levelScore >= 0.75) reasons.push(`Level phù hợp`);
  totalScore += w.level * levelScore;

  // HistoryScore
  const historyJobs = await db.collection('jobs')
    .where('assignedTo', '==', applicationData.applicantId)
    .where('status', '==', 'completed')
    .where('category', '==', jobData.category)
    .limit(20).get();
  const historyScore = Math.min(1, historyJobs.size / 5);
  if (historyJobs.size > 0) reasons.push(`${historyJobs.size} job cùng lĩnh vực`);
  totalScore += w.history * historyScore;

  // AvailabilityScore
  const activeJobs = await db.collection('jobs')
    .where('assignedTo', '==', applicationData.applicantId)
    .where('status', 'in', ['assigned', 'in_progress'])
    .limit(5).get();
  const availScore = activeJobs.size === 0 ? 1 : activeJobs.size <= 2 ? 0.5 : 0.2;
  if (availScore >= 0.5) reasons.push('Sẵn sàng nhận việc');
  totalScore += w.availability * availScore;

  // PriceScore
  const expectedFee = applicationData.expectedFee || 0;
  const budget = jobData.totalFee || 0;
  const priceScore = budget > 0 && expectedFee > 0
    ? Math.max(0, 1 - Math.abs(expectedFee - budget) / budget) : 0.5;
  if (priceScore >= 0.8) reasons.push('Giá phù hợp ngân sách');
  totalScore += w.price * priceScore;

  // RatingScore
  const stats = applicant.stats || {};
  const ratingScore = ((stats.avgRating || 0) / 5) * 0.7 + ((stats.onTimeRate || 0)) * 0.3;
  if ((stats.avgRating || 0) >= 4.0) reasons.push(`Rating ${stats.avgRating}/5`);
  totalScore += w.rating * ratingScore;

  const finalScore = Math.round(totalScore * 100);
  const badge = finalScore >= 85 ? 'top_match' : finalScore >= 65 ? 'recommended' : null;

  return { score: finalScore, badge, reasons };
}

// ============================================================
// HELPER: Font paths for Vietnamese support
// ============================================================
const FONT_REGULAR = path.join(__dirname, '..', 'fonts', 'NotoSans-Regular.ttf');
const FONT_BOLD = path.join(__dirname, '..', 'fonts', 'NotoSans-Bold.ttf');

// ============================================================
// HELPER: Generate contract PDF with Vietnamese fonts & signature
// ============================================================
async function buildContractPDF(c: any, contractId: string, contractRef: FirebaseFirestore.DocumentReference): Promise<void> {
  const bucket = storage.bucket();
  const filePath = `contracts/${contractId}.pdf`;
  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  const buffers: Buffer[] = [];
  doc.on('data', (chunk: Buffer) => buffers.push(chunk));

  // Register Vietnamese fonts
  doc.registerFont('Vn', FONT_REGULAR);
  doc.registerFont('VnBold', FONT_BOLD);

  const now = new Date();
  const dateStr = `ngày ${now.getDate()} tháng ${now.getMonth() + 1} năm ${now.getFullYear()}`;

  // ── Header ──────────────────────────────────────────────────────
  doc.fontSize(13).font('VnBold')
    .text('CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM', { align: 'center' });
  doc.fontSize(11).font('Vn')
    .text('Độc lập - Tự do - Hạnh phúc', { align: 'center' });
  doc.moveDown(0.3);
  doc.text('---o0o---', { align: 'center' });
  doc.moveDown(0.8);

  doc.fontSize(16).font('VnBold')
    .text('HỢP ĐỒNG GIAO KHOÁN', { align: 'center' });
  doc.fontSize(11).font('Vn')
    .text(`Số: ${c.contractNumber}`, { align: 'center' });
  doc.text(`Về việc: ${c.jobTitle}`, { align: 'center' });
  doc.moveDown(1);

  // ── PHẦN I ──────────────────────────────────────────────────────
  doc.fontSize(12).font('VnBold').text('PHẦN I. CÁC CĂN CỨ KÝ KẾT HỢP ĐỒNG');
  doc.fontSize(10).font('Vn').moveDown(0.3)
    .text('- Luật Xây dựng số 50/2014/QH13 và Luật sửa đổi bổ sung số 62/2020/QH14;')
    .text('- Nghị định số 37/2015/NĐ-CP quy định chi tiết về hợp đồng xây dựng và các sửa đổi bổ sung;')
    .text('- Nghị định số 10/2021/NĐ-CP về quản lý chi phí đầu tư xây dựng;')
    .text('- Căn cứ nhu cầu thực tế và năng lực của các bên.');
  doc.moveDown(0.8);

  // ── PHẦN II ─────────────────────────────────────────────────────
  doc.fontSize(12).font('VnBold').text('PHẦN II. CÁC BÊN KÝ KẾT HỢP ĐỒNG');
  doc.fontSize(10).font('Vn').moveDown(0.3)
    .text(`Hôm nay, ${dateStr} tại Công ty TNHH Tư vấn Kiến trúc Việt Nam VAA, chúng tôi gồm các bên:`);
  doc.moveDown(0.5);

  // Party A
  doc.fontSize(11).font('VnBold').text('BÊN A (Bên giao khoán):');
  doc.fontSize(10).font('Vn')
    .text(`Tên đơn vị: ${c.partyA?.name || 'CÔNG TY TNHH TƯ VẤN KIẾN TRÚC VIỆT NAM VAA'}`)
    .text(`Người đại diện: ${c.partyA?.representative || 'Ông Đỗ Tất Kiên'} — Chức vụ: ${c.partyA?.position || 'Tổng giám đốc'}`)
    .text('Địa chỉ: Số 40, phố Tăng Bạt Hổ, Phường Hai Bà Trưng, Hà Nội')
    .text('Mã số thuế: 0102341714');
  doc.moveDown(0.8);

  // Party B
  doc.fontSize(11).font('VnBold').text(`BÊN B (Bên nhận khoán):`);
  doc.fontSize(10).font('Vn')
    .text(`Họ và tên: ${c.partyB?.name || '.....................'}`)
    .text(`Ngày sinh: ${c.partyB?.dateOfBirth || '.....................'}`)
    .text(`Số CMND/CCCD: ${c.partyB?.idNumber || '.....................'}`)
    .text(`Điện thoại: ${c.partyB?.phone || '.....................'}`)
    .text(`Địa chỉ: ${c.partyB?.address || '.....................'}`)
    .text(`Mã số thuế: ${c.partyB?.taxId || '.....................'}`)
    .text(`Tài khoản NH: ${c.partyB?.bankAccount || '.....................'} — ${c.partyB?.bankName || '.....................'}${c.partyB?.bankBranch ? ` — ${c.partyB.bankBranch}` : ''}`);
  doc.moveDown(1);

  // ── PHẦN III ────────────────────────────────────────────────────
  doc.fontSize(12).font('VnBold').text('PHẦN III. CÁC ĐIỀU KHOẢN CỦA HỢP ĐỒNG');
  doc.moveDown(0.5);

  // Điều 1
  doc.fontSize(11).font('VnBold').text('Điều 1. Nội dung công việc');
  doc.fontSize(10).font('Vn').moveDown(0.2)
    .text(c.scope || c.jobDescription || '(Theo mô tả công việc của job được giao)', { lineGap: 2 });
  if (c.jobDescription && c.scope) {
    doc.text(c.jobDescription, { lineGap: 2 });
  }
  if (c.jobCategory) {
    doc.font('VnBold').text(`Hạng mục thi công/thiết kế: `, { continued: true }).font('Vn').text(c.jobCategory);
  }
  doc.moveDown(0.6);

  // Điều 2
  doc.fontSize(11).font('VnBold').text('Điều 2. Giá trị hợp đồng');
  doc.fontSize(10).font('Vn').moveDown(0.2)
    .text(`Tổng giá trị hợp đồng: ${Number(c.totalValue || 0).toLocaleString('vi-VN')} đồng (VND).`)
    .text('Giá hợp đồng là thu nhập thực nhận sau khi khấu trừ thuế TNCN. Bên A có trách nhiệm kê khai và nộp thuế thay Bên B.');
  doc.moveDown(0.6);

  // Điều 3
  doc.fontSize(11).font('VnBold').text('Điều 3. Thanh toán');
  doc.fontSize(10).font('Vn').moveDown(0.2)
    .text(`3.1. ${c.paymentTerms || 'Thanh toán theo các mốc milestone đã thỏa thuận.'}`);
  if (c.milestones && c.milestones.length > 0) {
    doc.text('3.2. Các mốc thanh toán:').moveDown(0.2);
    c.milestones.forEach((m: any, i: number) => {
      doc.text(`    Đợt ${i + 1}: ${m.name} — ${m.percentage}% — ${Number(m.amount || 0).toLocaleString('vi-VN')} đồng`);
    });
  }
  doc.text('3.3. Thanh toán bằng chuyển khoản ngân hàng vào tài khoản Bên B đã đăng ký.');
  doc.moveDown(0.6);

  // Điều 4
  doc.fontSize(11).font('VnBold').text('Điều 4. Thay đổi và điều chỉnh giá hợp đồng');
  doc.fontSize(10).font('Vn').moveDown(0.2)
    .text('Giá hợp đồng chỉ được điều chỉnh khi có thay đổi phạm vi công việc được hai bên thống nhất bằng văn bản (phụ lục hợp đồng).');
  doc.moveDown(0.6);

  // Điều 5
  doc.fontSize(11).font('VnBold').text('Điều 5. Thời gian thực hiện');
  doc.fontSize(10).font('Vn').moveDown(0.2)
    .text('Thời gian thực hiện theo thỏa thuận trong phạm vi dự án, tính từ ngày ký hợp đồng.');
  doc.moveDown(0.6);

  // Điều 6
  doc.fontSize(11).font('VnBold').text('Điều 6. Quyền và nghĩa vụ của Bên B');
  doc.fontSize(10).font('Vn').moveDown(0.2)
    .text('6.1. Thực hiện công việc đúng tiến độ, chất lượng và quy cách đã thỏa thuận.')
    .text('6.2. Chịu trách nhiệm về chất lượng sản phẩm bàn giao.')
    .text('6.3. Tuân thủ quy định bảo mật thông tin dự án.')
    .text('6.4. Báo cáo tiến độ theo yêu cầu của Bên A.')
    .text('6.5. Chịu trách nhiệm nộp thuế TNCN theo quy định pháp luật.');
  doc.moveDown(0.6);

  // Điều 7
  doc.fontSize(11).font('VnBold').text('Điều 7. Quyền và nghĩa vụ của Bên A');
  doc.fontSize(10).font('Vn').moveDown(0.2)
    .text('7.1. Cung cấp đầy đủ thông tin, tài liệu cần thiết cho Bên B thực hiện công việc.')
    .text('7.2. Thanh toán đầy đủ, đúng hạn theo các điều khoản đã thỏa thuận.')
    .text('7.3. Nghiệm thu sản phẩm đúng thời hạn đã cam kết.')
    .text('7.4. Giám sát tiến độ và chất lượng công việc.');
  doc.moveDown(0.6);

  // Điều 8
  doc.fontSize(11).font('VnBold').text('Điều 8. Vật liệu và thiết bị');
  doc.fontSize(10).font('Vn').moveDown(0.2)
    .text('Bên B tự chịu trách nhiệm về thiết bị, phần mềm và công cụ phục vụ công việc, trừ khi có thỏa thuận khác.');
  doc.moveDown(0.6);

  // Điều 9
  doc.fontSize(11).font('VnBold').text('Điều 9. Sản phẩm và nghiệm thu');
  doc.fontSize(10).font('Vn').moveDown(0.2)
    .text('Sản phẩm được nghiệm thu theo các mốc (milestone) đã thỏa thuận. Bên A có trách nhiệm phản hồi trong vòng 5 ngày làm việc kể từ khi nhận sản phẩm.');
  doc.moveDown(0.6);

  // Điều 10
  doc.fontSize(11).font('VnBold').text('Điều 10. Tạm ngừng và chấm dứt hợp đồng');
  doc.fontSize(10).font('Vn').moveDown(0.2)
    .text('10.1. Hợp đồng có thể tạm ngừng hoặc chấm dứt theo thỏa thuận của hai bên.')
    .text('10.2. Bên vi phạm phải bồi thường thiệt hại theo quy định tại Điều 11.');
  doc.moveDown(0.6);

  // Điều 11
  doc.fontSize(11).font('VnBold').text('Điều 11. Bồi thường và giới hạn trách nhiệm');
  doc.fontSize(10).font('Vn').moveDown(0.2)
    .text('Mức bồi thường tối đa không vượt quá giá trị hợp đồng. Bên vi phạm chịu trách nhiệm bồi thường thiệt hại trực tiếp do lỗi của mình gây ra.');
  doc.moveDown(0.6);

  // Điều 12
  doc.fontSize(11).font('VnBold').text('Điều 12. Phạt vi phạm');
  doc.fontSize(10).font('Vn').moveDown(0.2)
    .text('Bên vi phạm các điều khoản hợp đồng có thể bị phạt tối đa 8% giá trị hợp đồng theo quy định pháp luật hiện hành.');
  doc.moveDown(0.6);

  // Điều 13
  doc.fontSize(11).font('VnBold').text('Điều 13. Bảo mật và bản quyền');
  doc.fontSize(10).font('Vn').moveDown(0.2)
    .text('13.1. Mọi thông tin liên quan đến dự án thuộc quyền sở hữu của Bên A.')
    .text('13.2. Bên B không được tiết lộ thông tin dự án cho bên thứ ba khi chưa có sự đồng ý bằng văn bản của Bên A.')
    .text('13.3. Bản quyền sản phẩm giao thuộc về Bên A sau khi thanh toán đầy đủ.');
  doc.moveDown(0.6);

  // Điều 14
  doc.fontSize(11).font('VnBold').text('Điều 14. Bảo hiểm');
  doc.fontSize(10).font('Vn').moveDown(0.2)
    .text('Không áp dụng cho hợp đồng giao khoán cá nhân.');
  doc.moveDown(0.6);

  // Điều 15
  doc.fontSize(11).font('VnBold').text('Điều 15. Bất khả kháng');
  doc.fontSize(10).font('Vn').moveDown(0.2)
    .text('Bên bị ảnh hưởng bởi sự kiện bất khả kháng được miễn trừ trách nhiệm trong phạm vi và thời gian bị ảnh hưởng, với điều kiện phải thông báo bằng văn bản cho bên còn lại trong vòng 7 ngày.');
  doc.moveDown(0.6);

  // Điều 16
  doc.fontSize(11).font('VnBold').text('Điều 16. Khiếu nại và tranh chấp');
  doc.fontSize(10).font('Vn').moveDown(0.2)
    .text('Mọi tranh chấp phát sinh từ hợp đồng này được giải quyết trước tiên bằng thương lượng. Nếu không thành, các bên có quyền khởi kiện tại Tòa án nhân dân có thẩm quyền.');
  doc.moveDown(0.6);

  // Điều 17
  doc.fontSize(11).font('VnBold').text('Điều 17. Điều khoản chung');
  doc.fontSize(10).font('Vn').moveDown(0.2)
    .text('17.1. Hợp đồng có hiệu lực kể từ ngày ký.')
    .text('17.2. Hợp đồng được lập thành 02 bản, mỗi bên giữ 01 bản có giá trị pháp lý như nhau.')
    .text('17.3. Mọi sửa đổi, bổ sung phải được hai bên thỏa thuận bằng văn bản (phụ lục hợp đồng).');
  doc.moveDown(1.5);

  // ── Signatures ──────────────────────────────────────────────────
  const sigY = doc.y;
  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const colWidth = pageWidth / 2;
  const leftX = doc.page.margins.left;
  const rightX = doc.page.margins.left + colWidth;

  doc.fontSize(12).font('VnBold');
  doc.text('ĐẠI DIỆN BÊN A', leftX, sigY, { width: colWidth, align: 'center' });
  doc.text('BÊN B', rightX, sigY, { width: colWidth, align: 'center' });

  doc.fontSize(9).font('Vn');
  doc.text('(Ký, ghi rõ họ tên, đóng dấu)', leftX, sigY + 16, { width: colWidth, align: 'center' });
  doc.text('(Ký, ghi rõ họ tên)', rightX, sigY + 16, { width: colWidth, align: 'center' });

  // Embed freelancer signature image if available
  if (c.signatureURL) {
    try {
      const sigPath = `signatures/${c.partyB?.uid}/${contractId}.png`;
      const sigFile = bucket.file(sigPath);
      const [exists] = await sigFile.exists();
      if (exists) {
        const [sigBuffer] = await sigFile.download();
        doc.image(sigBuffer, rightX + colWidth / 2 - 50, sigY + 32, { width: 100, height: 50, fit: [100, 50] });
      }
    } catch (err) {
      console.warn('Could not embed signature image:', err);
    }
  }

  const nameY = sigY + 90;
  doc.fontSize(11).font('VnBold');
  doc.text(c.partyA?.representative || 'Đỗ Tất Kiên', leftX, nameY, { width: colWidth, align: 'center' });
  doc.text(c.partyB?.name || '', rightX, nameY, { width: colWidth, align: 'center' });

  // Signed timestamps
  doc.fontSize(8).font('Vn');
  const signedAtA = now.toLocaleString('vi-VN');
  doc.text(`Ký lúc: ${signedAtA}`, leftX, nameY + 16, { width: colWidth, align: 'center' });
  if (c.signedByWorkerAt) {
    const workerDate = new Date(c.signedByWorkerAt?.toDate?.() || c.signedByWorkerAt);
    doc.text(`Ký lúc: ${workerDate.toLocaleString('vi-VN')}`, rightX, nameY + 16, { width: colWidth, align: 'center' });
  }

  doc.end();

  return new Promise<void>((resolve, reject) => {
    doc.on('end', async () => {
      try {
        const finalBuffer = Buffer.concat(buffers);
        const file = bucket.file(filePath);
        const dlToken = crypto.randomUUID();
        await file.save(finalBuffer, {
          metadata: {
            contentType: 'application/pdf',
            metadata: { firebaseStorageDownloadTokens: dlToken },
          },
        });
        const encodedPath = encodeURIComponent(filePath);
        const pdfURL = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodedPath}?alt=media&token=${dlToken}`;
        await contractRef.update({ pdfURL });
        resolve();
      } catch (err) { reject(err); }
    });
    doc.on('error', reject);
  });
}

// ============================================================
// 1. onCreateContractPDF
// ============================================================
export const onCreateContractPDF = onDocumentCreated(
  'contracts/{contractId}',
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    const c = snap.data();
    const contractId = event.params.contractId;
    await buildContractPDF(c, contractId, snap.ref);
  }
);

// ============================================================
// 1b. onContractSigned — Regenerate PDF with signature
// ============================================================
export const onContractSigned = onDocumentUpdated(
  'contracts/{contractId}',
  async (event) => {
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();
    if (!before || !after) return;

    // Only regenerate when signatureURL is newly set (freelancer just signed)
    if (before.signatureURL || !after.signatureURL) return;

    const contractId = event.params.contractId;
    await buildContractPDF(after, contractId, event.data!.after.ref);
  }
);

// ============================================================
// 2. requestPaymentOrder — with escrow release
// ============================================================
export const requestPaymentOrder = onCall(
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Yêu cầu đăng nhập.');
    const { jobId, milestoneId, amount, workerId, workerName, reason } = request.data;

    const userSnap = await db.collection('users').doc(request.auth.uid).get();
    const profile = userSnap.data();
    if (!profile || (profile.role !== 'jobmaster' && profile.role !== 'admin')) {
      throw new HttpsError('permission-denied', 'Bạn không có quyền thực hiện thanh toán.');
    }

    const existingPayment = await db.collection('payments')
      .where('jobId', '==', jobId).where('milestoneId', '==', milestoneId)
      .where('status', 'in', ['pending', 'approved', 'paid']).limit(1).get();
    if (!existingPayment.empty) {
      throw new HttpsError('already-exists', `Yêu cầu thanh toán cho milestone này đã tồn tại.`);
    }

    const paymentId = await db.runTransaction(async (transaction) => {
      const jobRef = db.collection('jobs').doc(jobId);
      const jobSnap = await transaction.get(jobRef);
      const jobData = jobSnap.data();
      if (!jobData) throw new HttpsError('not-found', 'Job không tồn tại.');

      if (jobData.milestones) {
        const milestone = jobData.milestones.find((m: any) => m.id === milestoneId);
        if (!milestone) throw new HttpsError('not-found', 'Milestone không tồn tại.');
        if (milestone.status === 'approved' || milestone.status === 'paid') {
          throw new HttpsError('failed-precondition', 'Milestone này đã được duyệt.');
        }

        // C3: Update milestone + escrow status
        const updatedMilestones = jobData.milestones.map((m: any) =>
          m.id === milestoneId
            ? { ...m, status: 'approved', approvedBy: request.auth!.uid, approvedAt: new Date() }
            : m
        );
        const allApproved = updatedMilestones.every((m: any) =>
          m.status === 'approved' || m.status === 'paid' || m.status === 'released'
        );
        const escrowStatus = allApproved ? 'fully_released' : 'partially_released';
        transaction.update(jobRef, { milestones: updatedMilestones, escrowStatus });
      }

      const paymentRef = db.collection('payments').doc();
      transaction.set(paymentRef, {
        jobId, milestoneId, workerId, workerName, amount, reason,
        status: 'pending', triggeredByMilestone: true,
        approvedByJobMaster: request.auth!.uid,
        createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
      });
      return paymentRef.id;
    });

    return { success: true, paymentId };
  }
);

// ============================================================
// 3. onJobStatusChange
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
          link: `/jobs/${jobId}`, read: false, createdAt: FieldValue.serverTimestamp(),
        });
      });
      await batch.commit();
    }

    // Job assigned → auto-create contract + notify freelancer
    if (before.status !== 'assigned' && after.status === 'assigned' && after.assignedTo) {
      // Map job category to abbreviation for contract number
      const CATEGORY_CODES: Record<string, string> = {
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
      const contractNumber = `${seqNum}/${year}/VAA-${catCode}`;

      // Contract deadline: 3 days from now
      const contractDeadline = new Date();
      contractDeadline.setDate(contractDeadline.getDate() + 3);

      // Fetch freelancer profile for partyB pre-fill
      const workerSnap = await db.collection('users').doc(after.assignedTo).get();
      const worker = workerSnap.exists ? workerSnap.data()! : {};

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
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
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
            updatedAt: FieldValue.serverTimestamp(),
          });
          await checkAndAwardBadges(after.assignedTo);
        }
      }
    }
  }
);

// ============================================================
// 4. onApplicationSubmitted — with auto-scoring (C2)
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

    // C2: Auto-score
    try {
      const { score, badge, reasons } = await computeMatchScore(application, job);
      await snap.ref.update({ matchScore: score, matchBadge: badge, matchReasons: reasons });
    } catch (e) {
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
  }
);

// ============================================================
// 5. onApplicationUpdated
// ============================================================
export const onApplicationUpdated = onDocumentUpdated(
  'applications/{applicationId}',
  async (event) => {
    const change = event.data;
    if (!change) return;
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
  }
);

// ============================================================
// 6. onPaymentUpdated — with auto-invoice generation
// ============================================================
export const onPaymentUpdated = onDocumentUpdated(
  'payments/{paymentId}',
  async (event) => {
    const change = event.data;
    if (!change) return;
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
          updatedAt: FieldValue.serverTimestamp(),
        });
      }

      // Check all milestones paid -> mark job as paid
      if (after.jobId) {
        const jobRef = db.collection('jobs').doc(after.jobId);
        const jobSnap = await jobRef.get();
        const job = jobSnap.data();
        if (job?.milestones) {
          const allPaid = job.milestones.every((m: any) => m.status === 'paid');
          if (allPaid) await jobRef.update({ status: 'paid', updatedAt: FieldValue.serverTimestamp() });
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
        const partyAName = 'VAA Engineering';
        if (after.jobId) {
          const jSnap = await db.collection('jobs').doc(after.jobId).get();
          if (jSnap.exists) { jobTitle = jSnap.data()?.title || jobTitle; }
        }

        const workerData = workerSnap.exists ? workerSnap.data()! : {};
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
          status: 'issued', issuedAt: FieldValue.serverTimestamp(), createdAt: FieldValue.serverTimestamp(),
        });
      } catch (e) {
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
  }
);

// ============================================================
// 7. onContractStatusChange
// ============================================================
export const onContractStatusChange = onDocumentUpdated(
  'contracts/{contractId}',
  async (event) => {
    const change = event.data;
    if (!change) return;
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
  }
);

// ============================================================
// 8. onContractSubmitted — Notify jobmaster + accountants when freelancer signs
// ============================================================
export const onContractSubmitted = onDocumentUpdated(
  'contracts/{contractId}',
  async (event) => {
    const change = event.data;
    if (!change) return;
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
  }
);

// ============================================================
// 9. scheduledDeadlineCheck — Multi-tier (C1) + Contract deadline
// ============================================================
export const scheduledDeadlineCheck = onSchedule(
  { schedule: 'every day 09:00', timeZone: 'Asia/Ho_Chi_Minh' },
  async () => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    // ── 1. Job deadlines ────────────────────────────────────────────
    const jobsSnap = await db.collection('jobs')
      .where('status', 'in', ['assigned', 'in_progress']).get();

    for (const jobDoc of jobsSnap.docs) {
      const job = jobDoc.data();
      const deadline = job.deadline?.toDate ? job.deadline.toDate() : new Date(job.deadline);
      const daysLeft = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      let tier: string | null = null;
      let tierType: string | null = null;
      if (daysLeft < 0) { tier = 'QUÁ HẠN'; tierType = 'deadline_overdue'; }
      else if (daysLeft <= 1) { tier = '1 ngày'; tierType = 'deadline_1day'; }
      else if (daysLeft <= 3) { tier = `${daysLeft} ngày`; tierType = 'deadline_3days'; }
      else if (daysLeft <= 7) { tier = `${daysLeft} ngày`; tierType = 'deadline_7days'; }

      if (!tier || !tierType) continue;

      // Dedup: skip if already sent this tier today
      const existing = await db.collection('notifications')
        .where('type', '==', tierType)
        .where('metadata.jobId', '==', jobDoc.id)
        .where('metadata.date', '==', today)
        .limit(1).get();
      if (!existing.empty) continue;

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
      if (!contract.contractDeadline) continue;
      const contractDeadline = contract.contractDeadline?.toDate
        ? contract.contractDeadline.toDate()
        : new Date(contract.contractDeadline);
      const daysLeft = Math.ceil((contractDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      // Only warn at 2 days left, 1 day left, and overdue
      if (daysLeft > 2) continue;

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
      if (!existingContractWarn.empty) continue;

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
  }
);

// ============================================================
// 9. scheduledLeaderboard
// ============================================================
export const scheduledLeaderboard = onSchedule(
  { schedule: '0 0 1 * *', timeZone: 'Asia/Ho_Chi_Minh' },
  async () => {
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
      if (monthlyEarnings === 0) continue;
      const entryRef = db.collection('leaderboard').doc();
      batch.set(entryRef, {
        uid: userDoc.id, name: user.nickname || user.displayName, level: user.currentLevel,
        specialty: user.specialties?.[0] || '', earnings: monthlyEarnings,
        totalEarnings: user.stats?.totalEarnings || 0, rating: user.stats?.avgRating || 0,
        completedJobs: user.stats?.completedJobs || 0, badges: [], rank,
        period: month, type: 'monthly', createdAt: FieldValue.serverTimestamp(),
      });
      rank++;
    }

    for (const userDoc of usersSnap.docs) {
      batch.update(userDoc.ref, { 'stats.currentMonthEarnings': 0, updatedAt: FieldValue.serverTimestamp() });
    }
    await batch.commit();

    const top3 = usersSnap.docs.slice(0, 3);
    for (const userDoc of top3) { await checkAndAwardBadges(userDoc.id); }
  }
);

// ============================================================
// 10. generateInvoicePDF — Callable, generates temp PDF
// ============================================================
export const generateInvoicePDF = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Yêu cầu đăng nhập.');
  const { invoiceId } = request.data;
  if (!invoiceId) throw new HttpsError('invalid-argument', 'invoiceId is required.');

  const invoiceSnap = await db.collection('invoices').doc(invoiceId).get();
  if (!invoiceSnap.exists) throw new HttpsError('not-found', 'Invoice không tồn tại.');
  const invoice = invoiceSnap.data()!;

  const bucket = storage.bucket();
  const filePath = `invoices/${invoiceId}.pdf`;
  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  const buffers: Buffer[] = [];
  doc.on('data', (chunk: Buffer) => buffers.push(chunk));

  // Register Vietnamese fonts
  doc.registerFont('Vn', FONT_REGULAR);
  doc.registerFont('VnBold', FONT_BOLD);

  // Header
  doc.fontSize(18).font('VnBold').text('HÓA ĐƠN THANH TOÁN', { align: 'center' });
  doc.fontSize(10).font('Vn').text('VAA Engineering - Outsourcing Platform', { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).font('Vn').text(`Số hóa đơn: ${invoice.invoiceNumber}`);
  doc.text(`Ngày phát hành: ${new Date().toLocaleDateString('vi-VN')}`);
  doc.moveDown();

  // Party A
  doc.fontSize(14).font('VnBold').text('BÊN A (Chủ đầu tư):');
  doc.fontSize(12).font('Vn').text(`Tên: ${invoice.partyA?.name || ''}`);
  doc.text(`Đại diện: ${invoice.partyA?.representative || ''}`);
  doc.moveDown();

  // Party B
  doc.fontSize(14).font('VnBold').text('BÊN B (Nhà thầu phụ / Freelancer):');
  doc.fontSize(12).font('Vn').text(`Tên: ${invoice.partyB?.name || ''}`);
  doc.text(`CMND/CCCD: ${invoice.partyB?.idNumber || ''}`);
  doc.text(`Ngân hàng: ${invoice.partyB?.bankName || ''} - ${invoice.partyB?.bankAccount || ''}`);
  doc.moveDown();

  // Details
  doc.fontSize(14).font('VnBold').text('CHI TIẾT THANH TOÁN:');
  doc.fontSize(12).font('Vn').text(`Dự án: ${invoice.jobTitle}`);
  doc.text(`Mô tả: ${invoice.description}`);
  doc.text(`Số tiền: ${Number(invoice.amount).toLocaleString('vi-VN')}₫`);
  doc.moveDown(2);
  doc.text('Xác nhận điện tử — VAA JOB Platform', { align: 'center' });

  doc.end();

  return new Promise<{ pdfURL: string }>((resolve, reject) => {
    doc.on('end', async () => {
      try {
        const finalBuffer = Buffer.concat(buffers);
        const file = bucket.file(filePath);
        const dlToken = crypto.randomUUID();
        await file.save(finalBuffer, {
          metadata: {
            contentType: 'application/pdf',
            metadata: { firebaseStorageDownloadTokens: dlToken },
          },
        });
        const encodedPath = encodeURIComponent(filePath);
        const pdfURL = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodedPath}?alt=media&token=${dlToken}`;
        await invoiceSnap.ref.update({ pdfURL });
        resolve({ pdfURL });
      } catch (err) { reject(err); }
    });
    doc.on('error', reject);
  });
});

// ============================================================
// 11. onReviewCreated — Update user ratings
// ============================================================
export const onReviewCreated = onDocumentCreated(
  'reviews/{reviewId}',
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    const review = snap.data();

    // Update reviewee's avg rating
    const revieweeRef = db.collection('users').doc(review.revieweeId);
    const revieweeSnap = await revieweeRef.get();
    if (!revieweeSnap.exists) return;

    const stats = revieweeSnap.data()?.stats || {};
    const currentAvg = stats.avgRating || 0;
    const currentCount = stats.ratingCount || 0;
    const newCount = currentCount + 1;
    const newAvg = ((currentAvg * currentCount) + review.rating) / newCount;

    await revieweeRef.update({
      'stats.avgRating': Math.round(newAvg * 100) / 100,
      'stats.ratingCount': newCount,
      updatedAt: FieldValue.serverTimestamp(),
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
  }
);
