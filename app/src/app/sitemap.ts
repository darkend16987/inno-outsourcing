import { MetadataRoute } from 'next';

const BASE_URL = 'https://vaa-job.vercel.app';
const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'vaa-job';

async function getJobIds(): Promise<string[]> {
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/jobs?pageSize=200&mask.fieldPaths=__name__`;
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const data = await res.json();
    if (!data.documents) return [];
    return data.documents.map((doc: { name: string }) => {
      const parts = doc.name.split('/');
      return parts[parts.length - 1];
    });
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const jobIds = await getJobIds();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${BASE_URL}/jobs`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.9 },
    { url: `${BASE_URL}/vinh-danh`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.6 },
    { url: `${BASE_URL}/huy-hieu`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.5 },
  ];

  const jobRoutes: MetadataRoute.Sitemap = jobIds.map(id => ({
    url: `${BASE_URL}/jobs/${id}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.8,
  }));

  return [...staticRoutes, ...jobRoutes];
}
