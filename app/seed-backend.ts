/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any -- seed script uses require for dynamic JSON loading */
import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

// MOCK DATA INLINED
const MOCK_JOBS = [
  { id: '1', title: 'Thiết kế kiến trúc Nhà xưởng KCN Bình Dương', category: 'Kiến trúc', level: 'L3', fee: 48000000, duration: '45 ngày', workMode: 'remote', desc: 'Thiết kế kiến trúc nhà xưởng sản xuất diện tích 5000m2, bao gồm văn phòng điều hành và khu sản xuất.', highlightTags: ['HOT', 'Siêu tốc'] },
  { id: '2', title: 'BIM Modeling tổ hợp văn phòng 12 tầng Q7', category: 'BIM', level: 'L4', fee: 65000000, duration: '60 ngày', workMode: 'hybrid', desc: 'Modeling 3D BIM Revit đầy đủ hệ Kiến trúc, Kết cấu cho tòa nhà văn phòng hạng A.', highlightTags: ['Thưởng hiệu suất'] },
  { id: '3', title: 'Thiết kế kết cấu Bệnh viện Đa khoa Cần Thơ', category: 'Kết cấu', level: 'L5', fee: 120000000, duration: '90 ngày', workMode: 'on-site', desc: 'Thiết kế kết cấu BTCT, thép cho bệnh viện 200 giường, 8 tầng + 2 tầng hầm.', highlightTags: ['HOT'] },
];

const MOCK_LEADERBOARD = [
  { id: 'lb-1', rank: 1, name: 'Nguyễn Minh An', initials: 'AN', level: 'L4', field: 'Kết cấu', earnings: 186000000, badges: ['Top Earner', 'Speed Master'] },
  { id: 'lb-2', rank: 2, name: 'Trần Bảo Thy', initials: 'BT', level: 'L3', field: 'BIM Modeling', earnings: 152000000, badges: [] },
  { id: 'lb-3', rank: 3, name: 'Phạm Hoàng Quân', initials: 'HQ', level: 'L5', field: 'Thẩm tra', earnings: 148000000, badges: [] },
];

const MOCK_BADGES = [
  { id: 'bg-1', title: 'Speed Master', desc: 'Hoàn thành 5 dự án trước hạn', icon: 'zap' },
  { id: 'bg-2', title: 'Top Earner', desc: 'Doanh thu vượt mốc 100M VND', icon: 'award' },
];


// Initialize Firebase Admin
const serviceAccountPath = path.resolve(__dirname, 'serviceAccountKey.json');
if (!fs.existsSync(serviceAccountPath)) {
  console.error("❌ Mising serviceAccountKey.json. Please ensure the file is at root");
  process.exit(1);
}

const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const auth = admin.auth();

async function seedAdmin() {
  const email = 'hoangnam.mng@gmail.com';
  const password = 'admin@123456';
  
  let userRecord;
  try {
    userRecord = await auth.getUserByEmail(email);
    console.log(`✅ Auth User ${email} already exists. Updating password...`);
    await auth.updateUser(userRecord.uid, { password });
  } catch (error: any) {
    if (error.code === 'auth/user-not-found') {
      console.log(`Creating Admin Auth User: ${email}...`);
      userRecord = await auth.createUser({
        email,
        password,
        displayName: 'Hoàng Nam (Superadmin)',
      });
      console.log(`✅ Auth User created: ${userRecord.uid}`);
    } else {
      throw error;
    }
  }

  // Create Firestore record
  await db.collection('users').doc(userRecord.uid).set({
    displayName: 'Hoàng Nam (Superadmin)',
    email: email,
    role: 'admin',
    status: 'active',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  console.log(`✅ Firestore User Record set to 'admin' role!`);
}

async function seedData() {
  console.log('--- SEEDING MOCK JOBS ---');
  let jobCount = 0;
  for (const job of MOCK_JOBS) {
    await db.collection('jobs').doc(job.id).set({
      ...job,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    jobCount++;
  }
  console.log(`✅ Seeded ${jobCount} Jobs.`);

  console.log('--- SEEDING LEADERBOARD ---');
  let leadCount = 0;
  for (const entry of MOCK_LEADERBOARD) {
    await db.collection('leaderboard').doc(entry.id).set({
      ...entry,
    });
    leadCount++;
  }
  console.log(`✅ Seeded ${leadCount} Leaderboard Entries.`);

  console.log('--- SEEDING BADGES MASTER DEFINITIONS ---');
  let badgeCount = 0;
  for (const badge of MOCK_BADGES) {
    // Putting badges in a master definition collection
    await db.collection('badge_definitions').doc(badge.id).set({
      ...badge,
    });
    badgeCount++;
  }
  console.log(`✅ Seeded ${badgeCount} Badges.`);
}

async function main() {
  try {
    await seedAdmin();
    await seedData();
    console.log('🎉 REAL-TIME BACKEND INIT SUCCESSFUL!');
    process.exit(0);
  } catch (err) {
    console.error('❌ INITIALIZATION ERROR:', err);
    process.exit(1);
  }
}

main();
