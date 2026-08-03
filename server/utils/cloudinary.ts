import { v2 as cloudinary } from 'cloudinary';

if (!process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET) {
    console.warn("Missing Cloudinary credentials. Uploads will fail.");
}

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function uploadImage(imageBase64: string, folder: string = "aquavo/products/general"): Promise<string> {
    try {
        const result = await cloudinary.uploader.upload(imageBase64, {
            folder,
            transformation: [
                { width: 1200, height: 1200, crop: "limit" },
                { fetch_format: "auto", quality: "auto" },
            ],
        });
        return result.secure_url;
    } catch (error) {
        console.error("Cloudinary upload failed:", error);
        throw new Error("Failed to upload image");
    }
}

export interface UploadedAccountingDocument {
    secureUrl: string;
    publicId: string;
    resourceType: string;
    format: string | null;
    bytes: number;
}

/**
 * Upload original accounting evidence without image transformations.
 * Images and PDFs are retained as supplied; their SHA-256 is computed by the
 * upload route before this function is called and stored separately in Postgres.
 */
export async function uploadAccountingDocument(
    dataUri: string,
    originalName: string,
): Promise<UploadedAccountingDocument> {
    try {
        const safeName = originalName.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 120);
        const result = await cloudinary.uploader.upload(dataUri, {
            folder: "aquavo/accounting/evidence",
            resource_type: "auto",
            use_filename: true,
            unique_filename: true,
            filename_override: safeName,
            overwrite: false,
        });
        return {
            secureUrl: result.secure_url,
            publicId: result.public_id,
            resourceType: result.resource_type,
            format: result.format ?? null,
            bytes: result.bytes,
        };
    } catch (error) {
        console.error("Accounting evidence upload failed:", error);
        throw new Error("فشل رفع مستند الدليل");
    }
}

export async function deleteImage(imageUrl: string): Promise<boolean> {
    try {
        let publicId = imageUrl;
        if (imageUrl.includes('cloudinary.com')) {
            const match = imageUrl.match(/\/upload\/(?:v\d+\/)?(.+?)\.[^.]+$/);
            if (match) publicId = match[1];
        }
        const result = await cloudinary.uploader.destroy(publicId);
        return result.result === 'ok';
    } catch (error) {
        console.error("Cloudinary delete failed:", error);
        return false;
    }
}
