'use client'

import { useEffect, useState } from 'react'
import { getCookie } from '@/lib/utils'
import { LINE_LOGIN_SESSION_KEY } from '@/services/line/constants'
import { api } from '@/convex/_generated/api'
import { fetchQuery } from 'convex/nextjs'
import { Doc, Id } from '@/convex/_generated/dataModel'
import { Loading } from '@/components/common'
import { MenuView } from './_components'

export default function CalendarPage() {
  // STATES
  const [salonComplete, setSalonComplete] = useState<{
    salon: Partial<Doc<'salon'>>
    config: Partial<Doc<'salon_config'>>
    scheduleConfig: Partial<Doc<'salon_schedule_config'>>
    apiConfig: Partial<Doc<'salon_api_config'>>
  } | null>(null)
  const [selectedMenus, setSelectedMenus] = useState<Doc<'menu'>[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // FUNCTIONS
  const fetchSalonComplete = () => {
    const cookie = getCookie(LINE_LOGIN_SESSION_KEY)
    const cookieJson = cookie ? JSON.parse(cookie) : null
    if (cookieJson?.salonId) {
      const fetchSalon = async () => {
        try {
          setIsLoading(true)
          const { salon, config, apiConfig, scheduleConfig } = await fetchQuery(
            api.salon.core.query.getRelations,
            { id: cookieJson.salonId as Id<'salon'> }
          )
          setSalonComplete(
            config && apiConfig && scheduleConfig
              ? { salon, config, apiConfig, scheduleConfig }
              : null
          )
        } catch (error) {
          console.error('サロン情報の取得に失敗しました:', error)
          setSalonComplete(null)
        } finally {
          setIsLoading(false)
        }
      }
      fetchSalon()
    } else {
      console.warn('セッションにsalonIdが見つかりません')
      setSalonComplete(null)
      setIsLoading(false)
    }
  }

  // USE EFFECT
  useEffect(() => {
    fetchSalonComplete()
  }, [])

  if (isLoading) return <Loading />

  console.log('selectedMenus: ', selectedMenus)

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <div>
          <h2 className="text-xl">メニューを選択</h2>
        </div>
        <div>
          <p className="text-gray-600 mb-4">
            予約したいメニューを選択してください。複数選択可能です。
          </p>

          {salonComplete?.salon._id ? (
            <MenuView
              salonId={salonComplete.salon._id as Id<'salon'>}
              selectedMenuIds={selectedMenus.map((menu) => menu._id)}
              onChangeMenusAction={(menus) => setSelectedMenus(menus)}
            />
          ) : (
            <div className="p-4 bg-yellow-50 text-yellow-700 rounded-md">
              サロン情報が取得できませんでした。ページを再読み込みするか、後ほど再度お試しください。
            </div>
          )}
        </div>
      </div>

      {/* {selectedMenus.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t shadow-md">
          <div className="container mx-auto flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-600">選択中: {selectedMenus.length}メニュー</p>
              <p className="font-bold">
                合計: ¥
                {selectedMenus
                  .reduce((sum, menu) => sum + (menu.salePrice || menu.unitPrice || 0), 0)
                  .toLocaleString()}
              </p>
            </div>
            <Button size="lg">日時を選択する</Button>
          </div>
        </div>
      )} */}
    </div>
  )
}
