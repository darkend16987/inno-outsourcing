import { Metadata } from 'next';

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'vaa-job';

/**
 * Fetch job data from Firestore REST API (no admin SDK needed)
 * This runs server-side during build/request for generateMetadata
 */
async function getJobForOG(id: string) {
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/jobs/${id}`;
    const res = await fetch(url, { next: { revalidate: 3600 } }); // cache 1 hour
    if (!res.ok) return null;
    const doc = await res.json();
    if (!doc.fields) return null;

    // Extract fields from Firestore REST format
    const f = doc.fields;
    return {
      title: f.title?.stringValue || '',
      category: f.category?.stringValue || '',
      description: f.description?.stringValue || f.desc?.stringValue || '',
      totalFee: parseInt(f.totalFee?.integerValue || f.fee?.integerValue || '0'),
      duration: parseInt(f.duration?.integerValue || '0'),
      workMode: f.workMode?.stringValue || 'remote',
      level: f.level?.stringValue || 'L1',
    };
  } catch {
    return null;
  }
}

// Dynamic metadata for SEO & social sharing
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;

  const defaults: Metadata = {
    title: 'Chi tiết công việc | VAA JOB',
    description: 'Xem chi tiết và ứng tuyển công việc thiết kế xây dựng trên nền tảng VAA JOB.',
    openGraph: {
      type: 'website',
      siteName: 'VAA JOB — Outsourcing Xây dựng',
      locale: 'vi_VN',
    },
  };

  const job = await getJobForOG(id);
  if (!job) return defaults;

  const workModeLabel = job.workMode === 'remote' ? 'Từ xa' : job.workMode === 'on-site' ? 'Tại chỗ' : 'Kết hợp';

  // Budget formatting for OG preview
  let budgetStr = '';
  if (job.totalFee >= 1_000_000_000) budgetStr = `${(job.totalFee / 1_000_000_000).toFixed(1)} tỷ`;
  else if (job.totalFee >= 1_000_000) budgetStr = `${(job.totalFee / 1_000_000).toFixed(0)} triệu`;
  else if (job.totalFee > 0) budgetStr = `${job.totalFee.toLocaleString('vi-VN')}₫`;

  const ogTitle = `${job.category ? `[${job.category}] ` : ''}${job.title}`;
  const ogDesc = [
    budgetStr ? `💰 ${budgetStr}` : '',
    job.duration ? `⏱ ${job.duration} ngày` : '',
    `🏢 ${workModeLabel}`,
    `📊 ${job.level}`,
    job.description ? job.description.slice(0, 100) : '',
  ].filter(Boolean).join(' • ');

  return {
    title: `${job.title} | VAA JOB`,
    description: ogDesc,
    keywords: [job.category, 'freelancer', 'outsourcing', 'thiết kế xây dựng', job.level].filter(Boolean),
    openGraph: {
      title: ogTitle,
      description: ogDesc,
      type: 'website',
      siteName: 'VAA JOB — Outsourcing Xây dựng',
      locale: 'vi_VN',
      url: `https://vaa-job.vercel.app/jobs/${id}`,
    },
    twitter: {
      card: 'summary',
      title: ogTitle,
      description: ogDesc,
    },
    alternates: {
      canonical: `https://vaa-job.vercel.app/jobs/${id}`,
    },
  };
}

export default function JobDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
