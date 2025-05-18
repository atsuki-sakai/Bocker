'use client'

import { useState, useRef, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { FileImage, X } from 'lucide-react'
import { toast } from 'sonner'
import Image from 'next/image'
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  arrayMove,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

/**
 * 変更点概要
 * ------------------------------------------------------------
 * 1. isDirty ステートを追加し、ユーザーが一度でも画像を追加・並べ替えした後は
 *    `initialImageUrls` の変化でプレビューがリセットされないようにした。
 * 2. processFiles / handleDragEnd / clearPreview で `setIsDirty(true)` を呼び出し、
 *    ユーザー操作をトリガーとしてマーク。
 * 3. useEffect の依存関係と条件を更新し、`isDirty` が true の場合は初期化をスキップ。
 * 4. 型安全性のためにユーティリティ関数 filterNonNull を追加。
 * ------------------------------------------------------------
 */

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
  initialImageUrls?: string[]
  multiple?: boolean
  maxFiles?: number
}

// null 除去のヘルパ
const filterNonNull = <T,>(arr: (T | null)[]): T[] => arr.filter(Boolean) as T[]

export default function ImageDrop({
  onFileSelect,
  onPreviewChange,
  maxSizeMB = 5,
  previewWidth = 2016,
  previewHeight = 1512,
  className = '',
  placeholderText = '画像をドラッグするか、クリックして選択',
  accept = 'image/*',
  initialImageUrls,
  multiple = false,
  maxFiles = 4,
}: ImageDropProps) {
  /* ------------------------------------------------------------------
   * state 管理
   * ------------------------------------------------------------------*/
  const [isDragging, setIsDragging] = useState(false)
  const [previewImageUrls, setPreviewImageUrls] = useState<string[]>(() => {
    if (multiple) return initialImageUrls || []
    return initialImageUrls ? [initialImageUrls[0]] : []
  })
  const [selectedFiles, setSelectedFiles] = useState<(File | null)[]>(() =>
    multiple && initialImageUrls ? Array(initialImageUrls.length).fill(null) : []
  )
  // ユーザーが操作したら true
  const [isDirty, setIsDirty] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  /* ------------------------------------------------------------------
   * dnd-kit sensors
   * ------------------------------------------------------------------*/
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  /* ------------------------------------------------------------------
   * 並べ替え完了時の処理
   * ------------------------------------------------------------------*/
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = previewImageUrls.indexOf(active.id as string)
    const newIndex = previewImageUrls.indexOf(over.id as string)

    // existingFiles が足りない時は null でパディング
    const padded =
      selectedFiles.length < previewImageUrls.length
        ? [...selectedFiles, ...Array(previewImageUrls.length - selectedFiles.length).fill(null)]
        : selectedFiles

    const newUrls = arrayMove(previewImageUrls, oldIndex, newIndex)
    const newFiles = arrayMove(padded, oldIndex, newIndex)

    setPreviewImageUrls(newUrls)
    setSelectedFiles(newFiles)
    setIsDirty(true)

    onPreviewChange?.(newUrls)
    onFileSelect?.(filterNonNull(newFiles))
  }

  /* ------------------------------------------------------------------
   * initialImageUrls が変わった時
   * - ユーザーがまだ操作していない場合のみプレビューを同期
   * ------------------------------------------------------------------*/
  useEffect(() => {
    if (isDirty) return // 一度でも操作したら reset しない

    if (multiple) {
      setPreviewImageUrls(initialImageUrls || [])
      setSelectedFiles(initialImageUrls ? Array(initialImageUrls.length).fill(null) : [])
    } else {
      setPreviewImageUrls(initialImageUrls ? [initialImageUrls[0]] : [])
    }
  }, [initialImageUrls, multiple, isDirty])

  /* ------------------------------------------------------------------
   * ファイル選択/ドロップ時の共通処理
   * ------------------------------------------------------------------*/
  const processFiles = async (files: File[]) => {
    const maxSize = maxSizeMB * 1024 * 1024
    const acceptedFiles: File[] = []
    const acceptedUrls: string[] = []

    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        toast.error(`ファイル「${file.name}」は画像ファイルではありません。`)
        continue
      }
      if (file.size > maxSize) {
        toast.error(
          `ファイル「${file.name}」のサイズが大きすぎます。${maxSizeMB}MB以下にしてください。`
        )
        continue
      }
      acceptedFiles.push(file)
      acceptedUrls.push(URL.createObjectURL(file))
    }

    if (acceptedFiles.length === 0) {
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      return
    }

    setIsDirty(true)

    if (multiple) {
      const currentCount = previewImageUrls.length
      const available = maxFiles - currentCount
      if (acceptedFiles.length > available) {
        toast.error(`最大 ${maxFiles} 枚までです。追加できるのはあと ${available} 枚です。`)
      }

      const filesToAdd = acceptedFiles.slice(0, available)
      const urlsToAdd = acceptedUrls.slice(0, available)

      const newFiles = [...selectedFiles, ...filesToAdd]
      const newUrls = [...previewImageUrls, ...urlsToAdd]

      setSelectedFiles(newFiles)
      setPreviewImageUrls(newUrls)

      onFileSelect?.(filterNonNull(newFiles))
      onPreviewChange?.(newUrls)
    } else {
      setSelectedFiles(acceptedFiles)
      setPreviewImageUrls(acceptedUrls)

      onFileSelect?.(acceptedFiles)
      onPreviewChange?.(acceptedUrls)
    }
  }

  /* ------------------------------------------------------------------
   * Input change / Drag & Drop handlers
   * ------------------------------------------------------------------*/
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files)
      multiple ? processFiles(newFiles) : processFiles([newFiles[0]])
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const dropped = Array.from(e.dataTransfer.files)
      !multiple && dropped.length > 1 ? processFiles([dropped[0]]) : processFiles(dropped)

      if (fileInputRef.current) {
        const dt = new DataTransfer()
        const filesToAdd = multiple ? dropped : [dropped[0]]
        filesToAdd.forEach((f) => dt.items.add(f))
        fileInputRef.current.files = dt.files
      }
    }
  }

  /* ------------------------------------------------------------------
   * プレビュー削除
   * ------------------------------------------------------------------*/
  const clearPreview = (index?: number) => {
    let files = [...selectedFiles]
    let urls = [...previewImageUrls]

    if (multiple && typeof index === 'number') {
      const removedUrl = urls.splice(index, 1)[0]
      files.splice(index, 1)
      if (removedUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(removedUrl)
      }
    } else if (!multiple) {
      if (urls[0]?.startsWith('blob:')) {
        URL.revokeObjectURL(urls[0])
      }
      files = []
      urls = initialImageUrls ? [initialImageUrls[0]] : []
    }

    setSelectedFiles(files)
    setPreviewImageUrls(urls)
    setIsDirty(true)

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    onFileSelect?.(filterNonNull(files))
    onPreviewChange?.(urls)
  }

  /* ------------------------------------------------------------------
   * 並べ替え用サムネイル
   * ------------------------------------------------------------------*/
  const SortableThumb = ({ id, index }: { id: string; index: number }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging: isItemDragging,
    } = useSortable({ id })
    const style: React.CSSProperties = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isItemDragging ? 0.5 : 1,
      touchAction: 'none',
    }

    return (
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className="relative group aspect-square cursor-grab"
      >
        <Image
          src={id}
          alt={`Preview ${index + 1}`}
          unoptimized
          loader={({ src }) => src}
          className="object-cover w-full h-full rounded-md pointer-events-none"
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
            {selectedFiles[index]?.name}
          </div>
        )}
      </div>
    )
  }

  /* ------------------------------------------------------------------
   * UI
   * ------------------------------------------------------------------*/
  const renderDragAreaPlaceholder = () => (
    <div className="flex flex-col items-center justify-center h-full">
      <FileImage
        className={`h-12 w-12 mx-auto mb-2 ${isDragging ? 'text-active' : 'text-muted-foreground'}`}
      />
      <p className={`text-sm mb-2 ${isDragging ? 'text-active' : 'text-muted-foreground'}`}>
        {isDragging ? 'ここにファイルをドロップ' : placeholderText}
      </p>
      <p className="text-xs text-muted-foreground">
        JPG, PNG など / 最大 {maxSizeMB}MB {multiple ? `(最大${maxFiles}枚)` : ''}
      </p>
    </div>
  )

  const displayImageUrl = !multiple && previewImageUrls.length > 0 ? previewImageUrls[0] : null

  return (
    <div
      className={`relative border border-dashed rounded-lg p-4 bg-background text-center overflow-hidden border-border h-fit hover:bg-muted ${className}`}
      onDrop={handleDrop}
      onDragOver={(e) => {
        e.preventDefault()
        setIsDragging(true)
      }}
      onDragLeave={() => setIsDragging(false)}
    >
      {multiple ? (
        <div className="flex flex-col h-full">
          {previewImageUrls.length > 0 ? (
            <>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext items={previewImageUrls} strategy={horizontalListSortingStrategy}>
                  <div className="grid grid-cols-2 grid-flow-row-dense gap-2 p-2">
                    {previewImageUrls.map((url, idx) => (
                      <SortableThumb key={url} id={url} index={idx} />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
              <div className="mt-auto pt-2 text-center space-x-2">
                <Button type="button" onClick={() => fileInputRef.current?.click()}>
                  ファイルを追加
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
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute top-0 right-0 rounded-full bg-gradient-to-r from-green-800 to-green-600 text-white shadow-md"
            onClick={() => clearPreview()}
          >
            <X className="h-4 w-4" />
          </Button>
          {selectedFiles[0] && (
            <div className="flex items-center justify-start w-full gap-4 text-xs text-muted-foreground mt-2 text-start">
              <p>
                <span className="font-bold">ファイル名:</span> {selectedFiles[0].name}
              </p>
              <p>
                <span className="font-bold">サイズ:</span>{' '}
                {(selectedFiles[0].size / 1024).toFixed(1)} KB
              </p>
            </div>
          )}
        </div>
      ) : (
        renderDragAreaPlaceholder()
      )}

      {/* hidden input */}
      <Input
        type="file"
        multiple={multiple}
        ref={fileInputRef}
        accept={accept}
        onChange={handleFileChange}
        className={
          (!multiple && !displayImageUrl && selectedFiles.length === 0) ||
          (multiple && previewImageUrls.length === 0)
            ? 'opacity-0 absolute inset-0 cursor-pointer w-full h-full'
            : 'hidden'
        }
      />
    </div>
  )
}
