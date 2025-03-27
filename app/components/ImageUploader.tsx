import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface ImageUploaderProps {
  onUploadComplete?: (url: string, filename: string) => void;
  className?: string;
}

export function ImageUploader({ onUploadComplete, className }: ImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;
      const file = acceptedFiles[0];
      setIsUploading(true);

      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'アップロードに失敗しました');
        }

        const data = await response.json();
        toast.success('画像のアップロードが完了しました');
        onUploadComplete?.(data.publicUrl, data.filename);
      } catch (error) {
        console.error('Upload error:', error);
        toast.error(error instanceof Error ? error.message : 'アップロードに失敗しました');
      } finally {
        setIsUploading(false);
      }
    },
    [onUploadComplete]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
    },
    maxFiles: 1,
  });

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors ${
        isDragActive ? 'border-primary bg-primary/5' : 'border-gray-300'
      } ${className}`}
    >
      <input {...getInputProps()} />
      <div className="space-y-4">
        <div className="text-sm text-gray-600">
          {isDragActive ? (
            <p>ここにファイルをドロップ...</p>
          ) : (
            <p>クリックしてファイルを選択するか、ファイルをドラッグ&ドロップしてください</p>
          )}
        </div>
        <Button disabled={isUploading} variant="outline">
          {isUploading ? 'アップロード中...' : 'ファイルを選択'}
        </Button>
      </div>
    </div>
  );
}
