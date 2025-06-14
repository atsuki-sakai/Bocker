'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { FileImage } from 'lucide-react'
import { toast } from 'sonner'
import Image from 'next/image'
import { AspectType } from '@/convex/types'
import { useTranslations } from 'next-intl'

interface SingleImageDropProps {
  currentFile?: File | null
  onFileSelect?: (file: File | null) => void // ファイル選択時のコールバック
  onPreviewChange?: (previewUrl: string | null) => void // プレビュー画像変更時のコールバック
  maxSizeMB?: number // 最大サイズ(MB)
  previewWidth?: number // プレビュー幅
  previewHeight?: number // プレビュー高さ
  className?: string // クラス名
  placeholderText?: string // プレースホルダーテキスト
  accept?: string // 受け入れるファイルタイプ
  aspectType?: AspectType // アスペクト比の種類
}

export default function SingleImageDrop({
  currentFile,
  onFileSelect,
  maxSizeMB = 7,
  previewWidth = 1280,
  previewHeight = 1280,
  className = '',
  placeholderText,
  accept = 'image/*',
  aspectType = 'square',
}: SingleImageDropProps) {
  const t = useTranslations('common.imageDrop')
  // 選択されたファイルとプレビューURLの状態管理
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  // ファイルの処理
  const processFile = (file: File) => {
    const maxSize = maxSizeMB * 1024 * 1024
    if (!file.type.startsWith('image/')) {
      toast.error(t('notImage', { fileName: file.name }))
      return
    }
    if (file.size > maxSize) {
      toast.error(
        t('tooLarge', { fileName: file.name, maxSize: maxSizeMB })
      )
      return
    }
    const url = URL.createObjectURL(file)
    setSelectedFile(file)
    setPreviewImageUrl(url)
    onFileSelect?.(file)
  }

  // ファイル選択時の処理
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0])
    }
  }

  // ドロップ時の処理
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0])
      if (fileInputRef.current) {
        const dt = new DataTransfer()
        dt.items.add(e.dataTransfer.files[0])
        fileInputRef.current.files = dt.files
      }
    }
  }

  // 画像クリア処理
  const clearImage = useCallback(() => {
    if (previewImageUrl && previewImageUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewImageUrl)
    }
    setSelectedFile(null)
    setPreviewImageUrl(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    onFileSelect?.(null)
  }, [previewImageUrl, onFileSelect])

  useEffect(() => {
    if (currentFile === null) {
      clearImage()
    }
  }, [currentFile, clearImage])

  // ドラッグエリアのプレースホルダ表示
  const renderDragAreaPlaceholder = () => (
    <div className="flex flex-col items-center justify-center h-full">
      <FileImage
        className={`h-12 w-12 mx-auto mb-2 ${isDragging ? 'text-active' : 'text-muted-foreground'}`}
      />
      <p className={`text-sm mb-2 ${isDragging ? 'text-active' : 'text-muted-foreground'}`}>
        {isDragging ? t('dropHere') : placeholderText || t('placeholder')}
      </p>
      <p className="text-xs text-muted-foreground">{t('formats', { maxSize: maxSizeMB })}</p>
    </div>
  )

  return (
    <div
      className={`relative border border-dashed rounded-lg p-4 bg-background text-center overflow-hidden border-border h-fit transition-colors hover:bg-muted ${className}`}
      onDrop={handleDrop}
      onDragOver={(e) => {
        e.preventDefault()
        setIsDragging(true)
      }}
      onDragLeave={() => setIsDragging(false)}
    >
      {previewImageUrl ? (
        <div className="relative flex flex-col items-center justify-center w-full h-full">
          <Image
            src={previewImageUrl}
            alt="Preview"
            unoptimized
            loader={({ src }) => src}
            className={`mx-auto object-cover h-auto w-full rounded-md overflow-hidden ${aspectType === 'square' ? 'aspect-[1/1]' : aspectType === 'landscape' ? 'aspect-[16/9]' : 'aspect-[2/3]'}`}
            width={previewWidth}
            height={previewHeight}
          />
          <div className="flex items-center justify-center gap-2 mt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => fileInputRef.current?.click()}
            >
              {t('changeImage')}
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="mt-2"
              onClick={clearImage}
            >
              {t('deleteImage')}
            </Button>
          </div>
          {selectedFile && (
            <div className="flex items-center justify-between w-full gap-2 text-xs text-muted-foreground mt-2 text-start">
              <p className="truncate flex-1 min-w-0">
                <span className="font-bold">{t('fileName')}</span>
                <br />
                <span className="truncate block">{selectedFile.name}</span>
              </p>
              <p className="flex-shrink-0">
                <span className="font-bold">{t('fileSize')}</span>
                <br />
                {(selectedFile.size / 1024).toFixed(1)} KB
              </p>
            </div>
          )}
        </div>
      ) : (
        <>
          {renderDragAreaPlaceholder()}
          <div className="mt-4">
            <Button type="button" onClick={() => fileInputRef.current?.click()} className="w-full">
              {t('selectFile')}
            </Button>
          </div>
        </>
      )}

      <Input
        type="file"
        multiple={false}
        ref={fileInputRef}
        accept={accept}
        onChange={handleFileChange}
        className={
          !previewImageUrl && !selectedFile
            ? 'opacity-0 absolute inset-0 cursor-pointer w-full h-full'
            : 'hidden'
        }
      />
      <p className="text-xs scale-90 text-muted-foreground mt-2">
        <span className="font-bold">
          {aspectType === 'square'
            ? t('recommendedSquare')
            : aspectType === 'landscape'
              ? t('recommendedLandscape')
              : t('recommendedPortrait')}
        </span>
      </p>
    </div>
  )
}
