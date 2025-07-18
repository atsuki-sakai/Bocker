'use client'

import { useEffect, useMemo } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Loading } from '@/components/common'
import { AlertTitle } from '@/components/ui/alert'

import {
  CheckCircle2,
  Clock,
  Store,
  Calendar,
  Menu,
  Users,
  AlertCircle,
  ChevronRight,
} from 'lucide-react'
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
  const { tenantId, orgId, ready, subscription } = useTenantAndOrganization()
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
        titleKey: 'steps.menuRegistration.title',
        descriptionKey: 'steps.menuRegistration.description',
        icon: Menu,
        required: true,
        href: '/dashboard/menu',
        checkLabelKey: 'steps.menuRegistration.checkLabel',
      },
      {
        id: 5,
        titleKey: 'steps.staffRegistration.title',
        descriptionKey: 'steps.staffRegistration.description',
        icon: Users,
        required: true,
        href: '/dashboard/staff/add',
        checkLabelKey: 'steps.staffRegistration.checkLabel',
      },
      {
        id: 6,
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

  // 統合されたチュートリアル状態取得
  const tutorialStatus = useQuery(
    api.organization.tutorial.query.checkTutorialStatus,
    tenantId && orgId && ready
      ? {
          tenant_id: tenantId,
          org_id: orgId,
        }
      : 'skip'
  )

  // チュートリアル完了ミューテーション
  const completeTutorial = useMutation(api.organization.tutorial.mutation.completeTutorial)

  // チュートリアル完了時の処理
  useEffect(() => {
    if (tutorialStatus && !tutorialStatus.tutorialEnd && tutorialStatus.completedSteps.length === tutorialSteps.length) {
      // 全ステップ完了時にフラグを更新
      completeTutorial({
        tenant_id: tenantId!,
        org_id: orgId!,
      }).catch(console.error)
    }
  }, [tutorialStatus, tutorialSteps.length, completeTutorial, tenantId, orgId])

  const isStepCompleted = (stepId: number) => tutorialStatus?.completedSteps.includes(stepId) || false
  const isAllRequiredStepsCompleted = () =>
    tutorialSteps.filter((s) => s.required).every((s) => isStepCompleted(s.id))

  const progress = tutorialStatus ? (tutorialStatus.completedSteps.length / tutorialSteps.length) * 100 : 0

  // チュートリアル完了済みまたはデータ未ロードの場合
  if (!ready || !tutorialStatus) {
    return <Loading />
  }

  // チュートリアル完了済みの場合は何も表示しない
  if (tutorialStatus.tutorialEnd) {
    return null
  }
  return (
    <div
      className={`${subscription && (subscription.status === 'active' || subscription.status === 'trialing') ? 'container max-w-6xl mx-auto' : ' blur-sm pointer-events-none select-none'}`}
    >
      {!isAllRequiredStepsCompleted() && (
        <>
          <div className="my-6 p-4 rounded-lg border border-neon">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold mb-2 text-neon">{t('setupGuide.title')}</h1>
                <p className="text-muted-foreground text-sm">{t('setupGuide.subtitle')}</p>
                <div className="p-2 rounded-md bg-accent-2-foreground text-accent-2  mt-2">
                  <span className="font-semibold text-xs md:text-sm tracking-wide">
                    {t('setupGuide.subtitle2')}
                  </span>
                </div>
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
          <div className="grid grid-cols-2 md:grid-cols-3  xl:grid-cols-6 gap-2 md:gap-4">
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
                    <div className="flex items-start justify-center h-full">
                      <div className="flex items-center justify-center gap-2">
                        <div className="h-full">
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

            {tutorialStatus.missingItems.length > 0 && tutorialStatus.missingItems.length < 3 && (
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
                    {tutorialStatus.missingItems.map((item, index) => (
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
    </div>
  )
}
