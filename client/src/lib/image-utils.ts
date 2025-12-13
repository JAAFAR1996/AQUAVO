
/**
 * Compresses an image file to ensure it matches a maximum file size limit (default 4MB to be safe for Vercel).
 * Uses canvas to resize/compress the image.
 */
export async function compressImage(file: File, maxSizeMB: number = 4): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Start with original dimensions
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        // Initial quality guess
        let quality = 0.9;
        let dataUrl = canvas.toDataURL('image/jpeg', quality);

        // Binary search / iteration to reduce size if needed
        const maxBytes = maxSizeMB * 1024 * 1024;

        // If it's already small enough, return it (but check if original was smaller to avoid upscaling size unnecessarily)
        // If the original file was smaller than maxBytes and likely optimized, creating a base64 from canvas might actually increase size 
        // if we are not careful. However, we are converting to base64 anyway.
        // Let's check the base64 length. Base64 is ~1.33x larger than binary.
        // So 4MB binary ~= 5.3MB Base64.
        
        // Simple loop to reduce quality/size
        while (dataUrl.length > maxBytes * 1.37 && quality > 0.1) {
            // Reduce dimensions if quality is getting too low
            if (quality < 0.5) {
                width *= 0.8;
                height *= 0.8;
                canvas.width = width;
                canvas.height = height;
                ctx?.drawImage(img, 0, 0, width, height);
                // Reset quality to try high quality at lower res
                quality = 0.8; 
            } else {
                quality -= 0.1;
            }
            dataUrl = canvas.toDataURL('image/jpeg', quality);
        }

        resolve(dataUrl);
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
}
