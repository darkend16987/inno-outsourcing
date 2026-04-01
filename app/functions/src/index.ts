import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as PDFDocument from 'pdfkit';
import { 
  Contract, 
  Job, 
  Payment, 
  UserProfile 
} from '../../src/types'; // Reference to existing types

admin.initializeApp();
const db = admin.firestore();
const storage = admin.storage();

/**
 * Triggered on assignment of a job to generate a legal PDF contract.
 * Path: /contracts/{contractId}
 */
export const onCreateContractPDF = functions.firestore
  .document('contracts/{contractId}')
  .onCreate(async (snap, context) => {
    const contract = snap.data() as Contract;
    const bucket = storage.bucket();
    const filePath = `contracts/${context.params.contractId}.pdf`;
    const doc = new PDFDocument();
    
    const buffers: any[] = [];
    doc.on('data', (chunk) => buffers.push(chunk));
    
    // Simple PDF Structure
    doc.fontSize(20).text('CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM', { align: 'center' });
    doc.fontSize(16).text('HỢP ĐỒNG KINH TẾ (THIẾT KẾ / OUTSOURCING)', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Số hợp đồng: ${contract.contractNumber}`);
    doc.text(`Tên dự án: ${contract.jobTitle}`);
    doc.moveDown();
    doc.text(`BÊN A (Chủ sở hữu): ${contract.partyA.name}`);
    doc.text(`BÊN B (Freelancer): ${contract.partyB.name}`);
    doc.moveDown();
    doc.text('ĐIỀU KHOẢN THANH TOÁN:');
    doc.text(contract.paymentTerms);
    doc.moveDown();
    doc.text('XÁC NHẬN KÝ KẾT ĐIỆN TỬ:');
    doc.text(`Thời điểm khởi tạo: ${new Date(contract.createdAt).toLocaleString()}`);
    
    doc.end();

    return new Promise((resolve, reject) => {
      doc.on('end', async () => {
        const finalBuffer = Buffer.concat(buffers);
        const file = bucket.file(filePath);
        await file.save(finalBuffer, {
          metadata: { contentType: 'application/pdf' }
        });
        
        // Update document with PDF URL
        const pdfURL = `https://storage.googleapis.com/${bucket.name}/${filePath}`;
        await snap.ref.update({ pdfURL });
        resolve(true);
      });
      doc.on('error', reject);
    });
  });

/**
 * Callable Function to Request a Payment Order for a specific milestone.
 * Called by Job Master after technical approval.
 */
export const requestPaymentOrder = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Yêu cầu đăng nhập.');
  
  const { jobId, milestoneId, amount, workerId, workerName, reason } = data;

  // Verify Role is Job Master or Admin via collection lookup
  const userSnap = await db.collection('users').doc(context.auth.uid).get();
  const profile = userSnap.data() as UserProfile;
  if (profile.role !== 'jobmaster' && profile.role !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Bạn không có quyền thực hiện thanh toán.');
  }

  // Create Transaction Document in /payments collection
  const paymentData: Partial<Payment> = {
    jobId,
    milestoneId,
    workerId,
    workerName,
    amount,
    reason,
    status: 'pending',
    triggeredByMilestone: true,
    approvedByJobMaster: context.auth.uid,
    createdAt: admin.firestore.FieldValue.serverTimestamp() as any,
    updatedAt: admin.firestore.FieldValue.serverTimestamp() as any,
  };

  const paymentRef = await db.collection('payments').add(paymentData);

  // Update Milestone status in the job document
  const jobRef = db.collection('jobs').doc(jobId);
  const jobSnap = await jobRef.get();
  const jobData = jobSnap.data() as Job;
  const updatedMilestones = jobData.milestones.map(m => 
    m.id === milestoneId ? { ...m, status: 'approved', approvedBy: context.auth.uid, approvedAt: new Date() } : m
  );

  await jobRef.update({ milestones: updatedMilestones });

  return { success: true, paymentId: paymentRef.id };
});
