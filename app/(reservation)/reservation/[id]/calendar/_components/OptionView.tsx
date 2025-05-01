'use client'

import { Doc, Id } from '@/convex/_generated/dataModel'
import { Button } from '@/components/ui/button'

type OptionViewProps = {
  selectedOptions: Doc<'salon_option'>[]
  onChangeOptionsAction: (options: Doc<'salon_option'>[]) => void
}

export const OptionView = ({ selectedOptions, onChangeOptionsAction }: OptionViewProps) => {
  // 仮のオプションデータ（実際のデータ取得はメインコンポーネントで行う）
  const options = [
    {
      _id: '1' as Id<'salon_option'>,
      name: 'ヘッドスパ',
      unitPrice: 2000,
      salePrice: 2000,
      tags: [],
      salonId: '1' as Id<'salon'>,
      _creationTime: 0,
    },
    {
      _id: '2' as Id<'salon_option'>,
      name: '炭酸ヘッドスパ',
      unitPrice: 3000,
      salePrice: 3000,
      tags: [],
      salonId: '1' as Id<'salon'>,
      _creationTime: 0,
    },
  ]

  const toggleOption = (option: Doc<'salon_option'>) => {
    const isSelected = selectedOptions.some((o) => o._id === option._id)
    if (isSelected) {
      onChangeOptionsAction(selectedOptions.filter((o) => o._id !== option._id))
    } else {
      onChangeOptionsAction([...selectedOptions, option])
    }
  }

  return (
    <div>
      <h2 className="text-base">オプションを選択</h2>
      <p className="text-gray-600 mb-4 text-sm">
        追加オプションがあれば選択してください。複数選択可能です。
      </p>
      <div className="space-y-3">
        {options.map((option) => (
          <div key={option._id} className="flex items-center justify-between border rounded-lg p-4">
            <div>
              <p className="font-medium">{option.name}</p>
              <p className="text-sm text-gray-500">
                {option.name === 'ヘッドスパ' ? '10分間のリラックスタイム' : '頭皮の血行促進効果'}
              </p>
            </div>
            <div className="flex items-center">
              <p className="mr-3">¥{option.unitPrice.toLocaleString()}</p>
              <Button
                variant={selectedOptions.some((o) => o._id === option._id) ? 'default' : 'outline'}
                onClick={() => toggleOption(option)}
              >
                {selectedOptions.some((o) => o._id === option._id) ? '選択中' : '選択する'}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}