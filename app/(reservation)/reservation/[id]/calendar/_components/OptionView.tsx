'use client'

import { useState } from 'react'
import { Doc, Id } from '@/convex/_generated/dataModel'
import { Button } from '@/components/ui/button'
import { api } from '@/convex/_generated/api'
import { useQuery } from 'convex/react'
import { useParams } from 'next/navigation'
import { Loading } from '@/components/common'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
type OptionViewProps = {
  selectedOptions: Doc<'salon_option'>[]
  onChangeOptionsAction: (options: Doc<'salon_option'>[]) => void
}

export const OptionView = ({ selectedOptions, onChangeOptionsAction }: OptionViewProps) => {
  const params = useParams()
  const [showOptionDetail, setShowOptionDetail] = useState(false)
  const [selectedOption, setSelectedOption] = useState<Doc<'salon_option'> | null>(null)
  const salonId = params.id as Id<'salon'>
  const options = useQuery(api.option.query.findAll, {
    salonId: salonId,
  })

  const toggleOption = (option: Doc<'salon_option'>) => {
    const isSelected = selectedOptions.some((o) => o._id === option._id)
    if (isSelected) {
      onChangeOptionsAction(selectedOptions.filter((o) => o._id !== option._id))
    } else {
      onChangeOptionsAction([...selectedOptions, option])
    }
  }

  const handleShowOptionDetail = (option: Doc<'salon_option'>) => {
    setSelectedOption(option)
    setShowOptionDetail(true)
  }

  if (!options) return <Loading />

  return (
    <div>
      <h2 className="text-base">オプションを選択</h2>
      <p className="text-muted-foreground mb-4 text-sm">
        追加オプションがあれば選択してください。複数選択可能です。
      </p>
      <div className="space-y-3">
        {options.map((option) => (
          <div
            key={option._id}
            className="flex items-center justify-between border rounded-lg p-4 w-full"
          >
            <div className="flex flex-col gap-1  w-2/3 mr-4 ">
              <p className="font-medium">{option.name}</p>
              <p className="">
                {option.salePrice && option.salePrice > 0 ? (
                  <>
                    <span className="line-through text-muted-foreground text-sm">
                      ￥{option.unitPrice?.toLocaleString()}
                    </span>
                    <span className="font-semibold text-active text-sm">
                      ￥{option.salePrice.toLocaleString()}
                    </span>
                  </>
                ) : (
                  <span className="text-sm font-semibold text-muted-foreground">
                    ￥{option.unitPrice?.toLocaleString()}
                  </span>
                )}
              </p>
              {option.description && option.description?.length > 50 && (
                <p className="text-sm text-muted-foreground break-words">
                  {option.description?.slice(0, 25).concat('...')}
                </p>
              )}
              {option.description && option.description?.length <= 50 && (
                <p className="text-sm text-muted-foreground break-words">{option.description}</p>
              )}
            </div>
            <div className="flex flex-col items-end w-1/3">
              <Button
                variant={selectedOptions.some((o) => o._id === option._id) ? 'default' : 'outline'}
                onClick={() => toggleOption(option)}
              >
                {selectedOptions.some((o) => o._id === option._id) ? '選択中' : '選択する'}
              </Button>
              <div className="flex items-center justify-end gap-1 mt-4">
                <button
                  className="text-xs p-0 m-0 flex items-center gap-1"
                  onClick={() => handleShowOptionDetail(option)}
                >
                  <span className="text-xs text-link-foreground underline">詳細を見る</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <Dialog open={showOptionDetail} onOpenChange={setShowOptionDetail}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedOption?.name}</DialogTitle>
            <p className="text-sm text-muted-foreground">
              {selectedOption?.salePrice && selectedOption?.salePrice > 0 ? (
                <>
                  <span className="line-through text-muted-foreground text-sm">
                    ￥{selectedOption?.unitPrice?.toLocaleString()}
                  </span>
                  <span className="font-semibold text-active text-sm">
                    ￥{selectedOption?.salePrice.toLocaleString()}
                  </span>
                </>
              ) : (
                <span className="text-sm font-semibold text-muted-foreground">
                  ￥{selectedOption?.unitPrice?.toLocaleString()}
                </span>
              )}
            </p>
          </DialogHeader>
          <DialogDescription>{selectedOption?.description}</DialogDescription>
          <DialogFooter>
            <div className="flex items-center justify-between w-full gap-2">
              <Button variant="outline" onClick={() => setShowOptionDetail(false)}>
                閉じる
              </Button>
              <Button
                onClick={() => {
                  if (selectedOption) {
                    const isAlreadySelected = selectedOptions.some(
                      (o) => o._id === selectedOption._id
                    )
                    if (!isAlreadySelected) {
                      onChangeOptionsAction([...selectedOptions, selectedOption])
                    }
                    setShowOptionDetail(false)
                  }
                }}
                disabled={selectedOptions.some((o) => o._id === selectedOption?._id)}
              >
                {selectedOptions.some((o) => o._id === selectedOption?._id)
                  ? '選択済み'
                  : '選択する'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}