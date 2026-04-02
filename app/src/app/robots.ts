import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',
          '/jobmaster/',
          '/accountant/',
          '/freelancer/',
          '/api/',
          '/login',
          '/register',
        ],
      },
    ],
    sitemap: 'https://vaa-job.vercel.app/sitemap.xml',
  };
}
