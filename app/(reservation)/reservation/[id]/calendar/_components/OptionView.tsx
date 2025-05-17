'use client'

import { useState, useEffect } from 'react'
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
import { Alert, AlertDescription } from '@/components/ui/alert'
import { InfoIcon, Plus, Minus, AlertTriangle } from 'lucide-react'
import Image from 'next/image'

type OptionViewProps = {
  selectedOptions: Doc<'salon_option'>[]
  onChangeOptionsAction: (options: Doc<'salon_option'>[]) => void
}

export const OptionView = ({ selectedOptions, onChangeOptionsAction }: OptionViewProps) => {
  const params = useParams()
  const [showOptionDetail, setShowOptionDetail] = useState(false)
  const [selectedOption, setSelectedOption] = useState<Doc<'salon_option'> | null>(null)
  const [optionSelectionError, setOptionSelectionError] = useState<string | null>(null)
  const salonId = params.id as Id<'salon'>
  const options = useQuery(api.option.query.findAll, {
    salonId: salonId,
  })

  // オプション選択数の制限を確認する
  const canAddOption = (option: Doc<'salon_option'>) => {
    // 同じオプションの選択数をカウント
    const currentCount = selectedOptions.filter((o) => o._id === option._id).length

    // 在庫数のチェック
    if (option.inStock !== undefined && option.inStock !== null) {
      if (currentCount >= option.inStock) {
        setOptionSelectionError(`このオプション「${option.name}」の在庫が不足しています。`)
        return false
      }
    }

    // オプションに制限がある場合、その上限をチェック
    if (option.orderLimit !== undefined && option.orderLimit > 0) {
      if (currentCount >= option.orderLimit) {
        setOptionSelectionError(
          `このオプション「${option.name}」は最大${option.orderLimit}回までしか選択できません。`
        )
        return false
      }
    }

    return true
  }

  // オプションの追加処理
  const addOption = (option: Doc<'salon_option'>) => {
    if (canAddOption(option)) {
      onChangeOptionsAction([...selectedOptions, option])
      setOptionSelectionError(null)
    }
  }

  // オプションの削除処理
  const removeOption = (option: Doc<'salon_option'>) => {
    // 削除対象のオプションが見つかるまで検索
    const index = selectedOptions.findIndex((o) => o._id === option._id)
    if (index !== -1) {
      const newSelectedOptions = [...selectedOptions]
      newSelectedOptions.splice(index, 1)
      onChangeOptionsAction(newSelectedOptions)
    }
    setOptionSelectionError(null)
  }

  // オプションの初回選択または解除
  const toggleOption = (option: Doc<'salon_option'>) => {
    const isSelected = selectedOptions.some((o) => o._id === option._id)

    if (isSelected) {
      // すべての同じオプションを削除
      onChangeOptionsAction(selectedOptions.filter((o) => o._id !== option._id))
      setOptionSelectionError(null)
    } else {
      // 初回追加
      addOption(option)
    }
  }

  const handleShowOptionDetail = (option: Doc<'salon_option'>) => {
    setSelectedOption(option)
    setShowOptionDetail(true)
  }

  // エラーメッセージのクリア
  useEffect(() => {
    setOptionSelectionError(null)
  }, [selectedOptions])

  if (!options) return <Loading />

  console.log(options)

  return (
    <div>
      <h2 className="text-base">オプションを選択</h2>
      <p className="text-muted-foreground mb-4 text-sm">
        追加オプションがあれば選択してください。複数選択可能です。
      </p>

      {optionSelectionError && (
        <Alert variant="destructive" className="mb-4">
          <InfoIcon className="h-4 w-4" />
          <AlertDescription>{optionSelectionError}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-3">
        {options.map((option) => {
          const selectedCount = selectedOptions.filter((o) => o._id === option._id).length
          const isSelected = selectedCount > 0
          const isMaxedOut =
            (option.orderLimit !== undefined &&
              option.orderLimit > 0 &&
              selectedCount >= option.orderLimit) ||
            (option.inStock !== undefined &&
              option.inStock !== null &&
              selectedCount >= option.inStock)

          // 在庫が少ないかどうかのチェック
          const isLowStock =
            option.inStock !== undefined &&
            option.inStock !== null &&
            option.inStock <= 3 &&
            option.inStock > 0

          return (
            <div
              key={option._id}
              className="flex items-center justify-between border rounded-lg p-4 w-full"
            >
              <div className="flex items-center gap-2">
                <div className="flex flex-col items-start justify-start gap-1 w-full">
                  {option.thumbnailPath ? (
                    <Image
                      src={option.thumbnailPath}
                      alt={option.name}
                      width={100}
                      height={100}
                      className="rounded-lg aspect-square object-cover"
                    />
                  ) : null}
                </div>
                <div className="flex flex-col gap-1 w-full mr-4 ">
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
                    <p className="text-sm text-muted-foreground break-words">
                      {option.description}
                    </p>
                  )}
                  {option.orderLimit && option.orderLimit > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {selectedCount > 0
                        ? `${selectedCount}/${option.orderLimit}`
                        : `最大${option.orderLimit}個まで選択可能`}
                    </p>
                  )}
                  {option.inStock !== undefined && option.inStock !== null && (
                    <p className="text-xs text-muted-foreground">
                      {/* {selectedCount > 0
                        ? `残り${option.inStock - selectedCount}個`
                        : `在庫${option.inStock}個`} */}
                      {selectedCount > 0 && selectedCount <= 10 && (
                        <>残り{option.inStock - selectedCount}個</>
                      )}
                    </p>
                  )}
                  {isLowStock && (
                    <p className="text-xs text-warning-foreground flex items-center">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      残り僅か
                    </p>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end w-1/3">
                {isSelected ? (
                  <div className="flex flex-col gap-2 items-center">
                    <div className="flex items-center gap-2 w-full">
                      <Button
                        size="sm"
                        variant="outline"
                        className="px-2 py-1 h-8"
                        onClick={() => removeOption(option)}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="text-center w-8">{selectedCount}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="px-2 py-1 h-8"
                        onClick={() => addOption(option)}
                        disabled={isMaxedOut}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="mt-1"
                      onClick={() => toggleOption(option)}
                    >
                      削除
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => toggleOption(option)}
                    disabled={isMaxedOut || (option.inStock !== undefined && option.inStock <= 0)}
                  >
                    {option.inStock !== undefined && option.inStock <= 0 ? '在庫切れ' : '選択する'}
                  </Button>
                )}
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
          )
        })}
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
            {selectedOption?.orderLimit && selectedOption.orderLimit > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                最大{selectedOption.orderLimit}個まで選択可能
              </p>
            )}
            {selectedOption?.inStock !== undefined && selectedOption?.inStock !== null && (
              <p className="text-xs text-muted-foreground mt-1">
                在庫数: {selectedOption.inStock}個
              </p>
            )}
            {selectedOption?.inStock !== undefined &&
              selectedOption?.inStock !== null &&
              selectedOption.inStock <= 3 &&
              selectedOption.inStock > 0 && (
                <p className="text-xs text-amber-500 flex items-center mt-1">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  残り僅か
                </p>
              )}
          </DialogHeader>
          <DialogDescription>{selectedOption?.description}</DialogDescription>
          <DialogFooter>
            <div className="flex items-center justify-between w-full gap-2">
              <Button onClick={() => setShowOptionDetail(false)}>閉じる</Button>
              <Button
                onClick={() => {
                  if (selectedOption) {
                    const selectedCount = selectedOptions.filter(
                      (o) => o._id === selectedOption._id
                    ).length
                    const isMaxedOut =
                      (selectedOption.orderLimit !== undefined &&
                        selectedOption.orderLimit > 0 &&
                        selectedCount >= selectedOption.orderLimit) ||
                      (selectedOption.inStock !== undefined &&
                        selectedOption.inStock !== null &&
                        selectedCount >= selectedOption.inStock)

                    if (!isMaxedOut) {
                      onChangeOptionsAction([...selectedOptions, selectedOption])
                      setShowOptionDetail(false)
                    } else {
                      if (
                        selectedOption.inStock !== undefined &&
                        selectedOption.inStock !== null &&
                        selectedCount >= selectedOption.inStock
                      ) {
                        setOptionSelectionError(
                          `このオプション「${selectedOption.name}」の在庫が不足しています。`
                        )
                      } else {
                        setOptionSelectionError(
                          `このオプション「${selectedOption.name}」は最大${selectedOption.orderLimit}回までしか選択できません。`
                        )
                      }
                      setShowOptionDetail(false)
                    }
                  }
                }}
                disabled={
                  selectedOption
                    ? (selectedOption.orderLimit !== undefined &&
                        selectedOption.orderLimit > 0 &&
                        selectedOptions.filter((o) => o._id === selectedOption._id).length >=
                          selectedOption.orderLimit) ||
                      (selectedOption.inStock !== undefined &&
                        selectedOption.inStock !== null &&
                        selectedOptions.filter((o) => o._id === selectedOption._id).length >=
                          selectedOption.inStock) ||
                      (selectedOption.inStock !== undefined && selectedOption.inStock <= 0)
                    : false
                }
              >
                {selectedOption &&
                selectedOptions.filter((o) => o._id === selectedOption._id).length > 0
                  ? '追加選択する'
                  : selectedOption &&
                      selectedOption.inStock !== undefined &&
                      selectedOption.inStock <= 0
                    ? '在庫切れ'
                    : '選択する'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}