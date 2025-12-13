import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, X, Image as ImageIcon } from "lucide-react";

interface ImageUploadProps {
  value?: string;
  onChange: (base64: string) => void;
  onRemove?: () => void;
}

export function ImageUpload({ value, onChange, onRemove }: ImageUploadProps) {
  const [preview, setPreview] = useState<string | undefined>(value);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('الرجاء اختيار صورة فقط');
      return;
    }

    try {
      // Use the utility to compress/resize the image to safe limits (4MB)
      const { compressImage } = await import("@/lib/image-utils");
      const base64 = await compressImage(file, 4);

      setPreview(base64);
      onChange(base64);
    } catch (error) {
      console.error("Error compressing image:", error);
      alert('حدث خطأ أثناء معالجة الصورة. يرجى المحاولة مرة أخرى.');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleRemove = () => {
    setPreview(undefined);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (onRemove) onRemove();
  };

  return (
    <div className="space-y-2">
      <Label>صورة المنتج</Label>

      {preview ? (
        <div className="relative group">
          <img
            src={preview}
            alt="معاينة"
            className="w-full h-48 object-cover rounded-lg border-2 border-gray-200"
          />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={handleRemove}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${isDragging
              ? 'border-primary bg-primary/10'
              : 'border-gray-300 hover:border-primary'
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
              <Upload className="w-12 h-12 text-primary animate-bounce" />
            ) : (
              <ImageIcon className="w-12 h-12 text-gray-400" />
            )}
            <p className="text-sm text-gray-600">
              اسحب وأفلت صورة هنا أو انقر للاختيار
            </p>
            <p className="text-xs text-gray-400">
              PNG, JPG, WEBP (حتى 5 ميجابايت)
            </p>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleChange}
        className="hidden"
      />
    </div>
  );
}
