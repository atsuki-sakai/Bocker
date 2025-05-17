'use client';

import Image from 'next/image'
import { useState } from 'react'
import { useStablePaginatedQuery } from '@/hooks/useStablePaginatedQuery'
import { api } from '@/convex/_generated/api'
import { useSalon } from '@/hooks/useSalon'
import Link from 'next/link'
import { Loading, Dialog } from '@/components/common'
import { Button } from '@/components/ui/button'
import { useMutation } from 'convex/react'
import { Id, Doc } from '@/convex/_generated/dataModel'
import { toast } from 'sonner'
import { handleErrorToMsg } from '@/lib/error'

const numberOfItems = 10
export default function OptionList() {
  const { salon } = useSalon()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [deleteOptionId, setDeleteOptionId] = useState<Id<'salon_option'> | null>(null)
  const {
    results: options,
    loadMore,
    isLoading,
    status,
  } = useStablePaginatedQuery(
    api.option.query.list,
    salon?._id
      ? {
          salonId: salon._id,
          activeOnly: true,
        }
      : 'skip',
    {
      initialNumItems: numberOfItems,
    }
  )

  const killOption = useMutation(api.option.mutation.kill)

  const showDeleteDialog = (optionId: Id<'salon_option'>) => {
    setIsDialogOpen(true)
    setDeleteOptionId(optionId)
  }

  const handleDelete = async (option: Doc<'salon_option'>) => {
    try {
      killOption({
        optionId: option._id,
      })
      if (option.imgPath) {
        await fetch('/api/storage', {
          method: 'DELETE',
          body: JSON.stringify({
            imgUrl: option.imgPath,
            withThumbnail: true,
          }),
        })
      }
      toast.success('オプションを削除しました')
      setIsDialogOpen(false)
    } catch (error) {
      toast.error(handleErrorToMsg(error))
    }
  }

  if (isLoading) {
    return <Loading />
  }

  return (
    <div className="mt-2 flow-root">
      <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8 px-4 md:px-0">
        <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
          <div className="overflow-hidden border border-border rounded-lg">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted text-nowrap px-2">
                <tr>
                  <th
                    scope="col"
                    className="py-3.5 pr-3 pl-4 text-left text-sm font-semibold text-primary sm:pl-6"
                  >
                    ステータス
                  </th>
                  <th
                    scope="col"
                    className="py-3.5 pr-3 pl-4 text-lefts text-sm font-semibold text-primary sm:pl-6"
                  >
                    画像
                  </th>
                  <th
                    scope="col"
                    className="py-3.5 pr-3 pl-4 text-left text-sm font-semibold text-primary sm:pl-6"
                  >
                    メニュー名
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3.5 text-left text-sm font-semibold text-primary"
                  >
                    単価/セール価格
                  </th>

                  <th
                    scope="col"
                    className="px-3 py-3.5 text-left text-sm font-semibold text-primary"
                  >
                    最大注文数
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3.5 text-left text-sm font-semibold text-primary"
                  >
                    トータル施術時間
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3.5 text-left text-sm font-semibold text-primary"
                  >
                    タグ
                  </th>
                  <th scope="col" className="relative py-3.5 pr-4 pl-3 sm:pr-6">
                    <span className="sr-only">編集</span>
                  </th>
                  <th scope="col" className="relative py-3.5 pr-4 pl-3 sm:pr-6">
                    <span className="sr-only">削除</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-background text-nowrap">
                {options && options.length > 0 ? (
                  options.map((option: Doc<'salon_option'>) => (
                    <tr key={option._id}>
                      <td
                        className={`py-4 pr-3 pl-4 text-sm font-medium whitespace-nowrap text-primary sm:pl-6 `}
                      >
                        <span
                          className={`font-bold text-xs ${option.isActive ? 'bg-active text-white' : 'bg-destructive text-white'} px-2 py-1 rounded-md`}
                        >
                          {option.isActive ? '有効' : '無効'}
                        </span>
                      </td>
                      <td className="py-4 pr-3 pl-4 text-sm font-medium whitespace-nowrap text-primary sm:pl-6">
                        {option.thumbnailPath ? (
                          <div className="w-12 h-12 rounded-md overflow-hidden">
                            <Image
                              src={option.thumbnailPath}
                              alt={option.name}
                              width={250}
                              height={250}
                              objectFit="cover"
                            />
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded-md overflow-hidden flex items-center justify-center bg-muted text-muted-foreground">
                            <p className="text-sm text-muted-foreground">
                              {option.name.slice(0, 1)}
                            </p>
                          </div>
                        )}
                      </td>
                      <td className="py-4 pr-3 pl-4 text-sm font-medium whitespace-nowrap text-primary sm:pl-6">
                        {option.name}
                      </td>
                      <td className="px-3 py-4 text-sm whitespace-nowrap text-gray-500">
                        {option.salePrice ? (
                          <span className="line-through text-muted-foreground text-xs">
                            ¥{option.unitPrice?.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            ¥{option.unitPrice?.toLocaleString()}
                          </span>
                        )}
                        {option.salePrice ? (
                          <span className="text-sm text-muted-foreground">
                            / ¥{option.salePrice.toLocaleString()}
                          </span>
                        ) : (
                          ''
                        )}
                      </td>

                      <td className="px-3 py-4 text-sm whitespace-nowrap text-muted-foreground">
                        {option.orderLimit ? `${option.orderLimit}個` : '未設定'}
                      </td>
                      <td className="px-3 py-4 text-sm whitespace-nowrap text-muted-foreground">
                        {option.timeToMin ? `${option.timeToMin}分` : '未設定'}
                      </td>
                      <td className="px-3 py-4 text-sm whitespace-nowrap text-muted-foreground">
                        {option.tags && option.tags.length > 0 ? option.tags.join('、') : '未設定'}
                      </td>
                      <td className="relative py-4 pr-4 pl-3 text-right text-sm font-medium whitespace-nowrap sm:pr-6">
                        <Link href={`/dashboard/option/${option._id}/edit`}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-link-foreground bg-link hover:opacity-80"
                          >
                            編集<span className="sr-only">, {option.name}</span>
                          </Button>
                        </Link>
                      </td>
                      <td className="relative py-4 pr-4 pl-3 text-right text-sm font-medium whitespace-nowrap sm:pr-6">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => showDeleteDialog(option._id)}
                          className="text-destructive-foreground bg-destructive hover:text-destructive-foreground"
                        >
                          削除<span className="sr-only">, {option.name}</span>
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="text-center py-6 text-sm text-muted-foreground">
                      オプションがありません
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {options && options.length > 0 && status == 'CanLoadMore' && (
        <div className="flex justify-center mt-4">
          <Button variant="outline" onClick={() => loadMore(numberOfItems)}>
            オプションをさらに読み込む
          </Button>
        </div>
      )}
      <Dialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        title="オプションを削除しますか？"
        description="この操作は元に戻すことができません。"
        onConfirmAction={() =>
          handleDelete(options.find((option) => option._id === deleteOptionId)!)
        }
      />
    </div>
  )
}
