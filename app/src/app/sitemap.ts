import { MetadataRoute } from 'next';
import { toSlugWithId } from '@/lib/seo/slug';

const BASE_URL = 'https://vaa-job.vercel.app';
const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'vaa-job';

async function getJobSlugs(): Promise<string[]> {
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/jobs?pageSize=200&mask.fieldPaths=slug&mask.fieldPaths=title`;
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const data = await res.json();
    if (!data.documents) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data.documents.map((doc: any) => {
      const parts = doc.name.split('/');
      const id = parts[parts.length - 1];
      const slug = doc.fields?.slug?.stringValue;
      const title = doc.fields?.title?.stringValue;
      if (slug) return slug;
      if (title) return toSlugWithId(title, id);
      return id;
    });
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const jobSlugs = await getJobSlugs();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${BASE_URL}/jobs`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.9 },
    { url: `${BASE_URL}/vinh-danh`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.6 },
    { url: `${BASE_URL}/huy-hieu`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.5 },
  ];

  const jobRoutes: MetadataRoute.Sitemap = jobSlugs.map(slug => ({
    url: `${BASE_URL}/jobs/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.8,
  }));

  return [...staticRoutes, ...jobRoutes];
}

