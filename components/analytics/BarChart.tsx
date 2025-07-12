"use client";

import React from 'react';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChartDataPoint } from '@/services/supabase/repositories/analytics/types';

interface BarChartProps {
  data: BarChartDataPoint[];
  title?: string;
  description?: string;
  height?: number;
  showLegend?: boolean;
  showGrid?: boolean;
  barColors?: string[];
  className?: string;
  valueFormatter?: (value: number) => string;
  labelFormatter?: (label: string) => string;
  horizontal?: boolean;
  maxBars?: number;
}

/**
 * カスタムツールチップコンポーネント
 */
const CustomTooltip = ({
  active,
  payload,
  label = '',
  valueFormatter = (value: number) => `¥${value.toLocaleString()}`,
  labelFormatter = (label: string) => label,
}: {
  active?: boolean
  payload?: any[] // eslint-disable-line @typescript-eslint/no-explicit-any
  label?: string | number
  valueFormatter: (value: number) => string
  labelFormatter: (label: string) => string
}) => {
  if (!active || !payload || !payload.length) return null

  const data = payload[0]?.payload

  return (
    <div className="bg-card border border-border rounded-lg shadow-lg p-3">
      <p className="text-sm font-medium text-foreground mb-2">
        {labelFormatter ? labelFormatter(label as string) : label}
      </p>
      <div className="space-y-1">
        <p className="text-sm" style={{ color: payload[0]?.color }}>
          <span className="font-medium">売上: </span>
          {valueFormatter
            ? valueFormatter(payload[0]?.value)
            : `¥${payload[0]?.value.toLocaleString()}`}
        </p>
        {data?.bookingCount !== undefined && (
          <p className="text-sm text-muted-foreground">
            <span className="font-medium">予約数: </span>
            {data.bookingCount}件
          </p>
        )}
      </div>
    </div>
  )
}

/**
 * 棒グラフコンポーネント
 * カテゴリ別データの比較表示に使用
 */
export function BarChart({
  data,
  title,
  description,
  height = 300,
  showLegend = false,
  showGrid = true,
  barColors,
  className = '',
  valueFormatter,
  labelFormatter,
  horizontal = false,
  maxBars = 10,
}: BarChartProps) {
  // デフォルトの色パレット（HEXカラー）
  const defaultColors = [
    '#3b82f6',
    '#10b981',
    '#f59e0b',
    '#ef4444',
    '#8b5cf6',
    '#06b6d4',
    '#84cc16',
    '#f97316',
    '#ec4899',
    '#6366f1',
  ]

  const colors = barColors || defaultColors

  // データを制限（必要に応じて）
  const limitedData = maxBars ? data.slice(0, maxBars) : data

  // データが空の場合の表示
  if (!limitedData || limitedData.length === 0) {
    return (
      <Card className={className}>
        {(title || description) && (
          <CardHeader>
            {title && <CardTitle className="text-lg">{title}</CardTitle>}
            {description && (
              <CardDescription className="text-sm text-muted-foreground">
                {description}
              </CardDescription>
            )}
          </CardHeader>
        )}
        <CardContent>
          <div
            className="flex items-center justify-center text-muted-foreground bg-muted/20 rounded-lg"
            style={{ height: `${height}px` }}
          >
            <p className="text-sm">データがありません</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // 横向きの場合のマージン調整
  const margin = horizontal
    ? { top: 20, right: 30, left: 80, bottom: 20 }
    : { top: 20, right: 30, left: 20, bottom: 60 }

  return (
    <Card className={className}>
      {(title || description) && (
        <CardHeader>
          {title && <CardTitle className="text-lg">{title}</CardTitle>}
          {description && (
            <CardDescription className="text-sm text-muted-foreground">
              {description}
            </CardDescription>
          )}
        </CardHeader>
      )}
      <CardContent>
        <div style={{ width: '100%', height: `${height}px` }}>
          <ResponsiveContainer width="100%" height="100%">
            <RechartsBarChart
              data={limitedData}
              layout={horizontal ? 'vertical' : undefined}
              margin={margin}
            >
              {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />}

              {horizontal ? (
                <>
                  <XAxis
                    type="number"
                    tick={{ fontSize: 12, fill: '#374151' }}
                    axisLine={{ stroke: '#d1d5db' }}
                    tickLine={{ stroke: '#d1d5db' }}
                    tickFormatter={(value) => `¥${value.toFixed(0)}`}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 12, fill: '#374151' }}
                    axisLine={{ stroke: '#d1d5db' }}
                    tickLine={{ stroke: '#d1d5db' }}
                    width={70}
                  />
                </>
              ) : (
                <>
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 12, fill: '#374151' }}
                    axisLine={{ stroke: '#d1d5db' }}
                    tickLine={{ stroke: '#d1d5db' }}
                    angle={limitedData.length > 5 ? -45 : 0}
                    textAnchor={limitedData.length > 5 ? 'end' : 'middle'}
                    height={limitedData.length > 5 ? 80 : 60}
                    interval={0}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: '#374151' }}
                    axisLine={{ stroke: '#d1d5db' }}
                    tickLine={{ stroke: '#d1d5db' }}
                    tickFormatter={(value) => `¥${value.toFixed(0)}`}
                  />
                </>
              )}

              <Tooltip
                content={(props) => (
                  <CustomTooltip
                    {...props}
                    valueFormatter={
                      valueFormatter || ((value: number) => `¥${value.toLocaleString()}`)
                    }
                    labelFormatter={labelFormatter || ((label: string) => label)}
                  />
                )}
              />

              {showLegend && (
                <Legend
                  wrapperStyle={{
                    fontSize: '12px',
                    color: 'hsl(var(--foreground))',
                  }}
                />
              )}

              <Bar
                dataKey="value"
                radius={horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]}
                maxBarSize={horizontal ? 40 : 80}
              >
                {limitedData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill || colors[index % colors.length]} />
                ))}
              </Bar>
            </RechartsBarChart>
          </ResponsiveContainer>
        </div>

        {/* データが制限されている場合の注記 */}
        {data.length > maxBars && (
          <p className="text-xs text-muted-foreground mt-2 text-center">
            上位{maxBars}件を表示（全{data.length}件）
          </p>
        )}
      </CardContent>
    </Card>
  )
}

export default BarChart;