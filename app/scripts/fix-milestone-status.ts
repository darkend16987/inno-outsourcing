/**
 * One-time fix: Activate milestone 2 for job BoBURHQmnPGpaLumv7UB
 * Run with: npx tsx scripts/fix-milestone-status.ts
 */
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as path from 'path';
import * as fs from 'fs';

// Try to find service account
const saPath = path.resolve(__dirname, '../serviceAccountKey.json');
if (!fs.existsSync(saPath)) {
  console.error('❌ Service account key not found at:', saPath);
  console.log('You can fix this manually in Firebase Console → Firestore → jobs → BoBURHQmnPGpaLumv7UB');
  console.log('Set milestones[1].status = "in_progress" (the second milestone)');
  process.exit(1);
}

const app = initializeApp({
  credential: cert(saPath as string),
});

const db = getFirestore(app);

async function fixMilestones() {
  const jobId = 'BoBURHQmnPGpaLumv7UB';
  const jobRef = db.collection('jobs').doc(jobId);
  const jobSnap = await jobRef.get();
  
  if (!jobSnap.exists) {
    console.error('❌ Job not found:', jobId);
    return;
  }

  const data = jobSnap.data()!;
  const milestones = data.milestones || [];
  
  console.log('Current milestones:');
  milestones.forEach((m: any, i: number) => {
    console.log(`  ${i + 1}. ${m.name} → status: ${m.status}`);
  });

  // Find and activate the first non-released, non-in_progress milestone
  let activated = false;
  const fixed = milestones.map((m: any) => {
    if (!activated && 
        m.status !== 'released' && m.status !== 'paid' && m.status !== 'approved' && 
        m.status !== 'in_progress' && m.status !== 'review') {
      activated = true;
      console.log(`\n→ Activating: "${m.name}" (was: ${m.status})`);
      return { ...m, status: 'in_progress' };
    }
    return m;
  });

  if (!activated) {
    console.log('\n✅ No fix needed — all milestones are already in correct state.');
    return;
  }

  // Calculate progress
  const releasedPct = fixed
    .filter((m: any) => ['released', 'paid', 'approved'].includes(m.status))
    .reduce((s: number, m: any) => s + (m.percentage || 0), 0);

  await jobRef.update({
    milestones: fixed,
    progress: Math.min(releasedPct, 100),
    status: 'in_progress',
  });

  console.log(`✅ Fixed! Progress: ${releasedPct}%, Status: in_progress`);
}

fixMilestones().then(() => process.exit(0)).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
