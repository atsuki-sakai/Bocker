'use client'

import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import { arrayMove, SortableContext, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'
import type { ImageType } from '@/convex/types'
import { useTranslations } from 'next-intl'

export interface SortableImageGridProps {
  images: ImageType[]
  onChange: (images: ImageType[]) => void
  isThumbnail?: boolean
}

// 子コンポーネント化（useSortableをここで呼ぶ）
function SortableImageItem({
  image,
  index,
  onRemove,
  isThumbnail = false,
}: {
  image: ImageType
  index: number
  onRemove: (index: number) => void
  isThumbnail?: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: isThumbnail ? image.thumbnail_url : image.original_url,
  })
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 20 : undefined,
    touchAction: 'none',
  }
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`relative aspect-[2/3] w-full h-full border bg-muted  group transition-all ${
        isDragging
          ? 'border-primary ring-2 ring-primary/60'
          : 'hover:shadow-lg hover:border-primary/50'
      }`}
    >
      <Image
        src={isThumbnail ? image.thumbnail_url : image.original_url}
        alt="menu image"
        fill
        sizes="96px"
        className="object-cover overflow-hidden rounded-lg shadow-sm"
      />
      <Button
        size="icon"
        variant="destructive"
        className={`absolute z-10  p-1 rounded-full shadow ${
          isThumbnail ? '-top-1 -right-1 w-6 h-6' : 'top-1.5 right-1.5 w-8 h-8'
        }`}
        onClick={(e) => {
          e.stopPropagation()
          onRemove(index)
        }}
      >
        <X size={isThumbnail ? 12 : 15} />
      </Button>
    </div>
  )
}

export default function SortableImageGrid({
  images,
  onChange,
  isThumbnail = false,
}: SortableImageGridProps) {
  const t = useTranslations('common.imageDrop')
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = images.findIndex(
      (img) => (isThumbnail ? img.thumbnail_url : img.original_url) === active.id
    )
    const newIndex = images.findIndex(
      (img) => (isThumbnail ? img.thumbnail_url : img.original_url) === over.id
    )
    onChange(arrayMove(images, oldIndex, newIndex))
  }

  const handleRemove = (index: number) => {
    onChange(images.filter((_, i) => i !== index))
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext
        items={images.map((img) => (isThumbnail ? img.thumbnail_url : img.original_url))}
      >
        <div
          className={`grid grid-cols-${isThumbnail ? '4' : '2'} gap-4 md:gap-6 items-center justify-start w-full mb-4`}
        >
          {images.length === 0 ? (
            <div className="text-sm text-muted-foreground mx-auto">{t('noImages')}</div>
          ) : (
            images.map((image, idx) => (
              <SortableImageItem
                key={isThumbnail ? image.thumbnail_url : image.original_url}
                image={image}
                index={idx}
                onRemove={handleRemove}
                isThumbnail={isThumbnail}
              />
            ))
          )}
        </div>
      </SortableContext>
    </DndContext>
  )
}
