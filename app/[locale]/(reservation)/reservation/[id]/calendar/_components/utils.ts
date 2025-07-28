import { Doc, Id } from '@/convex/_generated/dataModel'

// 電話番号バリデーション関数
export const isValidPhoneNumber = (phone: string | null): boolean => {
  if (!phone) return false
  // ハイフンあり・なし両対応の簡易的なバリデーション
  const phoneRegex = /^\d{2,4}-?\d{2,4}-?\d{3,4}$/
  return phoneRegex.test(phone)
}

// 複数選択されたオプションをカウントして配列にする関数
export const countOptionOccurrences = (
  options: Doc<'option'>[]
): { id: Id<'option'>; quantity: number; name: string; price: number }[] => {
  const counts = new Map<string, number>()

  options.forEach((option) => {
    counts.set(option._id, (counts.get(option._id) || 0) + 1)
  })

  return Array.from(counts.entries()).map(([optionId, quantity]) => ({
    id: optionId as Id<'option'>,
    quantity,
    name: options.find((opt) => opt._id === optionId)?.name ?? '不明',
    price: options.find((opt) => opt._id === optionId)?.sale_price ?? 0,
  }))
}

// 同じオプションをグループ化する関数
export const groupOptionsByName = (options: Doc<'option'>[]) => {
  const groupedOptions = new Map<
    string,
    { name: string; count: number; unitPrice: number; salePrice?: number }
  >()

  options.forEach((option) => {
    if (groupedOptions.has(option._id)) {
      const current = groupedOptions.get(option._id)!
      groupedOptions.set(option._id, {
        ...current,
        count: current.count + 1,
      })
    } else {
      groupedOptions.set(option._id, {
        name: option.name,
        count: 1,
        unitPrice: option.unit_price ?? 0,
        salePrice: option.sale_price,
      })
    }
  })

  return Array.from(groupedOptions.values())
}

// アニメーションバリアント
export const pageVariants = {
  initial: (direction: number) => ({
    x: direction > 0 ? '100%' : '-100%',
    opacity: 0,
  }),
  animate: {
    x: 0,
    opacity: 1,
    transition: {
      x: { type: 'spring', stiffness: 300, damping: 30 },
      opacity: { duration: 0.2 },
    },
  },
  exit: (direction: number) => ({
    x: direction > 0 ? '-100%' : '100%',
    opacity: 0,
    transition: {
      x: { type: 'spring', stiffness: 300, damping: 30 },
      opacity: { duration: 0.2 },
    },
  }),
}