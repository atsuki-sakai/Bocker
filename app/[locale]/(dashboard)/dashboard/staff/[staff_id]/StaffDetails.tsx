'use client'

import { Link } from '@/i18n/navigation'
import Image from 'next/image'
import React from 'react'
import { useParams } from 'next/navigation'
import { useQuery, useAction } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { useTenantAndOrganization } from '@/hooks/useTenantAndOrganization'
import { Loading } from '@/components/common'
import { useState, useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Instagram } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { useErrorHandler } from '@/hooks/useErrorHandler'
import { useTranslations } from 'next-intl'

// アイコン
import { User, Trash, Star, Tag, Mail, Calendar, FileEdit } from 'lucide-react'
import { MAX_PRIORITY } from '@/convex/constants'

export default function StaffDetails() {
  const { staff_id } = useParams()
  const { tenantId, orgId } = useTenantAndOrganization()
  const { showErrorToast } = useErrorHandler()
  const router = useRouter()
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const t = useTranslations()

  // メモ化されたクエリを使用してパフォーマンス向上
  const staffAllData = useQuery(
    api.staff.query.getRelatedTables,
    tenantId && orgId && staff_id && !isDeleting
      ? { tenant_id: tenantId, org_id: orgId, staff_id: staff_id as Id<'staff'> }
      : 'skip'
  )

  // 招待状態を含むスタッフ情報を取得
  const staffWithInvitation = useQuery(
    api.staff.invitation.query.getStaffWithInvitation,
    staff_id && !isDeleting ? { staff_id: staff_id as Id<'staff'> } : 'skip'
  )

  const exclusionMenus = useQuery(
    api.menu.menu_exclusion_staff.query.listBySalonAndStaffId,
    tenantId && orgId && staff_id
      ? {
          tenant_id: tenantId,
          org_id: orgId,
          staff_id: staff_id as Id<'staff'>,
        }
      : 'skip'
  )

  const deleteImage = useAction(api.storage.action.killWithThumbnail)
  const fetchUserEmail = useAction(api.staff.action.fetchUserEmail)

  // メールアドレス取得処理をuseCallbackで安定化
  const getEmailAddress = useCallback(
    async (clerkUserId: string) => {
      try {
        const email = await fetchUserEmail({
          clerk_user_id: clerkUserId,
        })
        console.log('取得したメール:', email)
        setUserEmail(email)
      } catch (error) {
        // エラーハンドリング：メール取得に失敗した場合はコンソールに出力
        console.error('メールアドレス取得エラー:', error)
        // UIには影響させず、メールリンクを非表示にする
        setUserEmail(null)
      }
    },
    [fetchUserEmail]
  )

  // メールアドレス取得のuseEffect
  useEffect(() => {
    // スタッフデータとclerk_user_idが存在する場合のみ処理を実行
    if (staffAllData && staffAllData.clerk_user_id !== undefined) {
      // useCallbackで安定化された関数を呼び出し
      getEmailAddress(staffAllData.clerk_user_id)
    }
  }, [staffAllData, getEmailAddress]) // getEmailAddressを依存配列に追加

  if (!staffAllData) return <Loading />

  // アバターの頭文字を取得
  const getInitials = (name: string) => {
    return name ? name.substring(0, 2).toUpperCase() : 'ST'
  }

  // 性別を日本語で表示
  const getGenderText = (gender: string) => {
    return gender === 'male'
      ? t('staff.add.male')
      : gender === 'female'
        ? t('staff.add.female')
        : t('staff.add.unselected')
  }

  // roleをわかりやすい表示に変換
  const getRoleDisplay = (role: string) => {
    return t(`staff.roles.${role}`)
  }

  const handleShowDeleteDialog = () => {
    setIsDeleteDialogOpen(true)
  }

  const handleDeleteStaff = async () => {
    try {
      // 削除処理中フラグを立てて、クエリの実行を停止
      setIsDeleting(true)

      // 1. 画像ファイルの削除
      if (staffAllData?.images[0]?.original_url) {
        await deleteImage({
          originalUrl: staffAllData.images[0].original_url,
        })
      }

      // 2. 削除APIを呼び出し（招待状態を考慮した削除）
      if (staffAllData && tenantId && orgId) {
        try {
          const deleteResponse = await fetch('/api/clerk/staff/delete', {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              staff_id: staff_id,
              tenant_id: tenantId,
              org_id: orgId,
              staff_config_id: staffAllData.staff_config_id,
            }),
          })

          const deleteData = await deleteResponse.json()

          if (deleteResponse.ok) {
            console.log('スタッフ削除成功:', deleteData)
          } else {
            throw new Error(deleteData.error || 'スタッフ削除に失敗しました')
          }
        } catch (deleteError) {
          console.error('スタッフ削除エラー:', deleteError)
          throw deleteError
        }
      }

      // 3. データベースからの削除は削除APIで処理済みのため不要

      toast.success('スタッフを削除しました')
      router.push('/dashboard/staff')
    } catch (error) {
      // エラーが発生した場合は削除処理中フラグを元に戻す
      setIsDeleting(false)
      showErrorToast(error)
    }
  }

  return (
    <div className="pb-8">
      {/* スタッフヘッダーカード - 改良版 */}
      <div>
        <div className="mb-6">
          <div className="p-0">
            <div className="flex flex-col md:flex-row w-full">
              {/* サムネイル部分 - スタイル改良 */}
              <div className="flex items-center justify-center mx-auto overflow-hidden md:w-1/3">
                {staffAllData.images && staffAllData.images.length > 0 ? (
                  <div className="w-full h-full max-w-2xl mx-auto">
                    <Image
                      src={staffAllData.images[0].original_url}
                      alt={staffAllData.name || ''}
                      width={1920}
                      height={1920}
                      className="object-cover rounded-md"
                    />
                  </div>
                ) : (
                  <div className="text-3xl font-semibold text-primary/70 flex items-center justify-center h-full w-full">
                    {getInitials(staffAllData.name || '')}
                  </div>
                )}
              </div>

              {/* 情報部分 - レイアウト改良 */}
              <div className="py-6 md:w-2/3 xl:ml-10">
                <div className="flex flex-col xl:flex-row justify-between items-start mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-primary">{staffAllData.name}</h2>
                    <div className="flex items-center gap-4 mt-2">
                      <Badge variant={staffAllData.is_active ? 'default' : 'outline'}>
                        {staffAllData.is_active ? t('common.active') : t('common.inactive')}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="border-active text-active bg-active-foreground"
                      >
                        {getRoleDisplay(staffAllData.role || '')}
                      </Badge>
                      {staffWithInvitation && staffWithInvitation.connect_clerk && (
                        <Badge variant="outline">
                          <Mail className="h-3 w-3 mr-1" />
                          {t('staff.common.authenticatedStaff')}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 text-sm text-muted-foreground mt-4 xl:mt-0">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-primary font-bold text-lg">
                        {getGenderText(staffAllData.gender || 'unselected')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-primary font-bold text-lg">
                        {staffAllData.age
                          ? t('staff.common.ageValue', { age: staffAllData.age })
                          : t('staff.common.ageNotSet')}
                      </span>
                    </div>
                    {staffAllData.instagram_link && (
                      <div className="flex items-center gap-2 ml-4 xl:ml-0">
                        <Link
                          href={staffAllData.instagram_link}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Instagram className="h-6 w-6 mr-5 text-pink-500" />
                        </Link>
                      </div>
                    )}
                  </div>
                </div>

                {userEmail && (
                  <div className="mt-4 w-full flex justify-start items-center mb-4">
                    <Link
                      href={`mailto:${userEmail}`}
                      className="text-link-foreground underline text-sm"
                    >
                      {userEmail}
                    </Link>
                  </div>
                )}

                <span className="text-xs text-muted-foreground">
                  {t('staff.details.introduction')}
                </span>
                <p className=" text-primary tracking-wide leading-6  mb-5  border-border">
                  {staffAllData.description || t('staff.details.noIntroduction')}
                </p>

                {staffAllData.tags && staffAllData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {staffAllData.tags.map((tag) => (
                      <Badge key={tag}>{tag}</Badge>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                  {/* 指名料金 */}
                  <div className="flex justify-between  p-3 rounded-lg border border-palette-1-foreground bg-palette-1 transition-shadow">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-palette-1-foreground">
                        <Tag className="h-4 w-4" />
                        <p className="text-xs font-bold">{t('staff.add.nominationFee')}</p>
                      </div>
                      <p className="font-bold text-lg text-palette-1-foreground">
                        ¥{staffAllData.extra_charge || 0}
                      </p>
                      <p className="mt-1 text-xs text-palette-1-foreground max-w-xs">
                        {t('staff.add.nominationFeeHelp')}
                      </p>
                    </div>
                  </div>

                  {/* 優先度 */}
                  <div className="flex justify-between  p-3 rounded-lg border border-palette-2-foreground bg-palette-2 transition-shadow">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-palette-2-foreground">
                        <Star className="h-4 w-4" />
                        <p className="text-xs font-bold">{t('staff.add.priority')}</p>
                      </div>
                      <p className="font-bold text-lg text-palette-2-foreground">
                        {staffAllData.priority || 0}
                        <span className="text-xs text-palette-2-foreground">/{MAX_PRIORITY}</span>
                      </p>
                      <p className="mt-1 text-xs text-palette-2-foreground max-w-xs">
                        {t('staff.add.priorityHelp')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 対応外メニュー表示 */}
                {exclusionMenus && exclusionMenus.length > 0 && (
                  <div className="mt-4 p-3 bg-muted rounded-md border border-border">
                    <h3 className="text-sm font-semibold text-primary mb-2 flex items-center gap-2">
                      <Tag className="h-4 w-4" />
                      {t('staff.add.exclusionMenuTitle')}
                    </h3>
                    <ul className="flex flex-wrap gap-2">
                      {exclusionMenus.map((menu) => (
                        <li
                          key={menu.menu_id.slice(0, 12)}
                          className="bg-background border border-border p-1 px-2 text-xs text-muted-foreground rounded-md shadow-sm"
                        >
                          {menu.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className=" py-3 flex justify-between">
            <div className="text-xs text-muted-foreground tracking-wider">
              <span>{t('staff.details.createdAt')}: </span>
              {new Date(staffAllData._creationTime).toLocaleDateString()}
            </div>
            <div className="flex gap-2">
              <Button
                variant="destructive"
                size="sm"
                className="gap-1"
                onClick={handleShowDeleteDialog}
              >
                <Trash className="h-4 w-4" />
                {t('common.delete')}
              </Button>
              <Link href={`/dashboard/staff/${staff_id}/edit`}>
                <Button variant="default" size="sm" className="gap-1">
                  <FileEdit className="h-4 w-4" />
                  {t('common.edit')}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* 削除確認ダイアログ */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('staff.common.deleteConfirm')}</DialogTitle>
            <DialogDescription>{t('staff.common.deleteConfirmDesc')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="destructive" onClick={handleDeleteStaff}>
              {t('staff.edit.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
