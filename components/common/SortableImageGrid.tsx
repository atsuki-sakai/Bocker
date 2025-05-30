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

export interface SortableImageGridProps {
  images: ImageType[]
  onChange: (images: ImageType[]) => void
}

// 子コンポーネント化（useSortableをここで呼ぶ）
function SortableImageItem({
  image,
  index,
  onRemove,
}: {
  image: ImageType
  index: number
  onRemove: (index: number) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: image.original_url,
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
      className={`relative aspect-square w-full h-full border bg-muted rounded-lg overflow-hidden shadow group transition-all ${
        isDragging
          ? 'border-primary ring-2 ring-primary/60'
          : 'hover:shadow-lg hover:border-primary/50'
      }`}
    >
      <Image src={image.original_url} alt="menu image" fill sizes="96px" className="object-cover" />
      <Button
        size="icon"
        variant="destructive"
        className="absolute top-1.5 right-1.5 z-10  p-1 rounded-full shadow"
        onClick={(e) => {
          e.stopPropagation()
          onRemove(index)
        }}
      >
        <X size={15} />
      </Button>
    </div>
  )
}

export default function SortableImageGrid({ images, onChange }: SortableImageGridProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = images.findIndex((img) => img.original_url === active.id)
    const newIndex = images.findIndex((img) => img.original_url === over.id)
    onChange(arrayMove(images, oldIndex, newIndex))
  }

  const handleRemove = (index: number) => {
    onChange(images.filter((_, i) => i !== index))
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={images.map((img) => img.original_url)}>
        <div className="grid grid-cols-2 gap-4 md:gap-6 items-center justify-start w-full mb-4">
          {images.length === 0 ? (
            <div className="text-sm text-muted-foreground mx-auto">画像がありません</div>
          ) : (
            images.map((image, idx) => (
              <SortableImageItem
                key={image.original_url}
                image={image}
                index={idx}
                onRemove={handleRemove}
              />
            ))
          )}
        </div>
      </SortableContext>
    </DndContext>
  )
}
