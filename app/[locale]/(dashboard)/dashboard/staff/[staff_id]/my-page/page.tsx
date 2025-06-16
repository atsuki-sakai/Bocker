'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTenantAndOrganization } from '@/hooks/useTenantAndOrganization'
import { useQuery, useAction } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { Loading } from '@/components/common'
import Image from 'next/image'
import { Link } from '@/i18n/navigation'
import { Badge } from '@/components/ui/badge'
import { convertGender, convertRole } from '@/convex/types'
import { Mail, User, Calendar, Instagram, Tag, Star, FileEdit } from 'lucide-react'
import { MAX_PRIORITY } from '@/convex/constants'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import MyWeekScheduleForm from './MyWeekScheduleForm'
import MyExceptionScheduleForm from './MyExceptionScheduleForm'
import { useTranslations } from 'next-intl'

// アバターの頭文字を取得
const getInitials = (name: string) => {
  return name ? name.substring(0, 2).toUpperCase() : 'ST'
}

export default function StaffMyPage() {
  const { tenantId, orgId, isLoaded, ready, staffId } = useTenantAndOrganization()
  const t = useTranslations('staff.myPage')

  const [userEmail, setUserEmail] = useState<string | null>(null)
  const staff = useQuery(api.staff.query.getRelatedTables, {
    tenant_id: tenantId as Id<'tenant'>,
    org_id: orgId as Id<'organization'>,
    staff_id: staffId as Id<'staff'>,
  })

  const exclusionMenus = useQuery(api.menu.menu_exclusion_staff.query.getExclusionMenus, {
    tenant_id: tenantId as Id<'tenant'>,
    org_id: orgId as Id<'organization'>,
    staff_id: staffId as Id<'staff'>,
  })

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
    if (staff && staff.clerk_user_id !== undefined) {
      // useCallbackで安定化された関数を呼び出し
      getEmailAddress(staff.clerk_user_id)
    }
  }, [staff, getEmailAddress]) // getEmailAddressを依存配列に追加

  if (!isLoaded || !ready) {
    return <Loading />
  }

  if (!staffId || !tenantId || !orgId) {
    return <div>Error: Staff ID, Tenant ID, or Organization ID is missing</div>
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
                {staff?.images && staff?.images.length > 0 ? (
                  <div className="w-full h-full max-w-2xl mx-auto">
                    <Image
                      src={staff?.images[0].original_url}
                      alt={staff?.name || ''}
                      width={1920}
                      height={1920}
                      className="object-cover rounded-md"
                    />
                  </div>
                ) : (
                  <div className="text-3xl font-semibold text-primary/70 flex items-center justify-center h-full w-full">
                    {getInitials(staff?.name || '')}
                  </div>
                )}
              </div>

              {/* 情報部分 - レイアウト改良 */}
              <div className="py-6 md:w-2/3 xl:ml-10">
                <div className="flex flex-col xl:flex-row justify-between items-start mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-primary">{staff?.name}</h2>
                    <div className="flex items-center gap-4 mt-2">
                      <Badge variant={staff?.is_active ? 'default' : 'outline'}>
                        {staff?.is_active ? t('active') : t('inactive')}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="border-accent-2 text-accent-2 bg-accent-2-foreground"
                      >
                        {convertRole(staff?.role || 'staff')}
                      </Badge>
                      {staff?.connect_clerk && (
                        <Badge variant="outline">
                          <Mail className="h-3 w-3 mr-1" />
                          {t('authenticatedStaff')}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 text-sm text-muted-foreground mt-4 xl:mt-0">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-primary font-bold text-lg">
                        {convertGender(staff?.gender || 'unselected')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-primary font-bold text-lg">
                        {staff?.age ? t('age', { age: staff?.age }) : t('ageNotSet')}
                      </span>
                    </div>
                    {staff?.instagram_link && (
                      <div className="flex items-center gap-2 ml-4 xl:ml-0">
                        <Link
                          href={staff?.instagram_link}
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

                <span className="text-xs text-muted-foreground">{t('introduction')}</span>
                <p className=" text-primary tracking-wide leading-6  mb-5  border-border">
                  {staff?.description || t('noDescription')}
                </p>

                {staff?.tags && staff?.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {staff?.tags.map((tag) => <Badge key={tag}>{tag}</Badge>)}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                  {/* 指名料金 */}
                  <div className="flex justify-between  p-3 rounded-lg border border-palette-1-foreground bg-palette-1 transition-shadow">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-palette-1-foreground">
                        <Tag className="h-4 w-4" />
                        <p className="text-xs font-bold">{t('nominationFee')}</p>
                      </div>
                      <p className="font-bold text-lg text-palette-1-foreground">
                        ¥{staff?.extra_charge || 0}
                      </p>
                      <p className="mt-1 text-xs text-palette-1-foreground max-w-xs">
                        {t('nominationFeeDescription')}
                      </p>
                    </div>
                  </div>

                  {/* 優先度 */}
                  <div className="flex justify-between  p-3 rounded-lg border border-palette-2-foreground bg-palette-2 transition-shadow">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-palette-2-foreground">
                        <Star className="h-4 w-4" />
                        <p className="text-xs font-bold">{t('priority')}</p>
                      </div>
                      <p className="font-bold text-lg text-palette-2-foreground">
                        {staff?.priority || 0}
                        <span className="text-xs text-palette-2-foreground">/{MAX_PRIORITY}</span>
                      </p>
                      <p className="mt-1 text-xs text-palette-2-foreground max-w-xs">
                        {t('priorityDescription')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 対応外メニュー表示 */}
                {exclusionMenus && exclusionMenus.length > 0 && (
                  <div className="mt-4 p-3 bg-muted rounded-md border border-border">
                    <h3 className="text-sm font-semibold text-primary mb-2 flex items-center gap-2">
                      <Tag className="h-4 w-4" />
                      {t('exclusionMenus')}
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
              <span>{t('createdDate')}: </span>
              {new Date(staff?._creationTime ?? '').toLocaleDateString()}
            </div>
            <div className="flex gap-2">
              <Link href={`/dashboard/staff/${staffId}/edit`}>
                <Button variant="default" size="sm" className="gap-1">
                  <FileEdit className="h-4 w-4" />
                  {t('edit')}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <Tabs defaultValue="week" className="w-full">
          <TabsList className="mb-4 w-full max-w-[500px]">
            <TabsTrigger value="week" className="w-full">
              {t('tabs.weekSchedule')}
            </TabsTrigger>
            <TabsTrigger value="schedule" className="w-full">
              {t('tabs.exceptionSchedule')}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="week">
            <MyWeekScheduleForm />
          </TabsContent>
          <TabsContent value="schedule">
            <MyExceptionScheduleForm />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
