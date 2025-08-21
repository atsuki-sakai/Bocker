'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { DateRange } from 'react-day-picker'
import { CalendarIcon, BarChart3, TrendingUp, Users, MousePointer } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { format, subDays } from 'date-fns'
import { ja } from 'date-fns/locale'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts'

interface TrackingData {
  summary: {
    totalEvents: number
    totalSessions: number
    totalConversions: number
    conversionRate: number
  }
  dailyData: Array<{
    date: string
    events: number
    sessions: number
    conversions: number
  }>
  dimensionData: Array<{
    value: string
    events: number
    sessions: number
    conversions: number
  }>
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1', '#d084d0', '#87d068', '#ffb347']

const dimensionTypes = [
  { value: 'utm_source', label: '流入元 (UTM Source)' },
  { value: 'utm_medium', label: 'メディア (UTM Medium)' },
  { value: 'utm_campaign', label: 'キャンペーン (UTM Campaign)' },
  { value: 'page_url', label: 'ページURL' }
]

export default function TrackingDashboard() {
  const [data, setData] = useState<TrackingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [dimensionType, setDimensionType] = useState('utm_source')
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date()
  })

  const fetchData = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        dimensionType,
        startDate: dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : '',
        endDate: dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : ''
      })

      const response = await fetch(`/api/tracking/summaries?${params}`)
      if (response.ok) {
        const result = await response.json()
        setData(result)
      } else {
        console.error('Failed to fetch tracking data')
      }
    } catch (error) {
      console.error('Error fetching tracking data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [dimensionType, dateRange])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground">データを読み込み中...</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">データを取得できませんでした</p>
        <Button onClick={fetchData} className="mt-4">
          再試行
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー・フィルター */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">トラッキング分析</h1>
          <p className="text-muted-foreground">顧客獲得とWebサイト分析ダッシュボード</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <Select value={dimensionType} onValueChange={setDimensionType}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {dimensionTypes.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[240px] justify-start text-left font-normal",
                  !dateRange && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "MM/dd", { locale: ja })} -{" "}
                      {format(dateRange.to, "MM/dd", { locale: ja })}
                    </>
                  ) : (
                    format(dateRange.from, "MM/dd", { locale: ja })
                  )
                ) : (
                  <span>日付を選択</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={2}
                locale={ja}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* サマリーカード */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総イベント数</CardTitle>
            <MousePointer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.totalEvents.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ユニークセッション</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.totalSessions.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">コンバージョン数</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.totalConversions.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">コンバージョン率</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.conversionRate}%</div>
          </CardContent>
        </Card>
      </div>

      {/* チャート */}
      <Tabs defaultValue="timeline" className="space-y-4">
        <TabsList>
          <TabsTrigger value="timeline">時系列推移</TabsTrigger>
          <TabsTrigger value="breakdown">分布分析</TabsTrigger>
          <TabsTrigger value="comparison">比較分析</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>日別トレンド</CardTitle>
              <CardDescription>
                イベント数、セッション数、コンバージョン数の推移
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={data.dailyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(value) => format(new Date(value), 'MM/dd')}
                  />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(value) => format(new Date(value), 'yyyy/MM/dd')}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="events" 
                    stroke="#8884d8" 
                    name="イベント数"
                    strokeWidth={2}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="sessions" 
                    stroke="#82ca9d" 
                    name="セッション数"
                    strokeWidth={2}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="conversions" 
                    stroke="#ffc658" 
                    name="コンバージョン数"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="breakdown" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>
                  {dimensionTypes.find(t => t.value === dimensionType)?.label}別分布
                </CardTitle>
                <CardDescription>イベント数による円グラフ</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={data.dimensionData.slice(0, 6)}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="events"
                      label={({ value, events }) => `${value} (${events})`}
                    >
                      {data.dimensionData.slice(0, 6).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>トップ10ランキング</CardTitle>
                <CardDescription>イベント数順</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.dimensionData} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis 
                      type="category" 
                      dataKey="value" 
                      width={80}
                      tickFormatter={(value) => 
                        value.length > 10 ? value.substring(0, 10) + '...' : value
                      }
                    />
                    <Tooltip />
                    <Bar dataKey="events" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="comparison" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>メトリクス比較</CardTitle>
              <CardDescription>
                {dimensionTypes.find(t => t.value === dimensionType)?.label}別の詳細比較
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={data.dimensionData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="value"
                    tickFormatter={(value) => 
                      value.length > 8 ? value.substring(0, 8) + '...' : value
                    }
                  />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="events" fill="#8884d8" name="イベント数" />
                  <Bar dataKey="sessions" fill="#82ca9d" name="セッション数" />
                  <Bar dataKey="conversions" fill="#ffc658" name="コンバージョン数" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}