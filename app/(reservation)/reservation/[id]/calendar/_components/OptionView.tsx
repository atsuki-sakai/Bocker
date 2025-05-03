'use client'

import { Doc, Id } from '@/convex/_generated/dataModel'
import { Button } from '@/components/ui/button'
import { api } from '@/convex/_generated/api'
import { useQuery } from 'convex/react'
import { useParams } from 'next/navigation'
import { Loading } from '@/components/common'

type OptionViewProps = {
  selectedOptions: Doc<'salon_option'>[]
  onChangeOptionsAction: (options: Doc<'salon_option'>[]) => void
}

export const OptionView = ({ selectedOptions, onChangeOptionsAction }: OptionViewProps) => {
  const params = useParams()
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

  if (!options) return <Loading />

  return (
    <div>
      <h2 className="text-base">オプションを選択</h2>
      <p className="text-gray-600 mb-4 text-sm">
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
                    <span className="line-through text-slate-400 text-sm">
                      ￥{option.unitPrice?.toLocaleString()}
                    </span>
                    <span className="font-semibold text-green-600 text-sm">
                      ￥{option.salePrice.toLocaleString()}
                    </span>
                  </>
                ) : (
                  <span className="text-sm font-semibold text-slate-700">
                    ￥{option.unitPrice?.toLocaleString()}
                  </span>
                )}
              </p>
              {option.description && option.description?.length > 50 && (
                <p className="text-sm text-gray-500 break-words">
                  {option.description?.slice(0, 50).concat('...')}
                </p>
              )}
              {option.description && option.description?.length <= 50 && (
                <p className="text-sm text-gray-500 break-words">{option.description}</p>
              )}
            </div>
            <div className="flex flex-col items-center w-1/3">
              <Button
                variant={selectedOptions.some((o) => o._id === option._id) ? 'default' : 'outline'}
                onClick={() => toggleOption(option)}
              >
                {selectedOptions.some((o) => o._id === option._id) ? '選択中' : '選択する'}
              </Button>
              <div className="flex items-center justify-end gap-1 mt-4">
                <button className="text-xs p-0 m-0 flex items-center gap-1">
                  <span className="text-xs text-blue-600 underline">詳細を見る</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}