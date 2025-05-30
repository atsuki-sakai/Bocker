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
  TouchSensor,
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
interface MultiImageDropProps {
  currentFiles?: File[] // 現在選択されているファイル
  onFilesSelect?: (files: File[]) => void // ファイル選択時のコールバック
  onUploadComplete?: (filePath: string) => void // アップロード完了時のコールバック
  maxSizeMB?: number // 最大サイズ(MB)
  previewWidth?: number // プレビュー幅
  previewHeight?: number // プレビュー高さ
  className?: string // クラス名
  placeholderText?: string // プレースホルダーテキスト
  accept?: string // 受け入れるファイルタイプ
  limitFiles?: number // 最大選択可能枚数
  hasSelected?: number // 指定した数値の数だけファイルを選択済みとする
}

// null 除去のヘルパ
const filterNonNull = <T,>(arr: (T | null)[]): T[] => arr.filter(Boolean) as T[]

export default function MultiImageDrop({
  currentFiles,
  onFilesSelect,
  maxSizeMB = 6,
  className = '',
  placeholderText = '画像をドラッグするか、クリックして選択',
  accept = 'image/*',
  limitFiles = 4,
  hasSelected = 0,
}: MultiImageDropProps) {
  /* ------------------------------------------------------------------
   * state 管理
   * ------------------------------------------------------------------*/
  const [isDragging, setIsDragging] = useState(false)
  const [previewImageUrls, setPreviewImageUrls] = useState<string[]>([])
  const [selectedFiles, setSelectedFiles] = useState<(File | null)[]>([])

  const fileInputRef = useRef<HTMLInputElement>(null)

  /* ------------------------------------------------------------------
   * dnd-kit sensors
   * ------------------------------------------------------------------*/
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
  )

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

    onFilesSelect?.(filterNonNull(newFiles))
  }

  /* ------------------------------------------------------------------
   * 画像を削除する処理
   * ------------------------------------------------------------------*/
  const handleRemoveImage = (index: number) => {
    const newUrls = previewImageUrls.filter((_, i) => i !== index)
    const newFiles = selectedFiles.filter((_, i) => i !== index)
    // blob url の場合は開放
    if (previewImageUrls[index]?.startsWith('blob:')) {
      URL.revokeObjectURL(previewImageUrls[index])
    }
    setPreviewImageUrls(newUrls)
    setSelectedFiles(newFiles)
    onFilesSelect?.(filterNonNull(newFiles))
  }

  /* ------------------------------------------------------------------
   * currentFiles が空になった時は状態をリセット
   * ------------------------------------------------------------------*/
  useEffect(() => {
    if (!currentFiles || currentFiles.length === 0) {
      setSelectedFiles([])
      setPreviewImageUrls([])
    }
  }, [currentFiles])

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

    const currentCount = previewImageUrls.length
    const available = limitFiles - (currentCount + hasSelected)
    if (acceptedFiles.length > available) {
      toast.error(
        `${limitFiles > 0 ? `最大 ${limitFiles} 枚までです。` : ''}追加できるのはあと ${available} 枚です。`
      )
    }

    const filesToAdd = acceptedFiles.slice(0, available)
    const urlsToAdd = acceptedUrls.slice(0, available)

    const newFiles = [...selectedFiles, ...filesToAdd]
    const newUrls = [...previewImageUrls, ...urlsToAdd]

    setSelectedFiles(newFiles)
    setPreviewImageUrls(newUrls)
    onFilesSelect?.(filterNonNull(newFiles))
  }

  /* ------------------------------------------------------------------
   * Input change / Drag & Drop handlers
   * ------------------------------------------------------------------*/
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files)
      processFiles(newFiles)
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const dropped = Array.from(e.dataTransfer.files)
      processFiles(dropped)

      if (fileInputRef.current) {
        const dt = new DataTransfer()
        dropped.forEach((f) => dt.items.add(f))
        fileInputRef.current.files = dt.files
      }
    }
  }

  /* ------------------------------------------------------------------
   * 並べ替え用サムネイル
   * ------------------------------------------------------------------*/
  const SortableThumb = ({
    id,
    index,
    handleRemoveImage,
  }: {
    id: string
    index: number
    handleRemoveImage: (index: number) => void
  }) => {
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
      touchAction: 'none', // 追加
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
          variant="ghost"
          size="icon"
          className="absolute top-1 right-1 z-10 bg-white/80 hover:bg-red-500/80 text-muted-foreground hover:text-white p-1 rounded-full shadow"
          onClick={(e) => {
            e.stopPropagation()
            handleRemoveImage(index)
          }}
        >
          <X size={16} />
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
        JPG, PNG など / 最大 {maxSizeMB}MB (最大{limitFiles}枚)
      </p>
    </div>
  )

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
      {previewImageUrls.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center">
          {renderDragAreaPlaceholder()}
          <div className="mt-4">
            <Button type="button" onClick={() => fileInputRef.current?.click()}>
              ファイルを選択
            </Button>
          </div>
        </div>
      ) : (
        <>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={previewImageUrls} strategy={horizontalListSortingStrategy}>
              <div className="grid grid-cols-2 grid-flow-row-dense gap-2 p-2">
                {previewImageUrls.map((url, idx) => (
                  <SortableThumb
                    key={url}
                    id={url}
                    index={idx}
                    handleRemoveImage={handleRemoveImage}
                  />
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
      )}

      <Input
        type="file"
        multiple={true}
        ref={fileInputRef}
        accept={accept}
        onChange={handleFileChange}
        className={
          previewImageUrls.length === 0
            ? 'opacity-0 absolute inset-0 cursor-pointer w-full h-full'
            : 'hidden'
        }
      />

      {previewImageUrls.length > 0 && (
        <div className="mt-2 text-center">
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => {
              previewImageUrls.forEach((url) => {
                if (url.startsWith('blob:')) {
                  URL.revokeObjectURL(url)
                }
              })
              setPreviewImageUrls([])
              setSelectedFiles([])
              if (fileInputRef.current) {
                fileInputRef.current.value = ''
              }
              onFilesSelect?.([])
            }}
          >
            すべての画像をクリア
          </Button>
        </div>
      )}
    </div>
  )
}
