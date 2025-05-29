'use client'

import Image from 'next/image'
import { useState } from 'react'
import { useStablePaginatedQuery } from '@/hooks/useStablePaginatedQuery'
import { api } from '@/convex/_generated/api'
import { useTenantAndOrganization } from '@/hooks/useTenantAndOrganization'
import Link from 'next/link'
import { Loading } from '@/components/common'
import { Button } from '@/components/ui/button'
import { useAction, useMutation } from 'convex/react'
import { Id, Doc } from '@/convex/_generated/dataModel'
import { toast } from 'sonner'
import { useErrorHandler } from '@/hooks/useErrorHandler'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Loader2 } from 'lucide-react'

const numberOfItems = 10
export default function OptionList() {
  const { tenantId, orgId } = useTenantAndOrganization()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const { showErrorToast } = useErrorHandler()
  const [deleteOptionId, setDeleteOptionId] = useState<Id<'option'> | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const {
    results: options,
    loadMore,
    isLoading,
    status,
  } = useStablePaginatedQuery(
    api.option.query.list,
    tenantId && orgId
      ? {
          tenant_id: tenantId,
          org_id: orgId,
        }
      : 'skip',
    {
      initialNumItems: numberOfItems,
    }
  )

  const killOption = useMutation(api.option.mutation.kill)
  const deleteWithThumbnail = useAction(api.storage.action.killWithThumbnail)

  const showDeleteDialog = (optionId: Id<'option'>) => {
    setIsDialogOpen(true)
    setDeleteOptionId(optionId)
  }

  const handleDelete = async (option: Doc<'option'>) => {
    setIsDeleting(true)
    try {
      killOption({
        option_id: option._id,
      })
      if (option.images[0].original_url) {
        console.log('option.images[0].original_url', option.images[0].original_url)
        console.log('option.images[0].thumbnail_url', option.images[0].thumbnail_url)
        await deleteWithThumbnail({
          originalUrl: option.images[0].original_url as string,
        })
      }
      toast.success('オプションを削除しました')
      setIsDialogOpen(false)
    } catch (error) {
      showErrorToast(error)
    } finally {
      setIsDeleting(false)
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
                  options.map((option: Doc<'option'>) => (
                    <tr key={option._id}>
                      <td
                        className={`py-4 pr-3 pl-4 text-sm font-medium whitespace-nowrap text-primary sm:pl-6 `}
                      >
                        <span
                          className={`font-bold text-xs ${option.is_archive ? 'bg-destructive text-white' : 'bg-active text-white'} px-2 py-1 rounded-md`}
                        >
                          {option.is_archive ? '削除' : '有効'}
                        </span>
                      </td>
                      <td className="py-4 pr-3 pl-4 text-sm font-medium whitespace-nowrap text-primary sm:pl-6">
                        {option.images[0]?.thumbnail_url ? (
                          <div className="relative w-12 h-12 rounded-md overflow-hidden">
                            <Image
                              src={option.images[0].thumbnail_url as string}
                              alt={option.name}
                              width={250}
                              height={250}
                              className="object-cover w-full h-full"
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
                        {option.sale_price ? (
                          <span className="line-through text-muted-foreground text-xs">
                            ¥{option.unit_price?.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            ¥{option.unit_price?.toLocaleString()}
                          </span>
                        )}
                        {option.sale_price ? (
                          <span className="text-sm text-muted-foreground">
                            / ¥{option.sale_price.toLocaleString()}
                          </span>
                        ) : (
                          ''
                        )}
                      </td>

                      <td className="px-3 py-4 text-sm whitespace-nowrap text-muted-foreground">
                        {option.order_limit ? `${option.order_limit}個` : '未設定'}
                      </td>
                      <td className="px-3 py-4 text-sm whitespace-nowrap text-muted-foreground">
                        {option.duration_min ? `${option.duration_min}分` : '未設定'}
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
      <Dialog open={isDialogOpen} onOpenChange={(open) => setIsDialogOpen(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>オプションを削除しますか？</DialogTitle>
            <DialogDescription>この操作は元に戻すことができません。</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              キャンセル
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleDelete(options.find((option) => option._id === deleteOptionId)!)}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  削除中...
                </>
              ) : (
                '削除'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
