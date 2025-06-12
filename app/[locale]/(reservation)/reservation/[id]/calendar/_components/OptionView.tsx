'use client'

import { useState, useEffect } from 'react'
import { Doc, Id } from '@/convex/_generated/dataModel'
import { Button } from '@/components/ui/button'
import { api } from '@/convex/_generated/api'
import { useQuery } from 'convex/react'
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
  tenantId: Id<'tenant'>
  orgId: Id<'organization'>
  selectedOptions: Doc<'option'>[]
  onChangeOptionsAction: (options: Doc<'option'>[]) => void
}

export const OptionView = ({
  tenantId,
  orgId,
  selectedOptions,
  onChangeOptionsAction,
}: OptionViewProps) => {
  const [showOptionDetail, setShowOptionDetail] = useState(false)
  const [selectedOption, setSelectedOption] = useState<Doc<'option'> | null>(null)
  const [optionSelectionError, setOptionSelectionError] = useState<string | null>(null)
  const options = useQuery(api.option.query.take, {
    tenant_id: tenantId,
    org_id: orgId,
    take: 50,
  })

  // オプション選択数の制限を確認する
  const canAddOption = (option: Doc<'option'>) => {
    // 同じオプションの選択数をカウント
    const currentCount = selectedOptions.filter((o) => o._id === option._id).length

    // 在庫数のチェック
    if (option.in_stock !== undefined && option.in_stock !== null) {
      if (currentCount >= option.in_stock) {
        setOptionSelectionError(`このオプション「${option.name}」の在庫が不足しています。`)
        return false
      }
    }

    // オプションに制限がある場合、その上限をチェック
    if (option.order_limit !== undefined && option.order_limit > 0) {
      if (currentCount >= option.order_limit) {
        setOptionSelectionError(
          `このオプション「${option.name}」は最大${option.order_limit}回までしか選択できません。`
        )
        return false
      }
    }

    return true
  }

  // オプションの追加処理
  const addOption = (option: Doc<'option'>) => {
    if (canAddOption(option)) {
      onChangeOptionsAction([...selectedOptions, option])
      setOptionSelectionError(null)
    }
  }

  // オプションの削除処理
  const removeOption = (option: Doc<'option'>) => {
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
  const toggleOption = (option: Doc<'option'>) => {
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

  const handleShowOptionDetail = (option: Doc<'option'>) => {
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
            (option.order_limit !== undefined &&
              option.order_limit > 0 &&
              selectedCount >= option.order_limit) ||
            (option.in_stock !== undefined &&
              option.in_stock !== null &&
              selectedCount >= option.in_stock)

          // 在庫が少ないかどうかのチェック
          const isLowStock =
            option.in_stock !== undefined &&
            option.in_stock !== null &&
            option.in_stock <= 3 &&
            option.in_stock > 0

          return (
            <div
              key={option._id}
              className="flex items-center justify-between border rounded-lg p-4 w-full"
            >
              <div className="flex items-center gap-2">
                <div className="flex flex-col items-start justify-start gap-1 w-full">
                  {option.images && option.images.length > 0 && option.images[0].thumbnail_url ? (
                    <Image
                      src={option.images[0].thumbnail_url}
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
                    {option.sale_price && option.sale_price > 0 ? (
                      <>
                        <span className="line-through text-muted-foreground text-sm">
                          ￥{option.unit_price?.toLocaleString()}
                        </span>
                        <span className="font-semibold text-active text-sm">
                          ￥{option.sale_price.toLocaleString()}
                        </span>
                      </>
                    ) : (
                      <span className="text-sm font-semibold text-muted-foreground">
                        ￥{option.unit_price?.toLocaleString()}
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
                  {option.order_limit && option.order_limit > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {selectedCount > 0
                        ? `${selectedCount}/${option.order_limit}`
                        : `最大${option.order_limit}個まで選択可能`}
                    </p>
                  )}
                  {option.in_stock !== undefined && option.in_stock !== null && (
                    <p className="text-xs text-muted-foreground">
                      {/* {selectedCount > 0
                        ? `残り${option.inStock - selectedCount}個`
                        : `在庫${option.inStock}個`} */}
                      {selectedCount > 0 && selectedCount <= 10 && (
                        <>残り{option.in_stock - selectedCount}個</>
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
                    disabled={isMaxedOut || (option.in_stock !== undefined && option.in_stock <= 0)}
                  >
                    {option.in_stock !== undefined && option.in_stock <= 0
                      ? '在庫切れ'
                      : '選択する'}
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
              {selectedOption?.sale_price && selectedOption?.sale_price > 0 ? (
                <>
                  <span className="line-through text-muted-foreground text-sm">
                    ￥{selectedOption?.unit_price?.toLocaleString()}
                  </span>
                  <span className="font-semibold text-active text-sm">
                    ￥{selectedOption?.sale_price.toLocaleString()}
                  </span>
                </>
              ) : (
                <span className="text-sm font-semibold text-muted-foreground">
                  ￥{selectedOption?.unit_price?.toLocaleString()}
                </span>
              )}
            </p>
            {selectedOption?.order_limit && selectedOption.order_limit > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                最大{selectedOption.order_limit}個まで選択可能
              </p>
            )}
            {selectedOption?.in_stock !== undefined && selectedOption?.in_stock !== null && (
              <p className="text-xs text-muted-foreground mt-1">
                在庫数: {selectedOption.in_stock}個
              </p>
            )}
            {selectedOption?.in_stock !== undefined &&
              selectedOption?.in_stock !== null &&
              selectedOption.in_stock <= 3 &&
              selectedOption.in_stock > 0 && (
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
                      (selectedOption.order_limit !== undefined &&
                        selectedOption.order_limit > 0 &&
                        selectedCount >= selectedOption.order_limit) ||
                      (selectedOption.in_stock !== undefined &&
                        selectedOption.in_stock !== null &&
                        selectedCount >= selectedOption.in_stock)

                    if (!isMaxedOut) {
                      onChangeOptionsAction([...selectedOptions, selectedOption])
                      setShowOptionDetail(false)
                    } else {
                      if (
                        selectedOption.in_stock !== undefined &&
                        selectedOption.in_stock !== null &&
                        selectedCount >= selectedOption.in_stock
                      ) {
                        setOptionSelectionError(
                          `このオプション「${selectedOption.name}」の在庫が不足しています。`
                        )
                      } else {
                        setOptionSelectionError(
                          `このオプション「${selectedOption.name}」は最大${selectedOption.order_limit}回までしか選択できません。`
                        )
                      }
                      setShowOptionDetail(false)
                    }
                  }
                }}
                disabled={
                  selectedOption
                    ? (selectedOption.order_limit !== undefined &&
                        selectedOption.order_limit > 0 &&
                        selectedOptions.filter((o) => o._id === selectedOption._id).length >=
                          selectedOption.order_limit) ||
                      (selectedOption.in_stock !== undefined &&
                        selectedOption.in_stock !== null &&
                        selectedOptions.filter((o) => o._id === selectedOption._id).length >=
                          selectedOption.in_stock) ||
                      (selectedOption.in_stock !== undefined && selectedOption.in_stock <= 0)
                    : false
                }
              >
                {selectedOption &&
                selectedOptions.filter((o) => o._id === selectedOption._id).length > 0
                  ? '追加選択する'
                  : selectedOption &&
                      selectedOption.in_stock !== undefined &&
                      selectedOption.in_stock <= 0
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
