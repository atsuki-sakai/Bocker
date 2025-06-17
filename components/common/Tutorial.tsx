'use client'

import { useState, useEffect, useMemo } from 'react'
import { usePaginatedQuery, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Loading } from '@/components/common'
import { AlertTitle } from '@/components/ui/alert'
import { BASE_URL } from '@/lib/constants'
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
import { Link } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'

interface TutorialStep {
  id: number
  titleKey: string
  descriptionKey: string
  icon: React.ElementType
  required: boolean
  href: string
  checkLabelKey: string
}

export const Tutorial = () => {
  const { tenantId, orgId, ready } = useTenantAndOrganization()
  const t = useTranslations('common.tutorial')

  // 翻訳キーのみを保持するチュートリアル手順をメモ化して無限再レンダリングを防止
  const tutorialSteps: TutorialStep[] = useMemo(
    () => [
      {
        id: 1,
        titleKey: 'steps.storeInfo.title',
        descriptionKey: 'steps.storeInfo.description',
        icon: Store,
        required: true,
        href: '/dashboard/setting',
        checkLabelKey: 'steps.storeInfo.checkLabel',
      },
      {
        id: 2,
        titleKey: 'steps.businessHours.title',
        descriptionKey: 'steps.businessHours.description',
        icon: Calendar,
        required: true,
        href: '/dashboard/setting',
        checkLabelKey: 'steps.businessHours.checkLabel',
      },
      {
        id: 3,
        titleKey: 'steps.reservationSettings.title',
        descriptionKey: 'steps.reservationSettings.description',
        icon: Clock,
        required: true,
        href: '/dashboard/setting',
        checkLabelKey: 'steps.reservationSettings.checkLabel',
      },
      {
        id: 4,
        titleKey: 'steps.lineIntegration.title',
        descriptionKey: 'steps.lineIntegration.description',
        icon: ExternalLink,
        required: true,
        href: '/dashboard/setting',
        checkLabelKey: 'steps.lineIntegration.checkLabel',
      },
      {
        id: 5,
        titleKey: 'steps.menuRegistration.title',
        descriptionKey: 'steps.menuRegistration.description',
        icon: Menu,
        required: true,
        href: '/dashboard/menu',
        checkLabelKey: 'steps.menuRegistration.checkLabel',
      },
      {
        id: 6,
        titleKey: 'steps.staffRegistration.title',
        descriptionKey: 'steps.staffRegistration.description',
        icon: Users,
        required: true,
        href: '/dashboard/staff/add',
        checkLabelKey: 'steps.staffRegistration.checkLabel',
      },
      {
        id: 7,
        titleKey: 'steps.staffSchedule.title',
        descriptionKey: 'steps.staffSchedule.description',
        icon: Calendar,
        required: true,
        href: '/dashboard/staff/schedule',
        checkLabelKey: 'steps.staffSchedule.checkLabel',
      },
    ],
    []
  )
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
      missing.push(t(tutorialSteps[0].checkLabelKey))
    }

    // Step 2: 営業時間
    if (weekSchedules && weekSchedules.length > 0) {
      completed.push(2)
    } else {
      missing.push(t(tutorialSteps[1].checkLabelKey))
    }

    // Step 3: 予約設定
    if (reservationConfig) {
      completed.push(3)
    } else {
      missing.push(t(tutorialSteps[2].checkLabelKey))
    }

    // Step 4: LINE連携
    if (apiConfig?.liff_id && apiConfig?.line_channel_secret && apiConfig?.line_access_token) {
      completed.push(4)
    } else {
      missing.push(t(tutorialSteps[3].checkLabelKey))
    }

    // Step 5: メニュー
    if (menus && menus.results.length > 0) {
      completed.push(5)
    } else {
      missing.push(t(tutorialSteps[4].checkLabelKey))
    }

    // Step 6: スタッフ
    if (staffList && staffList.results.length > 0) {
      completed.push(6)
    } else {
      missing.push(t(tutorialSteps[5].checkLabelKey))
    }

    // Step 7: スタッフ勤務スケジュール
    if (staffSchedules && staffSchedules.length > 0) {
      completed.push(7)
    } else {
      missing.push(t(tutorialSteps[6].checkLabelKey))
    }

    setCompletedSteps(completed)
    setMissingItems(missing)
  }, [
    org,
    weekSchedules,
    menus?.results.length,
    staffList?.results.length,
    reservationConfig,
    staffSchedules,
    apiConfig,
    t,
  ])

  const isStepCompleted = (stepId: number) => completedSteps.includes(stepId)
  const isAllRequiredStepsCompleted = () =>
    tutorialSteps.filter((s) => s.required).every((s) => isStepCompleted(s.id))

  const progress = (completedSteps.length / tutorialSteps.length) * 100

  const getOrganizationUrl = (type: 'reservation' | 'customer') => {
    if (!org?.org._id) return ''
    if (type === 'reservation') {
      return `${BASE_URL}/reservation/${org.org._id}`
    } else if (type === 'customer') {
      return `${BASE_URL}/customer/${org.org._id}/auth/login`
    } else {
      return ''
    }
  }

  const copyOrganizationUrl = (type: 'reservation' | 'customer') => {
    const url = getOrganizationUrl(type)
    navigator.clipboard.writeText(url)
    toast.success(t('urlCopied'))
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
      {!isAllRequiredStepsCompleted() && (
        <>
          <div className="mb-6 bg-neon-foreground p-4 rounded-lg border border-neon">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold mb-2 text-neon">{t('setupGuide.title')}</h1>
                <p className="text-muted-foreground text-sm">{t('setupGuide.subtitle')}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <Progress value={progress} className="h-2 w-full" />
              <span className="text-sm font-bold text-nowrap px-2">
                {progress.toFixed(0)}%
                <span className="text-muted-foreground font-light ml-1 text-xs">
                  {t('completed')}
                </span>
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4">
            {/* Step Cards */}
            {tutorialSteps.map((step, index) => {
              const Icon = step.icon
              const completed = isStepCompleted(step.id)

              return (
                <Card
                  key={step.id}
                  className={`${completed ? 'border-accent-2 border' : 'border-destructive border'}`}
                >
                  <div className="relative p-2 pt-8 flex flex-col justify-center items-center w-full">
                    <div
                      className={`${
                        completed
                          ? 'bg-accent-2-foreground text-accent-2 border-accent-2'
                          : 'bg-destructive-foreground text-destructive border-destructive'
                      } absolute top-1 left-1 rounded-full px-2 py-1 flex items-center justify-center`}
                    >
                      <div className="text-xs">
                        {completed ? (
                          <div className="flex items-center gap-2 font-bold">
                            <CheckCircle2 className="h-4 w-4" />
                            {t('stepCompleted', { step: index + 1 })}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 font-bold">
                            {t('stepIncomplete', { step: index + 1 })}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-start justify-center">
                      <div className="flex items-center justify-center gap-2">
                        <div>
                          <div className="text-sm font-bold mt-2 flex items-center gap-1">
                            <Icon className="min-h-4 min-w-4 max-h-4 max-w-4 text-accent" />
                            {t(step.titleKey)}
                          </div>
                          <div className="mt-2 text-xs text-muted-foreground">
                            {t(step.descriptionKey)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <CardContent className="p-2">
                    <Link href={step.href} className="w-full">
                      <Button
                        variant={completed ? 'default' : 'destructive'}
                        className="w-full text-sm"
                      >
                        {completed ? t('checkSettings') : t('configure')}
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              )
            })}

            {missingItems.length > 0 && missingItems.length < 3 && (
              <Card className="bg-warning border-warning-foreground text-warning-foreground">
                <CardHeader className="flex items-center gap-2">
                  <AlertTitle className="flex items-center gap-2 text-warning-foreground font-bold">
                    <AlertCircle className="h-5 w-5 !text-warning-foreground" />
                    {t('missingItems.title')}
                  </AlertTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs">{t('missingItems.description')}</p>
                  <ul className="list-disc pl-5 mt-2">
                    {missingItems.map((item, index) => (
                      <li key={index} className="text-sm font-bold">
                        {item}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        </>
      )}

      {/* Completion Section */}
      {isAllRequiredStepsCompleted() && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-accent-2">{t('completion.title')}</CardTitle>
            <CardDescription className="text-muted-foreground">
              {t('completion.description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-background rounded-lg border border-border">
              <label className="text-sm font-medium">{t('completion.reservationUrlLabel')}</label>
              <div className="flex items-center gap-2 mt-2">
                <input
                  value={getOrganizationUrl('reservation')}
                  readOnly
                  className="flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm font-mono focus:outline-none"
                />
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => copyOrganizationUrl('reservation')}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="outline" asChild>
                  <a
                    href={getOrganizationUrl('reservation')}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>
            <div className="p-4 bg-background rounded-lg border border-border">
              <label className="text-sm font-medium">{t('completion.customerUrlLabel')}</label>
              <div className="flex items-center gap-2 mt-2">
                <input
                  value={getOrganizationUrl('customer')}
                  readOnly
                  className="flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm font-mono focus:outline-none"
                />
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => copyOrganizationUrl('customer')}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="outline" asChild>
                  <a
                    href={getOrganizationUrl('customer')}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="border border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{t('nextSteps.title')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-accent-2 mt-0.5" />
                      <span>
                        <Link href="/dashboard/setting" className="text-accent-2 hover:underline">
                          {t('nextSteps.items.closedDays')}
                        </Link>
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-accent-2 mt-0.5" />
                      <span>
                        <Link href="/dashboard/option" className="text-accent-2 hover:underline">
                          {t('nextSteps.items.optionMenu')}
                        </Link>
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-accent-2 mt-0.5" />
                      <span>
                        <Link href="/dashboard/point" className="text-accent-2 hover:underline">
                          {t('nextSteps.items.pointFeature')}
                        </Link>
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-accent-2 mt-0.5" />
                      <span>
                        <Link href="/dashboard/coupon" className="text-accent-2 hover:underline">
                          {t('nextSteps.items.couponFeature')}
                        </Link>
                      </span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="border border-link-foreground bg-link">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base text-link-foreground">
                    {t('customerGuidance.title')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <Circle className="h-4 w-4 text-link-foreground mt-0.5" />
                      <span className="text-link-foreground">
                        {t('customerGuidance.items.website')}
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Circle className="h-4 w-4 text-link-foreground mt-0.5" />
                      <span className="text-link-foreground">
                        {t('customerGuidance.items.sns')}
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Circle className="h-4 w-4 text-link-foreground mt-0.5" />
                      <span className="text-link-foreground">
                        {t('customerGuidance.items.qrCode')}
                      </span>
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
