'use client'

import { useState, useEffect } from 'react'
import { usePaginatedQuery, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Loading } from '@/components/common'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  CheckCircle2,
  Circle,
  Clock,
  Store,
  Calendar,
  Menu,
  Users,
  Copy,
  ExternalLink,
  AlertCircle,
  ChevronRight,
} from 'lucide-react'
import { toast } from 'sonner'
import { useTenantAndOrganization } from '@/hooks/useTenantAndOrganization'
import Link from 'next/link'

interface TutorialStep {
  id: number
  title: string
  description: string
  icon: React.ElementType
  required: boolean
  href: string
  checkLabel: string
}

const tutorialSteps: TutorialStep[] = [
  {
    id: 1,
    title: '店舗基本情報',
    description: '店舗名、住所、連絡先を設定',
    icon: Store,
    required: true,
    href: '/dashboard/setting',
    checkLabel: '店舗名と住所の設定',
  },
  {
    id: 2,
    title: '営業時間',
    description: '営業日と営業時間を設定',
    icon: Calendar,
    required: true,
    href: '/dashboard/setting',
    checkLabel: '営業時間の設定',
  },
  {
    id: 3,
    title: 'メニュー登録',
    description: '提供するメニューを最低1つ登録',
    icon: Menu,
    required: true,
    href: '/dashboard/menu',
    checkLabel: 'メニューの登録（最低1つ）',
  },
  {
    id: 4,
    title: 'スタッフ登録',
    description: 'スタッフを最低1名登録',
    icon: Users,
    required: true,
    href: '/dashboard/staff/add',
    checkLabel: 'スタッフの登録（最低1名）',
  },
  {
    id: 5,
    title: '予約設定',
    description: '予約受付の基本設定',
    icon: Clock,
    required: true,
    href: '/dashboard/setting',
    checkLabel: '予約受付の設定',
  },
  {
    id: 6,
    title: 'スタッフ勤務スケジュール',
    description: 'スタッフの勤務時間を設定',
    icon: Calendar,
    required: true,
    href: '/dashboard/staff/schedule',
    checkLabel: 'スタッフの勤務スケジュール設定',
  },
  {
    id: 7,
    title: 'LINE連携',
    description: 'LINE APIの設定を行う',
    icon: ExternalLink,
    required: true,
    href: '/dashboard/setting',
    checkLabel: 'LINE連携の設定',
  },
]

export const Tutorial = () => {
  const { tenantId, orgId, ready } = useTenantAndOrganization()
  const [completedSteps, setCompletedSteps] = useState<number[]>([])
  const [missingItems, setMissingItems] = useState<string[]>([])

  // Convex Queries
  const org = useQuery(
    api.organization.config.query.findByTenantAndOrg,
    tenantId && orgId
      ? {
          tenant_id: tenantId,
          org_id: orgId,
        }
      : 'skip'
  )

  const weekSchedules = useQuery(
    api.organization.week_schedule.query.getAllByTenantAndOrg,
    tenantId && orgId
      ? {
          tenant_id: tenantId,
          org_id: orgId,
        }
      : 'skip'
  )

  const menus = usePaginatedQuery(
    api.menu.query.listByTenantAndOrg,
    tenantId && orgId
      ? {
          tenant_id: tenantId,
          org_id: orgId,
        }
      : 'skip',
    {
      initialNumItems: 100,
    }
  )

  const staffList = usePaginatedQuery(
    api.staff.query.list,
    tenantId && orgId
      ? {
          tenant_id: tenantId,
          org_id: orgId,
        }
      : 'skip',
    {
      initialNumItems: 100,
    }
  )

  const reservationConfig = useQuery(
    api.organization.reservation_config.query.findByTenantAndOrg,
    tenantId && orgId
      ? {
          tenant_id: tenantId,
          org_id: orgId,
        }
      : 'skip'
  )

  const staffSchedules = useQuery(
    api.staff.week_schedule.query.getByTenantOrgStaff,
    tenantId && orgId && staffList.results.length > 0
      ? {
          tenant_id: tenantId,
          org_id: orgId,
          staff_id: staffList.results[0]._id,
        }
      : 'skip'
  )

  const apiConfig = useQuery(
    api.organization.api_config.query.findByTenantAndOrg,
    tenantId && orgId
      ? {
          tenant_id: tenantId,
          org_id: orgId,
        }
      : 'skip'
  )

  // Check completed steps and missing items
  useEffect(() => {
    const completed: number[] = []
    const missing: string[] = []

    // Step 1: 店舗基本情報
    if (org?.org.org_name && org?.config?.address) {
      completed.push(1)
    } else {
      missing.push(tutorialSteps[0].checkLabel)
    }

    // Step 2: 営業時間
    if (weekSchedules && weekSchedules.length > 0) {
      completed.push(2)
    } else {
      missing.push(tutorialSteps[1].checkLabel)
    }

    // Step 3: メニュー
    if (menus && menus.results.length > 0) {
      completed.push(3)
    } else {
      missing.push(tutorialSteps[2].checkLabel)
    }

    // Step 4: スタッフ
    if (staffList && staffList.results.length > 0) {
      completed.push(4)
    } else {
      missing.push(tutorialSteps[3].checkLabel)
    }

    // Step 5: 予約設定
    if (reservationConfig) {
      completed.push(5)
    } else {
      missing.push(tutorialSteps[4].checkLabel)
    }

    // Step 6: スタッフ勤務スケジュール
    if (staffSchedules && staffSchedules.length > 0) {
      completed.push(6)
    } else {
      missing.push(tutorialSteps[5].checkLabel)
    }

    // Step 7: LINE連携
    if (apiConfig?.liff_id && apiConfig?.line_channel_secret && apiConfig?.line_access_token) {
      completed.push(7)
    } else {
      missing.push(tutorialSteps[6].checkLabel)
    }

    setCompletedSteps(completed)
    setMissingItems(missing)
  }, [
    org?.org.org_name,
    org?.config?.address,
    weekSchedules?.length,
    menus?.results.length,
    staffList?.results.length,
    reservationConfig?._id,
    staffSchedules?.length,
    apiConfig?.liff_id,
    apiConfig?.line_channel_secret,
    apiConfig?.line_access_token,
  ])

  const isStepCompleted = (stepId: number) => completedSteps.includes(stepId)
  const isAllRequiredStepsCompleted = () =>
    tutorialSteps.filter((s) => s.required).every((s) => isStepCompleted(s.id))

  const progress = (completedSteps.length / tutorialSteps.length) * 100

  const getReservationUrl = () => {
    if (!org?.org._id) return ''
    const baseUrl = window.location.origin
    return `${baseUrl}/reservation/${org.org._id}`
  }

  const copyReservationUrl = () => {
    const url = getReservationUrl()
    navigator.clipboard.writeText(url)
    toast.success('URLをコピーしました')
  }

  // Check if all data is loaded
  const isDataLoading =
    !ready ||
    org === undefined ||
    weekSchedules === undefined ||
    menus === undefined ||
    staffList === undefined ||
    reservationConfig === undefined ||
    apiConfig === undefined ||
    (staffList.results.length > 0 && staffSchedules === undefined)

  if (isDataLoading) {
    return <Loading />
  }

  return (
    <div className="container max-w-6xl mx-auto pb-8">
      {/* Alert for missing settings */}
      {missingItems.length > 0 && (
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>未設定の項目があります</AlertTitle>
          <AlertDescription>
            予約受付を開始するには、以下の設定を完了してください：
            <ul className="list-disc pl-5 mt-2">
              {missingItems.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {!isAllRequiredStepsCompleted() && (
        <>
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold mb-2">初期設定ガイド</h1>
                <p className="text-muted-foreground">
                  予約受付を開始するための設定状況を確認します
                </p>
              </div>
            </div>

            <Progress value={progress} className="h-2" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Step Cards */}
            {tutorialSteps.map((step) => {
              const Icon = step.icon
              const completed = isStepCompleted(step.id)

              return (
                <Card key={step.id} className={completed ? 'border-green-200' : ''}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                          {completed ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                          ) : (
                            <Circle className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            {step.title}
                          </CardTitle>
                          <CardDescription className="mt-1">{step.description}</CardDescription>
                        </div>
                      </div>
                      {step.required && (
                        <Badge variant="secondary" className="text-xs">
                          必須
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Link href={step.href}>
                      <Button variant={completed ? 'outline' : 'default'} className="w-full">
                        {completed ? '設定を確認' : '設定する'}
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </>
      )}

      {/* Completion Section */}
      {isAllRequiredStepsCompleted() && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-active">初期設定が完了しました！</CardTitle>
            <CardDescription className="text-muted-foreground">
              予約受付の準備が整いました。下記のURLをお客様に共有してください。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-background rounded-lg border border-border">
              <label className="text-sm font-medium">予約ページURL</label>
              <div className="flex items-center gap-2 mt-2">
                <input
                  value={getReservationUrl()}
                  readOnly
                  className="flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm font-mono focus:outline-none"
                />
                <Button size="icon" variant="outline" onClick={copyReservationUrl}>
                  <Copy className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="outline" asChild>
                  <a href={getReservationUrl()} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="border border-border bg-background">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">次のステップ</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-active mt-0.5" />
                      <span>
                        <Link
                          href="/dashboard/setting"
                          className="text-link-foreground hover:underline"
                        >
                          サロンの休業日の設定
                        </Link>
                        を設定
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-active mt-0.5" />
                      <span>
                        <Link
                          href="/dashboard/option"
                          className="text-link-foreground hover:underline"
                        >
                          オプションメニュー
                        </Link>
                        を追加
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-active mt-0.5" />
                      <span>
                        <Link
                          href="/dashboard/point"
                          className="text-link-foreground hover:underline"
                        >
                          ポイント機能
                        </Link>
                        を設定
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-active mt-0.5" />
                      <span>
                        <Link
                          href="/dashboard/coupon"
                          className="text-link-foreground hover:underline"
                        >
                          クーポン機能
                        </Link>
                        を設定
                      </span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="border border-border bg-link">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base text-link-foreground">
                    お客様への案内方法
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <Circle className="h-4 w-4 text-link-foreground mt-0.5" />
                      <span className="text-link-foreground">ホームページにリンクを掲載</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Circle className="h-4 w-4 text-link-foreground mt-0.5" />
                      <span className="text-link-foreground">SNSで予約開始をお知らせ</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Circle className="h-4 w-4 text-link-foreground mt-0.5" />
                      <span className="text-link-foreground">店内にQRコードを掲示</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
