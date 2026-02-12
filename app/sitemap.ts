import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
    // Replace with your actual production URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || ""

    return [
        {
            url: baseUrl,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 1,
        },
    ]
}
