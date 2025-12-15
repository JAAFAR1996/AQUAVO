import { v2 as cloudinary } from 'cloudinary';

if (!process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET) {
    console.warn("Missing Cloudinary credentials. Image upload will fail.");
}

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function uploadImage(imageBase64: string): Promise<string> {
    try {
        const result = await cloudinary.uploader.upload(imageBase64, {
            folder: "aquavo-products",
        });
        return result.secure_url;
    } catch (error) {
        console.error("Cloudinary upload failed:", error);
        throw new Error("Failed to upload image");
    }
}

/**
 * Delete an image from Cloudinary
 * @param imageUrl - Full Cloudinary URL or public ID
 * @returns true if deleted successfully, false otherwise
 */
export async function deleteImage(imageUrl: string): Promise<boolean> {
    try {
        // Extract public_id from Cloudinary URL
        // Format: https://res.cloudinary.com/{cloud_name}/image/upload/v{version}/{folder}/{public_id}.{ext}
        let publicId = imageUrl;

        if (imageUrl.includes('cloudinary.com')) {
            // Extract the path after 'upload/' and remove file extension
            const match = imageUrl.match(/\/upload\/(?:v\d+\/)?(.+?)\.[^.]+$/);
            if (match) {
                publicId = match[1];
            }
        }

        const result = await cloudinary.uploader.destroy(publicId);
        return result.result === 'ok';
    } catch (error) {
        console.error("Cloudinary delete failed:", error);
        return false;
    }
}
