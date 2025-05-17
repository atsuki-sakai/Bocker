'use client';

import { useState, useRef, useEffect, TouchEvent, DragEvent } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { FileImage, X } from 'lucide-react'
import { toast } from 'sonner'
import Image from 'next/image'

// コンポーネントのプロップス型定義
interface ImageDropProps {
  onFileSelect?: (files: File[]) => void
  onPreviewChange?: (previewUrls: string[]) => void
  onUploadComplete?: (filePath: string) => void
  maxSizeMB?: number
  previewWidth?: number
  previewHeight?: number
  className?: string
  placeholderText?: string
  accept?: string
  initialImageUrl?: string
  initialImageUrls?: string[]
  multiple?: boolean
  maxFiles?: number
}

export default function ImageDrop({
  onFileSelect,
  onPreviewChange,
  maxSizeMB = 4,
  previewWidth = 2016,
  previewHeight = 1512,
  className = '',
  placeholderText = '画像をドラッグするか、クリックして選択',
  accept = 'image/*',
  initialImageUrl,
  initialImageUrls,
  multiple = false,
  maxFiles = 4,
}: ImageDropProps) {
  // 内部状態の管理
  const [isDragging, setIsDragging] = useState(false)
  const [previewImageUrls, setPreviewImageUrls] = useState<string[]>(() => {
    if (multiple) {
      return initialImageUrls || []
    }
    return initialImageUrl ? [initialImageUrl] : []
  })
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const draggedItemIndexRef = useRef<number | null>(null)
  const dragOverItemIndexRef = useRef<number | null>(null)
  const [touchDraggingIndex, setTouchDraggingIndex] = useState<number | null>(null)
  const touchDraggedItemRef = useRef<{ file: File; url: string } | null>(null)

  useEffect(() => {
    if (selectedFiles.length === 0) {
      if (multiple) {
        setPreviewImageUrls(initialImageUrls || [])
      } else {
        setPreviewImageUrls(initialImageUrl ? [initialImageUrl] : [])
      }
    }
  }, [initialImageUrl, initialImageUrls, multiple, selectedFiles.length])

  // 実際に使用するプレビュー画像（外部から渡されるか内部で管理されるか）
  const displayImageUrl =
    !multiple && previewImageUrls.length > 0
      ? previewImageUrls[0]
      : !multiple && initialImageUrl
        ? initialImageUrl
        : null

  // ファイル変更時の処理
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files)
      if (multiple) {
        processFiles(newFiles)
      } else if (newFiles[0]) {
        processFiles([newFiles[0]])
      }
    }
  }

  // ファイルの処理を統一する関数 (複数ファイル対応)
  const processFiles = async (files: File[]) => {
    const maxSize = maxSizeMB * 1024 * 1024
    const newProcessedFiles: File[] = []
    const newPreviewUrls: string[] = []

    for (const file of files) {
      // ファイルタイプチェック
      if (!file.type.startsWith('image/')) {
        toast.error(`ファイル「${file.name}」は画像ファイルではありません。`)
        continue
      }

      // サイズチェック
      if (file.size > maxSize) {
        toast.error(
          `ファイル「${file.name}」のサイズが大きすぎます。${maxSizeMB}MB以下の画像をアップロードしてください。`
        )
        continue
      }
      newProcessedFiles.push(file)
      newPreviewUrls.push(URL.createObjectURL(file))
    }

    if (newProcessedFiles.length === 0) {
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      return
    }

    if (multiple) {
      const currentTotalImageCount = previewImageUrls.length
      const availableSlots = maxFiles - currentTotalImageCount

      let filesToAdd = newProcessedFiles
      let urlsToAdd = newPreviewUrls

      if (newProcessedFiles.length > availableSlots) {
        toast.error(
          `ファイルの最大数 (${maxFiles}個) を超えています。超過したファイルは追加されません。${
            availableSlots > 0
              ? `あと ${availableSlots} 個追加できます。`
              : '既に上限に達しています。'
          }`
        )
        filesToAdd = newProcessedFiles.slice(0, availableSlots)
        urlsToAdd = newPreviewUrls.slice(0, availableSlots)
      }

      if (filesToAdd.length === 0) {
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
        if (
          selectedFiles.length === 0 &&
          initialImageUrls &&
          initialImageUrls.length > 0 &&
          onFileSelect
        ) {
          onFileSelect([])
        }
        if (
          selectedFiles.length === 0 &&
          initialImageUrls &&
          initialImageUrls.length > 0 &&
          onPreviewChange
        ) {
          onPreviewChange(previewImageUrls)
        }
        return
      }

      const updatedFiles = [...selectedFiles, ...filesToAdd]
      const updatedUrls = [...previewImageUrls, ...urlsToAdd]
      setSelectedFiles(updatedFiles)
      setPreviewImageUrls(updatedUrls)

      if (onFileSelect) {
        onFileSelect(updatedFiles)
      }
      if (onPreviewChange) {
        onPreviewChange(updatedUrls)
      }
    } else {
      setSelectedFiles(newProcessedFiles)
      setPreviewImageUrls(newPreviewUrls)

      if (onFileSelect) {
        onFileSelect(newProcessedFiles)
      }
      if (onPreviewChange) {
        onPreviewChange(newPreviewUrls)
      }
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files)
      if (!multiple && droppedFiles.length > 1) {
        toast.info('複数選択が許可されていません。最初のファイルのみ処理します。')
        processFiles([droppedFiles[0]])
        if (fileInputRef.current) {
          const dataTransfer = new DataTransfer()
          dataTransfer.items.add(droppedFiles[0])
          fileInputRef.current.files = dataTransfer.files
        }
      } else {
        processFiles(droppedFiles)
        if (fileInputRef.current) {
          const dataTransfer = new DataTransfer()
          droppedFiles.forEach((file) => dataTransfer.items.add(file))
          fileInputRef.current.files = dataTransfer.files
        }
      }
    }
  }

  // ドラッグ＆ドロップ並び替えハンドラ (HTML5 D&D)
  const handleDragStart = (_e: DragEvent<HTMLDivElement>, index: number) => {
    draggedItemIndexRef.current = index
  }

  const handleDragEnter = (_e: DragEvent<HTMLDivElement>, index: number) => {
    dragOverItemIndexRef.current = index
  }

  const handleDragLeave = (_e: DragEvent<HTMLDivElement>) => {
    console.log('handleDragLeave', _e)
    // dragOverItemIndexRef.current = null; // Optional: reset if leaving a specific item vs the container
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault() // Necessary to allow dropping
  }

  const handleDropSort = (_e: DragEvent<HTMLDivElement>) => {
    console.log('handleDropSort', _e)
    if (
      draggedItemIndexRef.current === null ||
      dragOverItemIndexRef.current === null ||
      draggedItemIndexRef.current === dragOverItemIndexRef.current
    ) {
      draggedItemIndexRef.current = null
      dragOverItemIndexRef.current = null
      return
    }

    const draggedIndex = draggedItemIndexRef.current
    const overIndex = dragOverItemIndexRef.current

    const newFiles = [...selectedFiles]
    const newUrls = [...previewImageUrls]

    const draggedFile = newFiles.splice(draggedIndex, 1)[0]
    const draggedUrl = newUrls.splice(draggedIndex, 1)[0]

    newFiles.splice(overIndex, 0, draggedFile)
    newUrls.splice(overIndex, 0, draggedUrl)

    setSelectedFiles(newFiles)
    setPreviewImageUrls(newUrls)

    if (onFileSelect) {
      onFileSelect(newFiles)
    }
    if (onPreviewChange) {
      onPreviewChange(newUrls)
    }

    draggedItemIndexRef.current = null
    dragOverItemIndexRef.current = null
  }

  const handleDragEnd = () => {
    draggedItemIndexRef.current = null
    dragOverItemIndexRef.current = null
  }

  // タッチイベントによる並び替えハンドラ
  const handleTouchStart = (e: TouchEvent<HTMLDivElement>, index: number) => {
    setTouchDraggingIndex(index)
    touchDraggedItemRef.current = {
      file: selectedFiles[index],
      url: previewImageUrls[index],
    }
    // Prevent default scroll behavior when dragging an item
    if (e.currentTarget.style) {
      e.currentTarget.style.touchAction = 'none'
    }
  }

  const handleTouchMove = (e: TouchEvent<HTMLDivElement>) => {
    if (touchDraggingIndex === null || !touchDraggedItemRef.current) return
    // e.preventDefault(); // Prevent scrolling while dragging

    const touch = e.touches[0]
    const targetElement = document.elementFromPoint(touch.clientX, touch.clientY)

    if (targetElement) {
      const targetIndexAttr = targetElement.closest('[data-index]')?.getAttribute('data-index')
      if (targetIndexAttr) {
        const targetIndex = parseInt(targetIndexAttr, 10)
        if (targetIndex !== touchDraggingIndex && targetIndex < selectedFiles.length) {
          const newFiles = [...selectedFiles]
          const newUrls = [...previewImageUrls]

          // Remove the dragged item
          newFiles.splice(touchDraggingIndex, 1)
          newUrls.splice(touchDraggingIndex, 1)

          // Insert it at the new position
          newFiles.splice(targetIndex, 0, touchDraggedItemRef.current.file)
          newUrls.splice(targetIndex, 0, touchDraggedItemRef.current.url)

          setSelectedFiles(newFiles)
          setPreviewImageUrls(newUrls)
          setTouchDraggingIndex(targetIndex) // Update the dragging index to the new position

          if (onFileSelect) {
            onFileSelect(newFiles)
          }
          if (onPreviewChange) {
            onPreviewChange(newUrls)
          }
        }
      }
    }
  }

  const handleTouchEnd = (e: TouchEvent<HTMLDivElement>) => {
    if (e.currentTarget.style) {
      e.currentTarget.style.touchAction = 'auto'
    }
    setTouchDraggingIndex(null)
    touchDraggedItemRef.current = null
  }

  // プレビューをクリアする関数
  const clearPreview = (index?: number) => {
    let updatedFiles: File[] = [...selectedFiles] // 現在の選択ファイルで初期化
    let updatedPreviewUrls: string[] = [...previewImageUrls] // 現在のプレビューURLで初期化

    if (multiple && typeof index === 'number') {
      // 特定のインデックスのファイルを削除

      const removedUrl = updatedPreviewUrls.splice(index, 1)[0] // previewImageUrls から削除

      if (removedUrl) {
        // 実際に revoke するのは createObjectURL で作られたものだけ
        // blob URLかどうかを判定し、そうであればrevokeする
        if (removedUrl.startsWith('blob:')) {
          URL.revokeObjectURL(removedUrl)
        }
      }

      setSelectedFiles(updatedFiles)
      setPreviewImageUrls(updatedPreviewUrls)

      if (onFileSelect) {
        onFileSelect(updatedFiles) // ★ 更新されたファイルリストを通知
      }
      if (onPreviewChange) {
        onPreviewChange(updatedPreviewUrls)
      }
    } else if (multiple) {
      // すべてクリア（multiple時）
      updatedPreviewUrls.forEach((url) => {
        if (url.startsWith('blob:')) URL.revokeObjectURL(url)
      })
      updatedFiles = []
      updatedPreviewUrls = []

      setSelectedFiles(updatedFiles)
      setPreviewImageUrls(updatedPreviewUrls)

      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      if (onFileSelect) {
        onFileSelect(updatedFiles) // ★ 更新されたファイルリストを通知
      }
      if (onPreviewChange) {
        onPreviewChange(updatedPreviewUrls)
      }
    } else {
      // 単一ファイルモードの場合
      if (updatedPreviewUrls[0] && updatedPreviewUrls[0].startsWith('blob:')) {
        URL.revokeObjectURL(updatedPreviewUrls[0])
      }

      updatedFiles = []
      // initialImageUrl があればそれを表示、なければ空にする
      updatedPreviewUrls = initialImageUrl ? [initialImageUrl] : []

      setSelectedFiles(updatedFiles)
      setPreviewImageUrls(updatedPreviewUrls)

      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      if (onFileSelect) {
        onFileSelect(updatedFiles) // ★ 更新されたファイルリストを通知
      }
      if (onPreviewChange) {
        onPreviewChange(updatedPreviewUrls)
      }
    }
  }

  // ドラッグエリアのUIを返すヘルパー関数
  const renderDragAreaPlaceholder = () => (
    <div className="flex flex-col items-center justify-center h-full">
      <FileImage
        className={`h-12 w-12 mx-auto mb-2 transition-colors ${
          isDragging ? 'text-active' : 'text-muted-foreground'
        }`}
      />
      <p
        className={`text-sm mb-2 transition-colors ${
          isDragging ? 'text-active' : 'text-muted-foreground'
        }`}
      >
        {isDragging ? 'ここにファイルをドロップ' : placeholderText}
      </p>
      <p className="text-xs text-muted-foreground">
        JPG、PNG / 最大{maxSizeMB}MB {multiple ? `(最大${maxFiles}ファイル)` : ''}
      </p>
    </div>
  )

  return (
    <div
      className={`relative border border-dashed h-full rounded-lg p-4 transition-colors bg-background text-center overflow-hidden border-border hover:bg-muted ${className}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {multiple ? (
        <div className="h-full flex flex-col">
          {previewImageUrls.length > 0 ? (
            <>
              <div className="grid grid-cols-2 gap-4 p-2 overflow-y-auto flex-grow">
                {previewImageUrls.map((url, index) => (
                  <div
                    key={`${url}-${index}`} // Ensure key is unique and stable if possible
                    data-index={index}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragEnter={(e) => handleDragEnter(e, index)}
                    onDragLeave={handleDragLeave}
                    onDragOver={handleDragOver}
                    onDrop={handleDropSort}
                    onDragEnd={handleDragEnd}
                    onTouchStart={(e) => handleTouchStart(e, index)}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    className={`relative group aspect-square cursor-grab ${
                      draggedItemIndexRef.current === index ? 'opacity-50' : ''
                    } ${
                      dragOverItemIndexRef.current === index &&
                      draggedItemIndexRef.current !== index
                        ? 'outline outline-2 outline-offset-2 outline-primary'
                        : ''
                    } ${touchDraggingIndex === index ? 'opacity-50 ring-2 ring-primary z-20' : ''}`}
                    style={{ touchAction: touchDraggingIndex === index ? 'none' : 'auto' }}
                  >
                    <Image
                      src={url}
                      alt={`Preview ${index + 1}`}
                      unoptimized
                      loader={({ src }) => src}
                      className="object-cover w-full h-full rounded-md pointer-events-none" // pointer-events-none for easier parent drag
                      width={150}
                      height={150}
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-1 right-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 z-10"
                      onClick={() => clearPreview(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                    {selectedFiles[index] && (
                      <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 truncate pointer-events-none">
                        {selectedFiles[index].name}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-auto pt-2 text-center space-x-2">
                <Button type="button" onClick={() => fileInputRef.current?.click()}>
                  ファイルを追加
                </Button>
                <Button type="button" variant="outline" onClick={() => clearPreview()}>
                  すべてクリア
                </Button>
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center">
              {renderDragAreaPlaceholder()}
              <div className="mt-4">
                <Button type="button" onClick={() => fileInputRef.current?.click()}>
                  ファイルを選択
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : displayImageUrl ? (
        <div className="relative flex flex-col items-center justify-center w-full h-full">
          <Image
            src={displayImageUrl}
            alt="Preview"
            unoptimized
            loader={({ src }) => src}
            className="mx-auto object-cover h-full rounded-md overflow-hidden"
            width={previewWidth}
            height={previewHeight}
          />
          {initialImageUrl &&
          previewImageUrls.length > 0 &&
          previewImageUrls[0] === initialImageUrl &&
          !selectedFiles[0] ? (
            <Button
              type="button"
              size="sm"
              className="absolute -top-3 -right-3 m-2 border-2 shadow-sm hover:opacity-100 hover:bg-accent"
              onClick={() => fileInputRef.current?.click()}
            >
              画像を変更
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute top-0 right-0 rounded-full bg-gradient-to-r from-green-800 to-green-600 text-white shadow-md"
              onClick={() => clearPreview()}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
          {selectedFiles[0] && (
            <div className="flex items-center justify-start  w-full gap-4 text-xs text-muted-foreground mt-2 text-start">
              <p>
                <span className="font-bold">ファイル名: </span> {selectedFiles[0].name}
              </p>
              <p>
                <span className="font-bold">サイズ: </span>{' '}
                {(selectedFiles[0].size / 1024).toFixed(1)} KB
              </p>
            </div>
          )}
        </div>
      ) : (
        renderDragAreaPlaceholder()
      )}
      <Input
        type="file"
        multiple={multiple}
        ref={fileInputRef}
        accept={accept}
        onChange={handleFileChange}
        className={`${
          (!multiple &&
            !displayImageUrl &&
            selectedFiles.length === 0 &&
            !(initialImageUrl && previewImageUrls[0] === initialImageUrl)) ||
          (multiple && previewImageUrls.length === 0)
            ? 'opacity-0 absolute inset-0 cursor-pointer w-full h-full'
            : 'hidden'
        }`}
      />
    </div>
  )
}
