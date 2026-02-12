import { v2 as cloudinary } from 'cloudinary';
import { NextResponse } from 'next/server';

cloudinary.config({
    cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        if (!process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET || !process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME) {
            return NextResponse.json({ error: 'Cloudinary credentials not configured' }, { status: 500 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Upload to Cloudinary using a stream
        const result = await new Promise<any>((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                { resource_type: 'auto', folder: 'shop-products' },
                (error, result) => {
                    if (error) reject(error);
                    else resolve(result);
                }
            );
            uploadStream.end(buffer);
        });

        return NextResponse.json({ url: result.secure_url }, { status: 200 });
    } catch (error) {
        console.error('Upload Error:', error);
        return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { url, publicId } = await request.json();
        let pid = publicId;

        if (!pid && url) {
            // Extract public ID from Cloudinary URL
            // Example: https://res.cloudinary.com/cloudname/image/upload/v12345678/folder/image.jpg
            const regex = /\/upload\/(?:v\d+\/)?(.+)\.[^.]+$/;
            const match = url.match(regex);
            if (match && match[1]) {
                pid = match[1];
            }
        }

        if (!pid) {
            return NextResponse.json({ error: 'Invalid URL or publicId' }, { status: 400 });
        }

        const result = await cloudinary.uploader.destroy(pid);

        return NextResponse.json({ result }, { status: 200 });

    } catch (error) {
        console.error('Delete Error:', error);
        return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
    }
}
