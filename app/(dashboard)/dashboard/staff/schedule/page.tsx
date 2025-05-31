export default function StaffSchedulePage() {
  return <div>StaffSchedulePage</div>
}

// 'use client'

// import { Button } from '@/components/ui/button'
// import DashboardSection from '@/components/common/DashboardSection'
// import { useTenantAndOrganization } from '@/hooks/useTenantAndOrganization'
// import { api } from '@/convex/_generated/api'
// import { usePaginatedQuery, useMutation } from 'convex/react'

// import { Label } from '@/components/ui/label'
// import { Textarea } from '@/components/ui/textarea'
// import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
// import WeekScheduleForm from './WeekScheduleForm'
// import { toast } from 'sonner'
// import { Switch } from '@/components/ui/switch'
// import { convertHourToTimestamp } from '@/lib/schedules'
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from '@/components/ui/select'
// import { useState, useEffect } from 'react'
// import { Id } from '@/convex/_generated/dataModel'
// import { CalendarMultiSelect } from '@/components/common'
// import { fetchQuery } from 'convex/nextjs'
// import { format, compareAsc } from 'date-fns'
// import { ja } from 'date-fns/locale'
// import { Card, CardContent } from '@/components/ui/card'
// import { AlertCircle, Trash2 } from 'lucide-react'
// import { useErrorHandler } from '@/hooks/useErrorHandler'
// import {
//   Accordion,
//   AccordionContent,
//   AccordionItem,
//   AccordionTrigger,
// } from '@/components/ui/accordion'
// // 開始時間と終了時間を含む日付の型定義
// type DateWithTimes = {
//   date: Date
//   startTime?: string
//   endTime?: string
//   notes?: string
// }

// // 全時刻の配列 (10分刻み)
// const timeOptions = Array.from({ length: 24 }).flatMap((_, hour) =>
//   [0, 10, 20, 30, 40, 50].map((minute) => {
//     const hh = String(hour).padStart(2, '0')
//     const mm = String(minute).padStart(2, '0')
//     return `${hh}:${mm}`
//   })
// )

// // "HH:mm" 形式を分に変換
// const timeToMinutes = (time: string): number => {
//   const [h, m] = time.split(':').map(Number)
//   return h * 60 + m
// }

// const pageSize: number = 20

// export default function StaffSchedulePage() {
//   const { tenantId, orgId } = useTenantAndOrganization()
//   const [selectedStaffId, setSelectedStaffId] = useState<Id<'staff'> | null>(null)
//   const [selectedDates, setSelectedDates] = useState<Date[]>([])
//   const [isAllDay, setIsAllDay] = useState<{ [key: string]: boolean }>({})
//   // 日付と時間情報を保持する状態
//   const [dateTimeSettings, setDateTimeSettings] = useState<DateWithTimes[]>([])

//   const { results: staffs } = usePaginatedQuery(
//     api.staff.query.list,
//     tenantId && orgId ? { tenant_id: tenantId, org_id: orgId } : 'skip',
//     { initialNumItems: pageSize }
//   )
//   // 追加：週間設定用 state

//   // const upsertSchedules = useMutation(api.staff.exception_schedule.mutation.upsertSchedules)

//   // 時間設定を含めたスケジュール保存処理
//   const handleUpsertSchedules = async (): Promise<void> => {
//     // 終日でない場合、開始時間と終了時間の設定を必須にする
//     for (const item of dateTimeSettings) {
//       const allDay = isAllDay[item.date.toISOString()]
//       if (!allDay && (!item.startTime || !item.endTime)) {
//         toast.error('終日の予定ではない場合は開始時間と終了時間を設定してください')
//         return
//       }
//     }
//     try {
//       await upsertSchedules({
//         staff_id: selectedStaffId as Id<'staff'>,
//         salon_id: salonId as Id<'salon'>,
//         dates: dateTimeSettings.map((item) => ({
//           date: format(item.date, 'yyyy-MM-dd'),
//           start_time_unix: isAllDay[item.date.toISOString()]
//             ? convertHourToUnixTimestamp('00:00', item.date.toISOString())!
//             : item.startTime
//               ? convertHourToUnixTimestamp(item.startTime, item.date.toISOString())!
//               : 0,
//           end_time_unix: isAllDay[item.date.toISOString()]
//             ? convertHourToUnixTimestamp('00:00', item.date.toISOString())!
//             : item.endTime
//               ? convertHourToUnixTimestamp(item.endTime, item.date.toISOString())!
//               : 0,
//           notes: item.notes,
//           is_all_day: isAllDay[item.date.toISOString()] ? true : false,
//         })),
//         type: 'holiday',
//       })
//       toast.success('スタッフの予定を保存しました')
//     } catch (error) {
//       toast.error(handleErrorToMsg(error))
//     }
//   }

//   const handleNoteChange = (index: number, value: string): void => {
//     const newSettings = [...dateTimeSettings]
//     newSettings[index].notes = value
//     setDateTimeSettings(newSettings)
//   }

//   // 選択済みスケジュールを削除
//   const handleDelete = (index: number): void => {
//     // 日付・詳細設定両方から該当行を削除
//     const newDateTimeSettings = [...dateTimeSettings]
//     newDateTimeSettings.splice(index, 1)
//     setDateTimeSettings(newDateTimeSettings)

//     const newSelectedDates = [...selectedDates]
//     newSelectedDates.splice(index, 1)
//     setSelectedDates(newSelectedDates)
//   }

//   // 日付選択ごとに追加・削除を差分で反映する
//   useEffect(() => {
//     setIsAllDay((prev) => {
//       const next = { ...prev }
//       // 新しく追加された日付には false をセット
//       selectedDates.forEach((date) => {
//         const iso = date.toISOString()
//         if (!(iso in next)) {
//           next[iso] = false
//         }
//       })
//       // 選択解除された日付のキーを削除
//       Object.keys(next).forEach((key) => {
//         if (!selectedDates.find((d) => d.toISOString() === key)) {
//           delete next[key]
//         }
//       })
//       return next
//     })

//     setDateTimeSettings((prev) => {
//       const prevMap = new Map(prev.map((s) => [format(s.date, 'yyyy-MM-dd'), s]))
//       const nextSettings: DateWithTimes[] = selectedDates.map((date) => {
//         const key = format(date, 'yyyy-MM-dd')
//         if (prevMap.has(key)) {
//           return prevMap.get(key)!
//         }
//         // 新規日付は時間未設定で追加
//         return { date, startTime: undefined, endTime: undefined, notes: undefined }
//       })
//       return nextSettings
//     })
//   }, [selectedDates])

//   // スタッフ選択時の既存スケジュール取得処理
//   useEffect(() => {
//     if (salonId && selectedStaffId && staffs.length > 0) {
//       const fetchStaffSchedule = async (): Promise<void> => {
//         const staffSchedule = await fetchQuery(
//           api.schedule.staff_exception.query.findBySalonAndStaffId,
//           {
//             salonId: salonId as Id<'salon'>,
//             staffId: selectedStaffId as Id<'staff'>,
//           }
//         )

//         // 重複する日付を排除した設定を作成
//         const map = new Map<string, DateWithTimes>()
//         staffSchedule.forEach((schedule) => {
//           const startDate = new Date(schedule.startTimeUnix!)
//           const endDate = new Date(schedule.endTimeUnix!)
//           const iso = startDate.toISOString()
//           if (!map.has(iso)) {
//             map.set(iso, {
//               date: startDate,
//               startTime: format(startDate, 'HH:mm'),
//               endTime: format(endDate, 'HH:mm'),
//               notes: schedule.notes,
//             })
//           }
//         })
//         const uniqueSettings = Array.from(map.values()).sort((a, b) => compareAsc(a.date, b.date))
//         // fetched schedules include isAllDay, so initialize the all-day map
//         const allDayMap: { [key: string]: boolean } = {}
//         staffSchedule.forEach((schedule) => {
//           const iso = new Date(schedule.startTimeUnix!).toISOString()
//           allDayMap[iso] = !!schedule.isAllDay
//         })

//         console.log('staffSchedule: ', staffSchedule)
//         setIsAllDay(allDayMap)
//         setSelectedDates(uniqueSettings.map((s) => s.date))
//         setDateTimeSettings(uniqueSettings)
//       }

//       fetchStaffSchedule()
//     } else {
//       setSelectedDates([])
//       setDateTimeSettings([])
//     }
//   }, [selectedStaffId, salonId, staffs])

//   // 時間設定ハンドラ（開始時刻選択時は終了時刻を調整）
//   const handleTimeChange = (index: number, field: 'startTime' | 'endTime', value: string): void => {
//     const newSettings = [...dateTimeSettings]
//     if (field === 'startTime') {
//       newSettings[index].startTime = value
//       // 開始時刻以降の最初の時刻を終了時刻に設定
//       const nextOption = timeOptions.find((t) => timeToMinutes(t) > timeToMinutes(value))
//       newSettings[index].endTime = nextOption || value
//     } else {
//       newSettings[index].endTime = value
//     }
//     setDateTimeSettings(newSettings)
//   }

//   return (
//     <DashboardSection
//       title="スタッフの勤務管理"
//       backLink="/dashboard/staff"
//       backLinkTitle="スタッフ一覧"
//     >
//       <div className="space-y-3">
//         <div className="flex flex-col justify-end items-end gap-2">
//           <div className="w-fit min-w-[180px]">
//             <Label className="mb-2">予定を追加するスタッフ</Label>
//             <Select
//               value={selectedStaffId ?? ''}
//               onValueChange={(value) => setSelectedStaffId(value as Id<'staff'>)}
//             >
//               <SelectTrigger className="bg-secondary">
//                 <SelectValue placeholder="スタッフを選択" />
//               </SelectTrigger>
//               <SelectContent>
//                 {staffs.map((staff) => (
//                   <SelectItem key={staff._id} value={staff._id}>
//                     {staff.name}
//                   </SelectItem>
//                 ))}
//               </SelectContent>
//             </Select>
//           </div>
//         </div>

//         <div>
//           <Tabs defaultValue="week">
//             <TabsList className="mb-4 w-full max-w-[500px]">
//               <TabsTrigger value="week" className="w-full">
//                 週間スケジュール設定
//               </TabsTrigger>
//               <TabsTrigger value="holiday" className="w-full">
//                 スケジュール作成
//               </TabsTrigger>
//             </TabsList>
//             <TabsContent value="week">
//               {selectedStaffId ? (
//                 <WeekScheduleForm staffId={selectedStaffId} />
//               ) : (
//                 <div className="flex justify-start items-center h-32 p-4 bg-muted rounded-lg">
//                   <AlertCircle className="w-4 h-4 text-muted-foreground mr-2" />
//                   <p className="text-muted-foreground text-sm">先にスタッフを選択してください。</p>
//                 </div>
//               )}
//             </TabsContent>
//             <TabsContent value="holiday">
//               <div className="flex flex-col gap-4">
//                 <div>
//                   <CalendarMultiSelect
//                     fromDate={new Date()}
//                     disabled={!selectedStaffId}
//                     selectedDates={selectedDates}
//                     onDatesChangeAction={(dates) => {
//                       if (dates.length > 30) {
//                         toast.error('休日は最大30日までしか選択できません')
//                         return
//                       }
//                       const sortedDates = [...dates].sort(compareAsc)
//                       setSelectedDates(sortedDates)
//                     }}
//                   />
//                 </div>

//                 {/* 選択した日付ごとの時間設定セクション */}
//                 {dateTimeSettings.length > 0 && (
//                   <Card>
//                     <CardContent className="pt-6">
//                       <h3 className="text-base font-semibold mb-4">作成されたスケジュール</h3>

//                       <div className="space-y-4">
//                         {dateTimeSettings.map((setting, index) => (
//                           <div
//                             key={index}
//                             className="grid grid-cols-1 md:grid-cols-[1fr,2fr,2fr] gap-4 items-center border-b pb-4"
//                           >
//                             <div className="flex gap-2 items-center">
//                               <span className="text-base font-bold">
//                                 {format(setting.date, 'M月d日(EEE)', { locale: ja })}
//                               </span>
//                             </div>
//                             <div className="flex flex-col gap-2 items-start">
//                               <div className="flex gap-2 items-center mb-2">
//                                 <Label className="text-xs font-bold">終日</Label>
//                                 <Switch
//                                   checked={isAllDay[setting.date.toISOString()]}
//                                   onCheckedChange={() =>
//                                     setIsAllDay({
//                                       ...isAllDay,
//                                       [setting.date.toISOString()]:
//                                         !isAllDay[setting.date.toISOString()],
//                                     })
//                                   }
//                                 />
//                               </div>

//                               <div
//                                 className={`flex gap-2 w-full ${
//                                   isAllDay[setting.date.toISOString()]
//                                     ? 'opacity-50 pointer-events-none'
//                                     : ''
//                                 }`}
//                               >
//                                 <div className="w-full">
//                                   <Label
//                                     htmlFor={`start-time-${index}`}
//                                     className="mb-1 block text-xs"
//                                   >
//                                     開始時間
//                                   </Label>

//                                   <Select
//                                     value={setting.startTime ?? undefined}
//                                     onValueChange={(value) =>
//                                       handleTimeChange(index, 'startTime', value)
//                                     }
//                                   >
//                                     <SelectTrigger>
//                                       <SelectValue placeholder="開始時間" />
//                                     </SelectTrigger>
//                                     <SelectContent>
//                                       {timeOptions.map((time) => (
//                                         <SelectItem key={time} value={time}>
//                                           {time}
//                                         </SelectItem>
//                                       ))}
//                                     </SelectContent>
//                                   </Select>
//                                 </div>
//                                 <div className="w-full">
//                                   <Label
//                                     htmlFor={`end-time-${index}`}
//                                     className="mb-1 block text-xs"
//                                   >
//                                     終了時間
//                                   </Label>
//                                   <Select
//                                     value={setting.endTime}
//                                     onValueChange={(value) =>
//                                       handleTimeChange(index, 'endTime', value)
//                                     }
//                                     disabled={!setting.startTime}
//                                   >
//                                     <SelectTrigger>
//                                       <SelectValue placeholder="終了時間" />
//                                     </SelectTrigger>
//                                     <SelectContent>
//                                       {timeOptions
//                                         .filter(
//                                           (t) =>
//                                             timeToMinutes(t) >
//                                             timeToMinutes(setting.startTime ?? '')
//                                         )
//                                         .map((time) => (
//                                           <SelectItem key={time} value={time}>
//                                             {time}
//                                           </SelectItem>
//                                         ))}
//                                     </SelectContent>
//                                   </Select>
//                                 </div>
//                               </div>
//                             </div>
//                             <div className="w-full p-1">
//                               <div className="flex justify-between items-center">
//                                 <p className="text-sm font-medium">備考</p>
//                                 <Button
//                                   variant="destructive"
//                                   size="icon"
//                                   className="scale-75"
//                                   onClick={() => handleDelete(index)}
//                                 >
//                                   <Trash2 className="w-4 h-4" />
//                                 </Button>
//                               </div>
//                               <Textarea
//                                 rows={2}
//                                 id={`note-${index}`}
//                                 className="w-full"
//                                 value={setting.notes}
//                                 onChange={(e) => handleNoteChange(index, e.target.value)}
//                               />
//                             </div>
//                           </div>
//                         ))}
//                       </div>
//                     </CardContent>
//                   </Card>
//                 )}
//               </div>
//               <div className="flex justify-end mt-4">
//                 <Button
//                   onClick={handleUpsertSchedules}
//                   disabled={!selectedStaffId}
//                   className="w-full md:w-auto"
//                 >
//                   予定を保存
//                 </Button>
//               </div>
//             </TabsContent>
//           </Tabs>
//         </div>
//         <div className="mt-4">
//           <Accordion type="multiple">
//             <AccordionItem value="common">
//               <AccordionTrigger>スタッフの週間スケジュールについて</AccordionTrigger>
//               <AccordionContent className="space-y-4 text-sm leading-relaxed">
//                 <ol className="list-none space-y-2 text-muted-foreground">
//                   <strong className="text-warning-foreground">前提：サロンの営業日を確認</strong>
//                   <li className="bg-warning border border-warning-foreground p-2 text-warning-foreground rounded-md">
//                     先に「サロン営業日」を登録しておくと、スタッフ側では営業日だけが選択肢として表示されます。
//                     <br />
//                     スタッフの勤務日は <em>サロンが休業の日には設定できません</em>。
//                   </li>
//                   <li className="bg-muted text-muted-foreground p-2 rounded-md">
//                     <strong>勤務日にしたい曜日をクリック</strong>
//                     <br />
//                     グレー（休日）→ カラー（勤務日）に切り替わります。
//                     <br />
//                     勤務日が ON になった曜日だけが予約時のスタッフの選択肢に表示されます。
//                   </li>
//                   <li className="bg-muted text-muted-foreground p-2 rounded-md">
//                     <strong>共通勤務時間の有無を決める</strong>
//                     <br />
//                     「共通設定」を <em>ON</em> にすると、全勤務日に同じ時間帯を適用します。
//                     <br />
//                     OFF にすると曜日ごとに個別設定が可能です。
//                   </li>
//                   <li className="bg-muted text-muted-foreground p-2 rounded-md">
//                     <strong>時間を入力／選択</strong>
//                     <br />
//                     開始時刻を選ぶと、その時刻より後だけが終了時刻の候補に残ります。
//                   </li>
//                   <li className="bg-muted text-muted-foreground p-2 rounded-md">
//                     <strong>サロン営業時間との衝突ルール</strong>
//                     <br />
//                     開始時刻は <em>遅い方</em>、終了時刻は <em>早い方</em> が採用されます。
//                     <br />
//                     例：サロン&nbsp;09:00‑18:00, スタッフ&nbsp;08:30‑19:00 → 実際は&nbsp;
//                     <strong>09:00‑18:00</strong>。
//                   </li>
//                 </ol>

//                 <h4 className="font-semibold pt-2 text-muted-foreground">よくある質問</h4>
//                 <ul className="space-y-2 pl-4 list-disc text-muted-foreground">
//                   <li>
//                     <strong>勤務日を後から変更すると時間はどうなる？</strong>
//                     <br />
//                     新たに ON にした日は「共通設定 ON 時は共通時間」「OFF 時はデフォルト
//                     09:00‑17:00」が初期値になります。
//                   </li>
//                   <li>
//                     <strong>サロン営業日を変更したら？</strong>
//                     <br />
//                     休業日に切り替えた曜日は自動でスタッフ勤務日も OFF になります。
//                   </li>
//                   <li>
//                     <strong>24:00 を跨ぐシフトは？</strong>
//                     <br />
//                     現仕様では同日内で完結する時間のみ対応です。深夜帯シフトの機能追加までお待ちください。
//                   </li>
//                 </ul>
//               </AccordionContent>
//             </AccordionItem>
//             <AccordionItem value="guide">
//               <AccordionTrigger>スケジュール設定の使い方</AccordionTrigger>
//               <AccordionContent className="space-y-4 text-sm leading-relaxed">
//                 <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
//                   <li className="bg-muted text-muted-foreground p-2 rounded-md">
//                     <strong>スタッフを選択</strong>
//                     <br />
//                     上部のプルダウンから予定を登録したいスタッフを選びます。
//                   </li>
//                   <li className="bg-muted text-muted-foreground p-2 rounded-md">
//                     <strong>日付をカレンダーで選択</strong>
//                     <br />
//                     クリックするだけで複数日をまとめて指定できます。もう一度クリックすると解除されます。
//                   </li>
//                   <li className="bg-muted text-muted-foreground p-2 rounded-md">
//                     <strong>終日 or 時間帯を設定</strong>
//                     <br />
//                     「終日」スイッチを ON にするとその日は 24 時間受付停止、OFF
//                     の場合は開始・終了時刻を 10 分刻みで入力します。
//                   </li>
//                   <li className="bg-muted text-muted-foreground p-2 rounded-md">
//                     <strong>備考を入力（任意）</strong>
//                     <br />
//                     理由やメモを残すとチーム内で共有できます。
//                   </li>
//                   <li className="bg-muted text-muted-foreground p-2 rounded-md">
//                     <strong>保存</strong>
//                     <br />
//                     「予定を保存」を押すと即時反映。予約カレンダーから該当枠が非表示になります。
//                   </li>
//                 </ol>

//                 <h4 className="font-semibold pt-2 text-muted-foreground">よくある質問</h4>
//                 <ul className="space-y-2 pl-4  text-muted-foreground bg-muted p-2 rounded-md">
//                   <li>
//                     <strong>1日に複数のスケジュールを登録したい</strong>
//                     <br />
//                     現在は1日に1つのスケジュールしか登録できません。
//                   </li>
//                   <li>
//                     <strong>誤って作成したスケジュールを削除したい</strong>
//                     <br />
//                     カード右上のゴミ箱アイコンをクリックして非選択にして保存すると削除されます。
//                   </li>
//                 </ul>
//               </AccordionContent>
//             </AccordionItem>
//           </Accordion>
//         </div>
//       </div>
//     </DashboardSection>
//   )
// }
