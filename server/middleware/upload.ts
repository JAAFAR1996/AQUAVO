import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary if credentials are provided
if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
  console.log('✅ Cloudinary configured');
}

// Simple file upload handler
export function handleImageUpload(req: any, res: any, next: any) {
  next();
}

/**
 * Saves a base64 image string to Cloudinary
 * @throws Error if Cloudinary credentials are not configured
 */
export async function saveBase64Image(base64Data: string, folder: string = "products"): Promise<string> {
  try {
    // Verify Cloudinary is configured - REQUIRED
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY) {
      throw new Error('Cloudinary credentials not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in your environment.');
    }

    return await saveToCloudinary(base64Data, folder);
  } catch (error) {
    console.error("Error saving image to Cloudinary:", error);
    throw error;
  }
}

/**
 * Deletes an image from Cloudinary
 * Only supports Cloudinary URLs
 */
export async function deleteImage(imageUrl: string): Promise<boolean> {
  try {
    // Only support Cloudinary URLs
    if (!imageUrl.includes('cloudinary.com')) {
      console.warn('Non-Cloudinary URL provided for deletion. Only Cloudinary URLs are supported:', imageUrl);
      return false;
    }

    return await deleteFromCloudinary(imageUrl);
  } catch (error) {
    console.error("Error deleting image from Cloudinary:", error);
    return false;
  }
}

// --- Implementation Details ---

// Upload to Cloudinary
async function saveToCloudinary(base64Data: string, folder: string): Promise<string> {
  return new Promise((resolve, reject) => {
    // Cloudinary expects: "data:image/png;base64,....." or just base64? 
    // It handles data URI automatically.

    const uploadOptions = {
      folder: `fishweb/${folder}`,
      public_id: randomUUID(),
      resource_type: 'auto' as const
    };

    cloudinary.uploader.upload(base64Data, uploadOptions, (error, result) => {
      if (error) {
        console.error('Cloudinary Upload Error:', error);
        return reject(error);
      }
      if (!result) {
        return reject(new Error('No result from Cloudinary'));
      }
      resolve(result.secure_url);
    });
  });
}

// Delete from Cloudinary
async function deleteFromCloudinary(imageUrl: string): Promise<boolean> {
  try {
    // Extract public_id from URL: 
    // Example: https://res.cloudinary.com/demo/image/upload/v12345/fishweb/products/sample.jpg
    // public_id needs to be: fishweb/products/sample

    const parts = imageUrl.split('/');
    const versionIndex = parts.findIndex(p => p.startsWith('v') && !isNaN(Number(p.substring(1))));

    // Safety check just in case URL structure differs
    const startIndex = versionIndex !== -1 ? versionIndex + 1 : parts.indexOf('fishweb');

    if (startIndex === -1) {
      console.warn('Could not parse Cloudinary public_id from URL:', imageUrl);
      return false;
    }

    const publicIdWithExt = parts.slice(startIndex).join('/');
    const publicId = publicIdWithExt.split('.')[0]; // Remove extension

    await cloudinary.uploader.destroy(publicId);
    return true;
  } catch (error) {
    console.error('Cloudinary Delete Error:', error);
    return false;
  }
}

// Local storage functions removed - Cloudinary-only storage enforced
// If you need to test locally without Cloudinary, configure free Cloudinary account

/**
 * @deprecated Local file storage is no longer supported. Use Cloudinary.
 */
function saveToLocal(base64Data: string, folder: string): string {
  throw new Error('Local file storage is deprecated. Please configure Cloudinary credentials.');
}

/**
 * @deprecated Local file storage is no longer supported. Use Cloudinary.
 */
function deleteFromLocal(imageUrl: string): boolean {
  console.warn('Local file deletion attempted but local storage is deprecated.');
  return false;
}
