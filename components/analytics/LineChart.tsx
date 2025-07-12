"use client";

import React from 'react';
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartDataPoint } from '@/services/supabase/repositories/analytics/types';

interface LineChartProps {
  data: ChartDataPoint[];
  title?: string;
  description?: string;
  height?: number;
  showLegend?: boolean;
  showGrid?: boolean;
  lineColor?: string;
  className?: string;
  valueFormatter?: (value: number) => string;
  labelFormatter?: (label: string) => string;
}

interface TooltipPayload {
  color: string;
  value: number;
}

/**
 * カスタムツールチップコンポーネント
 */
const CustomTooltip = ({ 
  active, 
  payload, 
  label = "", 
  valueFormatter = (value: number) => `¥${value.toLocaleString()}`,
  labelFormatter = (label: string) => label
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string | number;
  valueFormatter: (value: number) => string;
  labelFormatter: (label: string) => string;
}) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-lg shadow-lg p-3">
        <p className="text-sm font-medium text-foreground mb-1">
          {labelFormatter(label as string)}
        </p>
        {payload.map((entry, index) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            <span className="font-medium">売上: </span>
            {valueFormatter(entry.value)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

/**
 * 線グラフコンポーネント
 * 時系列データやトレンド表示に使用
 */
export function LineChart({
  data,
  title,
  description,
  height = 300,
  showLegend = false,
  showGrid = true,
  lineColor,
  className = "",
  valueFormatter,
  labelFormatter
}: LineChartProps) {
  // CSS custom propertyから色を取得
  const defaultLineColor = lineColor || '#3b82f6'

  // データが空の場合の表示
  if (!data || data.length === 0) {
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
            className="flex items-center justify-center text-muted-foreground bg-muted rounded-lg"
            style={{ height: `${height}px` }}
          >
            <p className="text-sm">データがありません</p>
          </div>
        </CardContent>
      </Card>
    )
  }

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
            <RechartsLineChart
              data={data}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 20,
              }}
            >
              {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />}
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12, fill: '#374151' }}
                axisLine={{ stroke: '#d1d5db' }}
                tickLine={{ stroke: '#d1d5db' }}
              />
              <YAxis
                tick={{ fontSize: 12, fill: '#374151' }}
                axisLine={{ stroke: '#d1d5db' }}
                tickLine={{ stroke: '#d1d5db' }}
                tickFormatter={(value) => `¥${value.toFixed(0)}`}
              />
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
              <Line
                type="linear"
                dataKey="value"
                stroke={defaultLineColor}
                strokeWidth={2}
                dot={{
                  fill: '#5294FDFF',
                  stroke: '#3b82f6',
                  strokeWidth: 2,
                  r: 4,
                }}
                activeDot={{
                  r: 6,
                  stroke: '#3b82f6',
                  strokeWidth: 2,
                  fill: '#ffffff',
                }}
                connectNulls={false}
              />
            </RechartsLineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

export default LineChart;