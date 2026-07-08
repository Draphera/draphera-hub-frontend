import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://hub.draphera.com';
  return [
    { url: base, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/changelog`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
    { url: `${base}/termini`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.2 },
    { url: `${base}/privacy`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.2 },
    { url: `${base}/cancellazione-dati`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.2 },
    { url: `${base}/auth/signin`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${base}/auth/signup`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
  ];
}
