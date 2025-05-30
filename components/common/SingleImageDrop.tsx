'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { FileImage } from 'lucide-react'
import { toast } from 'sonner'
import Image from 'next/image'
import { AspectType } from '@/convex/types'

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
  maxSizeMB = 6,
  previewWidth = 1512,
  previewHeight = 1512,
  className = '',
  placeholderText = '画像をドラッグするか、クリックして選択',
  accept = 'image/*',
  aspectType = 'square',
}: SingleImageDropProps) {
  // 選択されたファイルとプレビューURLの状態管理
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  // ファイルの処理
  const processFile = (file: File) => {
    const maxSize = maxSizeMB * 1024 * 1024
    if (!file.type.startsWith('image/')) {
      toast.error(`ファイル「${file.name}」は画像ファイルではありません。`)
      return
    }
    if (file.size > maxSize) {
      toast.error(
        `ファイル「${file.name}」のサイズが大きすぎます。${maxSizeMB}MB以下にしてください。`
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
        {isDragging ? 'ここにファイルをドロップ' : placeholderText}
      </p>
      <p className="text-xs text-muted-foreground">JPG, PNG など / 最大 {maxSizeMB}MB</p>
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
            className={`mx-auto object-cover h-auto w-full rounded-md overflow-hidden ${aspectType === 'square' ? 'aspect-[1/1]' : aspectType === 'landscape' ? 'aspect-[16/9]' : 'aspect-49/6]'}`}
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
              画像を変更
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="mt-2"
              onClick={clearImage}
            >
              画像を削除
            </Button>
          </div>
          {selectedFile && (
            <div className="flex items-center justify-start w-full gap-4 text-xs text-muted-foreground mt-2 text-start">
              <p>
                <span className="font-bold">ファイル名:</span> {selectedFile.name.slice(0, 10)}...
              </p>
              <p>
                <span className="font-bold">サイズ:</span> {(selectedFile.size / 1024).toFixed(1)}{' '}
                KB
              </p>
            </div>
          )}
        </div>
      ) : (
        <>
          {renderDragAreaPlaceholder()}
          <div className="mt-4">
            <Button type="button" onClick={() => fileInputRef.current?.click()} className="w-full">
              ファイルを選択
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
          推奨のアスペクト比は
          {aspectType === 'square' ? '1:1' : aspectType === 'landscape' ? '16:9' : '4:6'}です。
        </span>
      </p>
    </div>
  )
}
