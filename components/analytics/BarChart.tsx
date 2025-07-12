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
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg shadow-lg p-3">
      <p className="text-sm font-medium text-foreground mb-1">
        {labelFormatter ? labelFormatter(label as string) : label}
      </p>
      {payload.map((entry: { color: string; value: number }, index: number) => (
        <p key={index} className="text-sm" style={{ color: entry.color }}>
          <span className="font-medium">売上: </span>
          {valueFormatter ? valueFormatter(entry.value) : `¥${entry.value.toLocaleString()}`}
        </p>
      ))}
    </div>
  );
};

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
  className = "",
  valueFormatter,
  labelFormatter,
  horizontal = false,
  maxBars = 10
}: BarChartProps) {
  // デフォルトの色パレット（CSS custom propertiesから）
  const defaultColors = [
    'hsl(var(--chart-1))',
    'hsl(var(--chart-2))',
    'hsl(var(--chart-3))',
    'hsl(var(--chart-4))',
    'hsl(var(--chart-5))',
    'hsl(var(--palette-1))',
    'hsl(var(--palette-2))',
    'hsl(var(--palette-3))',
    'hsl(var(--palette-4))',
    'hsl(var(--palette-5))'
  ];

  const colors = barColors || defaultColors;

  // データを制限（必要に応じて）
  const limitedData = maxBars ? data.slice(0, maxBars) : data;

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
    );
  }

  // 横向きの場合のマージン調整
  const margin = horizontal 
    ? { top: 20, right: 30, left: 80, bottom: 20 }
    : { top: 20, right: 30, left: 20, bottom: 60 };

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
              layout={horizontal ? 'horizontal' : 'vertical'}
              margin={margin}
            >
              {showGrid && (
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke="hsl(var(--border))"
                  opacity={0.3}
                />
              )}
              
              {horizontal ? (
                <>
                  <XAxis
                    type="number"
                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                    tickLine={{ stroke: 'hsl(var(--border))' }}
                    tickFormatter={(value) => `¥${(value / 1000).toFixed(0)}k`}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                    tickLine={{ stroke: 'hsl(var(--border))' }}
                    width={70}
                  />
                </>
              ) : (
                <>
                  <XAxis
                    dataKey="name"
                    tick={(props) => {
                      const { x, y, payload } = props;
                      return (
                        <g transform={`translate(${x},${y})`}>
                          <text
                            fontSize={12}
                            fill="hsl(var(--muted-foreground))"
                            textAnchor={limitedData.length > 5 ? 'end' : 'middle'}
                            transform={limitedData.length > 5 ? 'rotate(-45)' : undefined}
                            dy={limitedData.length > 5 ? 0 : 10}
                            dx={limitedData.length > 5 ? -10 : 0}
                          >
                            {payload.value}
                          </text>
                        </g>
                      );
                    }}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                    tickLine={{ stroke: 'hsl(var(--border))' }}
                    height={60}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                    tickLine={{ stroke: 'hsl(var(--border))' }}
                    tickFormatter={(value) => `¥${(value / 1000).toFixed(0)}k`}
                  />
                </>
              )}

              <Tooltip
                content={(props) => (
                  <CustomTooltip 
                    {...props}
                    valueFormatter={valueFormatter || ((value: number) => `¥${value.toLocaleString()}`)}
                    labelFormatter={labelFormatter || ((label: string) => label)}
                  />
                )}
              />
              
              {showLegend && (
                <Legend
                  wrapperStyle={{
                    fontSize: '12px',
                    color: 'hsl(var(--foreground))'
                  }}
                />
              )}
              
              <Bar
                dataKey="value"
                radius={horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]}
                maxBarSize={horizontal ? 40 : 80}
              >
                {limitedData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.fill || colors[index % colors.length]} 
                  />
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
  );
}

export default BarChart;