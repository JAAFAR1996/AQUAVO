import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, X, Image as ImageIcon, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface MultipleImageUploadProps {
    images: string[];
    onImagesChange: (images: string[]) => void;
    maxImages?: number;
}

export function MultipleImageUpload({
    images,
    onImagesChange,
    maxImages = 10
}: MultipleImageUploadProps) {
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFiles = async (files: FileList) => {
        const remainingSlots = maxImages - images.length;
        if (remainingSlots <= 0) {
            alert(`يمكنك رفع ${maxImages} صور كحد أقصى`);
            return;
        }

        const filesToProcess = Array.from(files).slice(0, remainingSlots);
        const validFiles = filesToProcess.filter(file => file.type.startsWith('image/'));

        if (validFiles.length === 0) {
            alert('الرجاء اختيار صور فقط');
            return;
        }

        try {
            const { compressImage } = await import("@/lib/image-utils");
            const base64Images: string[] = [];

            for (const file of validFiles) {
                try {
                    // Compress to 1MB max per image to fit within Vercel's 4.5MB request limit
                    const base64 = await compressImage(file, 1);
                    base64Images.push(base64);
                } catch (error) {
                    console.error("Error compressing image:", file.name, error);
                }
            }

            if (base64Images.length > 0) {
                onImagesChange([...images, ...base64Images]);
            }
        } catch (error) {
            console.error("Error processing images:", error);
            alert('حدث خطأ أثناء معالجة الصور');
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        handleFiles(e.dataTransfer.files);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            handleFiles(e.target.files);
        }
    };

    const removeImage = (index: number) => {
        const newImages = images.filter((_, i) => i !== index);
        onImagesChange(newImages);
    };

    const canAddMore = images.length < maxImages;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <Label className="text-base">صور إضافية ({images.length}/{maxImages})</Label>
                {canAddMore && (
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        className="gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        إضافة صور
                    </Button>
                )}
            </div>

            {/* Existing Images Grid */}
            {images.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                    {images.map((image, index) => (
                        <div
                            key={`${image.slice(0, 50)}-${index}`}
                            className="relative group aspect-square rounded-lg border-2 border-border overflow-hidden bg-muted"
                        >
                            <img
                                src={image}
                                alt={`صورة ${index + 1}`}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).src = "/placeholder-product.svg";
                                }}
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Button
                                    type="button"
                                    variant="destructive"
                                    size="icon"
                                    onClick={() => removeImage(index)}
                                    className="h-8 w-8"
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                            <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs text-center py-1">
                                صورة {index + 1}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Drop Zone (only show if can add more) */}
            {canAddMore && (
                <div
                    className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${isDragging
                        ? 'border-primary bg-primary/10'
                        : 'border-muted-foreground/25 hover:border-primary'
                        }`}
                    onDrop={handleDrop}
                    onDragOver={(e) => {
                        e.preventDefault();
                        setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <div className="flex flex-col items-center gap-2">
                        {isDragging ? (
                            <Upload className="w-10 h-10 text-primary animate-bounce" />
                        ) : (
                            <ImageIcon className="w-10 h-10 text-muted-foreground" />
                        )}
                        <p className="text-sm text-muted-foreground">
                            اسحب وأفلت الصور هنا أو انقر للاختيار
                        </p>
                        <p className="text-xs text-muted-foreground/60">
                            يمكنك رفع عدة صور معاً (PNG, JPG, WEBP - حتى 5 ميجابايت لكل صورة)
                        </p>
                        <p className="text-xs text-primary font-medium">
                            يمكنك إضافة {maxImages - images.length} صورة أخرى
                        </p>
                    </div>
                </div>
            )}

            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleChange}
                className="hidden"
            />
        </div>
    );
}
