'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Button } from '@/components/ui/button'
import { Doc, Id } from '@/convex/_generated/dataModel'
import { toast } from 'sonner'
import { Loading } from '@/components/common'
import { format, startOfToday } from 'date-fns'
import { ja } from 'date-fns/locale'
import { Save } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion'
import { useErrorHandler } from '@/hooks/useErrorHandler'
import { Loader2 } from 'lucide-react'
import { useTenantAndOrganization } from '@/hooks/useTenantAndOrganization'
// カスタムカレンダーコンポーネントをインポート
import CalendarMultiSelect from '@/components/common/CalendarMultiSelect'

// 日付をフォーマットするユーティリティ関数
const formatDate = (date: Date): string => {
  return format(date, 'yyyy年M月d日(E)', { locale: ja })
}

export default function OrgExceptionScheduleForm() {
  const { tenantId, orgId, isLoaded } = useTenantAndOrganization()
  const { showErrorToast } = useErrorHandler()
  const [selectedDates, setSelectedDates] = useState<Date[]>([])
  const [isSaving, setIsSaving] = useState<boolean>(false)
  // 変更検知用の初期日付配列とダーティフラグ
  const [initialDates, setInitialDates] = useState<string[] | null>(null)
  const [isDirty, setIsDirty] = useState(false)

  // 初期データロード完了フラグ
  const initialDataLoaded = useRef<boolean>(false)

  // 今日の日付を取得（時刻は00:00:00に設定）- メモ化
  const today = useMemo(() => startOfToday(), [])

  // 既存の休業日を取得
  const exceptionSchedules = useQuery(
    api.organization.exception_schedule.query.getByScheduleList,
    tenantId && orgId
      ? {
          tenant_id: tenantId,
          org_id: orgId,
          type: 'holiday',
        }
      : 'skip'
  )

  // データロード中かどうか
  const isLoading = exceptionSchedules === undefined

  // 休業日を登録するミューテーション
  const addExceptionSchedule = useMutation(api.organization.exception_schedule.mutation.create)
  // 休業日を削除するミューテーション
  const killExceptionSchedule = useMutation(api.organization.exception_schedule.mutation.kill)

  // 初期表示時のみ既存の休業日をカレンダーに設定（今日以降の日付のみ）
  useEffect(() => {
    // 初期データロード済み、または保存中は処理しない
    if (initialDataLoaded.current || isSaving) {
      return
    }

    // データがロードされたら初期化処理
    if (exceptionSchedules !== undefined) {
      if (exceptionSchedules && exceptionSchedules.length > 0) {
        // 文字列の日付をDateオブジェクトに変換し、今日以降の日付のみを選択
        const dates = exceptionSchedules
          .map((schedule: Doc<'exception_schedule'>) => new Date(schedule.date))
          .filter((date: Date) => date >= today) // 今日以降の日付のみ
        setSelectedDates(dates)
      } else {
        // 休業日が0件の場合は空配列をセット
        setSelectedDates([])
      }

      // 初期日付リストを文字列化してソートして保存
      const formatted = (exceptionSchedules || [])
        .map((s) => format(new Date(s.date), 'yyyy-MM-dd'))
        .filter((d) => d >= format(today, 'yyyy-MM-dd'))
        .sort()
      setInitialDates(formatted)

      // 初期データロード完了をマーク
      initialDataLoaded.current = true
    }
  }, [exceptionSchedules, today, isSaving])

  // 選択日付の変更検知
  useEffect(() => {
    if (initialDates) {
      const current = selectedDates.map((date) => format(date, 'yyyy-MM-dd')).sort()
      setIsDirty(JSON.stringify(initialDates) !== JSON.stringify(current))
    }
  }, [selectedDates, initialDates])

  // 日付選択時の処理 - コールバック関数化
  const handleDatesChange = useCallback((dates: Date[]) => {
    if (dates.length > 30) {
      toast.error('休業日は最大30日までしか選択できません')
      return
    }
    setSelectedDates(dates)
  }, [])

  // 選択された日付を保存
  const handleSave = useCallback(
    async (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault()
      // 非同期処理を内部で実行
      const saveData = async () => {
        try {
          setIsSaving(true)

          // 登録済みの日付を特定（IDと日付の対応を取得）
          const existingDates: Map<string, Id<'exception_schedule'>> = exceptionSchedules
            ? new Map(exceptionSchedules.map((s) => [s.date, s._id]))
            : new Map()

          // 選択されている日付の書式を統一
          const selectedFormattedDates = selectedDates.map((date) => format(date, 'yyyy-MM-dd'))

          // 新規追加する日付を収集
          const datesToAdd: Array<{
            tenant_id: Id<'tenant'>
            org_id: Id<'organization'>
            type: 'holiday'
            date: string
          }> = []
          for (const date of selectedDates) {
            const formattedDate = format(date, 'yyyy-MM-dd')
            if (!existingDates.has(formattedDate) && tenantId && orgId) {
              datesToAdd.push({
                tenant_id: tenantId,
                org_id: orgId,
                type: 'holiday' as const,
                date: formattedDate,
              })
            }
          }

          // 削除する日付を収集
          const idsToDelete: Id<'exception_schedule'>[] = []
          if (exceptionSchedules) {
            for (const schedule of exceptionSchedules) {
              const scheduleDate = new Date(schedule.date)
              if (scheduleDate >= today && !selectedFormattedDates.includes(schedule.date)) {
                idsToDelete.push(schedule._id)
              }
            }
          }

          // 追加処理を並列実行
          if (datesToAdd.length > 0) {
            await Promise.all(datesToAdd.map((data) => addExceptionSchedule(data)))
          }

          // 削除処理を並列実行
          if (idsToDelete.length > 0) {
            await Promise.all(
              idsToDelete.map((id) =>
                killExceptionSchedule({
                  exceptionScheduleId: id as Id<'exception_schedule'>,
                })
              )
            )
          }

          // 成功通知
          toast.success('休業日を保存しました', {
            description: `${datesToAdd.length}日追加・${idsToDelete.length}日削除しました`,
            duration: 3000,
          })
        } catch (error: unknown) {
          console.error('休業日の保存に失敗しました', error)
          showErrorToast(error)
        }
      }

      // 非同期処理を実行
      await saveData()
      setIsSaving(false)
    },
    [
      selectedDates,
      exceptionSchedules,
      addExceptionSchedule,
      killExceptionSchedule,
      tenantId,
      orgId,
      today,
      showErrorToast,
    ]
  )

  if (exceptionSchedules === undefined) {
    return <Loading />
  }
  if (!isLoaded) {
    return <Loading />
  }

  return (
    <div className="w-full px-2 sm:px-4 md:px-0">
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <h4 className="text-2xl font-bold text-primary">休業日設定</h4>
        </div>
        <div>
          <p className="text-xs sm:text-sm mt-1 text-muted-foreground">
            カレンダーから予約を受け付けない日を選択してください。選択された日は休業日として設定されます。
          </p>
        </div>
      </div>

      <div className=" space-y-4 sm:space-y-6">
        {/* カレンダーとリスト表示のグリッドレイアウト */}
        <div className="w-full">
          <div className="bg-background rounded-lg border shadow-sm p-3 sm:p-4">
            <h3 className="text-sm sm:text-base font-semibold flex items-center gap-1.5 sm:gap-2 mb-3 sm:mb-4 text-primary">
              休業日を選択
            </h3>

            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-64 sm:h-72 w-full bg-muted" />
              </div>
            ) : (
              <div className="max-w-full">
                <CalendarMultiSelect
                  selectedDates={selectedDates}
                  onDatesChangeAction={handleDatesChange}
                  fromDate={today} // 今日以降の日付のみ選択可能に
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-background border-t p-3 sm:p-4 flex justify-end items-center flex-wrap gap-2">
        <Button
          onClick={handleSave}
          disabled={!isDirty || isSaving}
          className="shadow-md text-xs sm:text-sm"
          size="default"
          // モバイル向けにサイズを調整
          style={{
            minWidth: 'max-content',
            padding: window.innerWidth < 640 ? '0.5rem 0.75rem' : undefined,
          }}
        >
          {isSaving ? (
            <>
              <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-1.5 animate-spin" />
              保存中...
            </>
          ) : (
            <>
              <Save className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-1.5" />
              休業日を保存
            </>
          )}
        </Button>
      </div>
      <Accordion type="multiple">
        <AccordionItem value="business-days">
          <AccordionTrigger>休業日設定について</AccordionTrigger>
          <AccordionContent className="text-sm text-muted-foreground space-y-4">
            <p>
              休業日に設定した日は、カレンダーに表示されず予約を受け付けなくなります。
              定休日とは別に、臨時休業やイベント日、長期休暇などを設定でき、臨時の休業日を設定できます。
              <span className="font-bold">{formatDate(today)}</span>以降の日付が選択可能です。
              <br />
              {/* 休業日は期日を過ぎると自動的に削除されます。 */}
            </p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  )
}
