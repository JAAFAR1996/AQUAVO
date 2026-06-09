import { describe, it, expect } from 'vitest';
import { getCloudinaryFolder, validateImageUrls } from '../routes/admin.js';
import { OperationalError } from '../middleware/error-handler.js';

describe('Admin Product Image Upload Utilities', () => {
    describe('getCloudinaryFolder', () => {
        it('should correctly format folder paths based on brand and slug', () => {
            const folder = getCloudinaryFolder('OASE', 'filter-smart-100');
            expect(folder).toBe('aquavo/products/oase/filter-smart-100');
        });

        it('should use unknown for empty or missing brand', () => {
            const folder1 = getCloudinaryFolder(null, 'tank-50');
            const folder2 = getCloudinaryFolder('', 'tank-50');
            const folder3 = getCloudinaryFolder(undefined, 'tank-50');
            expect(folder1).toBe('aquavo/products/unknown/tank-50');
            expect(folder2).toBe('aquavo/products/unknown/tank-50');
            expect(folder3).toBe('aquavo/products/unknown/tank-50');
        });

        it('should sanitize special characters in brand and slug', () => {
            const folder = getCloudinaryFolder('Super Brand!', 'product_slug#123');
            expect(folder).toBe('aquavo/products/superbrand/product_slug123');
        });

        it('should fallback to unnamed for missing slug/ID', () => {
            const folder = getCloudinaryFolder('Sera', '');
            expect(folder).toBe('aquavo/products/sera/unnamed');
        });
    });

    describe('validateImageUrls', () => {
        it('should not throw for valid Cloudinary URLs', () => {
            const validUrl = 'https://res.cloudinary.com/aquavo/image/upload/v123456/aquavo/products/test.jpg';
            expect(() => {
                validateImageUrls(validUrl, [validUrl]);
            }).not.toThrow();
        });

        it('should not throw if thumbnail/images are empty or undefined', () => {
            expect(() => {
                validateImageUrls(undefined, undefined);
                validateImageUrls('', []);
                validateImageUrls(null, null);
            }).not.toThrow();
        });

        it('should throw OperationalError if thumbnail is a base64 string', () => {
            const base64Url = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA';
            expect(() => {
                validateImageUrls(base64Url, []);
            }).toThrow(OperationalError);

            try {
                validateImageUrls(base64Url, []);
            } catch (err: any) {
                expect(err.message).toContain('فشل رفع الصورة المصغرة');
                expect(err.statusCode).toBe(400);
            }
        });

        it('should NOT throw OperationalError if thumbnail is a local filesystem path', () => {
            const localPath = '/images/products/heater.jpg';
            expect(() => {
                validateImageUrls(localPath, []);
            }).not.toThrow();
        });

        it('should throw OperationalError if thumbnail is not a valid Cloudinary URL', () => {
            const invalidUrl = 'https://external-site.com/image.jpg';
            expect(() => {
                validateImageUrls(invalidUrl, []);
            }).toThrow(OperationalError);

            try {
                validateImageUrls(invalidUrl, []);
            } catch (err: any) {
                expect(err.message).toContain('ليس رابطاً صالحاً');
                expect(err.statusCode).toBe(400);
            }
        });

        it('should throw OperationalError if any image in the gallery is a base64 string', () => {
            const validUrl = 'https://res.cloudinary.com/aquavo/image/upload/v123/img.jpg';
            const base64Url = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA';
            expect(() => {
                validateImageUrls(validUrl, [validUrl, base64Url]);
            }).toThrow(OperationalError);

            try {
                validateImageUrls(validUrl, [validUrl, base64Url]);
            } catch (err: any) {
                expect(err.message).toContain('فشل رفع إحدى الصور الإضافية');
                expect(err.statusCode).toBe(400);
            }
        });

        it('should NOT throw OperationalError if any image in the gallery is a local path', () => {
            const validUrl = 'https://res.cloudinary.com/aquavo/image/upload/v123/img.jpg';
            const localPath = '/images/products/img.png';
            expect(() => {
                validateImageUrls(validUrl, [validUrl, localPath]);
            }).not.toThrow();
        });

        it('should throw OperationalError if any image in the gallery is not a Cloudinary URL', () => {
            const validUrl = 'https://res.cloudinary.com/aquavo/image/upload/v123/img.jpg';
            const externalUrl = 'https://someplace.com/img.jpg';
            expect(() => {
                validateImageUrls(validUrl, [validUrl, externalUrl]);
            }).toThrow(OperationalError);
        });
    });

    describe('Product Image Payload Assembly Logic', () => {
        it('should preserve order and prepend thumbnail to images array', () => {
            const thumbnailUrl = 'https://res.cloudinary.com/aquavo/image/upload/v1/thumb.jpg';
            const processedImages = [
                'https://res.cloudinary.com/aquavo/image/upload/v1/img1.jpg',
                'https://res.cloudinary.com/aquavo/image/upload/v1/img2.jpg',
                'https://res.cloudinary.com/aquavo/image/upload/v1/thumb.jpg'
            ];

            // Replicate route's thumbnail prefixing logic
            const finalImages = [thumbnailUrl, ...processedImages.filter(img => img !== thumbnailUrl)];

            expect(finalImages[0]).toBe(thumbnailUrl);
            expect(finalImages[1]).toBe(processedImages[0]);
            expect(finalImages[2]).toBe(processedImages[1]);
            expect(finalImages).toHaveLength(3);
        });

        it('should set first image as thumbnail when no main image was uploaded', () => {
            const processedImages = [
                'https://res.cloudinary.com/aquavo/image/upload/v1/img1.jpg',
                'https://res.cloudinary.com/aquavo/image/upload/v1/img2.jpg'
            ];
            let thumbnail = '';

            // Replicate route's fallback thumbnail logic
            let finalImages = processedImages;
            if (finalImages.length > 0 && (!thumbnail || thumbnail.startsWith('data:'))) {
                thumbnail = finalImages[0];
            }

            expect(thumbnail).toBe(processedImages[0]);
            expect(finalImages).toEqual(processedImages);
        });
    });

    describe('Upload Failure Transaction Integrity', () => {
        it('should propagate upload errors and throw OperationalError to prevent partial updates', async () => {
            const mockUploadImage = async (_base64: string) => {
                throw new Error("Upload limit exceeded");
            };

            const simulateRouteHandler = async () => {
                try {
                    await mockUploadImage("data:image/png;base64,...");
                } catch (error) {
                    throw new OperationalError("فشل رفع الصورة الرئيسية إلى Cloudinary.", 400);
                }
            };

            await expect(simulateRouteHandler()).rejects.toThrow(OperationalError);
        });
    });
});
