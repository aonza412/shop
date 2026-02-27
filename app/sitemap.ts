import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
    // Replace with your actual production URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://shop-two-pink-40.vercel.app'

    return [
        {
            url: baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`,
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 1,
        },
    ]
}
