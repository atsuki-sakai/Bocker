"use client";

import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export interface SummaryCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: {
    value: number;
    label?: string;
    period?: string;
  };
  icon?: React.ReactNode;
  loading?: boolean;
  className?: string;
  valueFormatter?: (value: number | string) => string;
  trend?: 'up' | 'down' | 'neutral';
  variant?: 'default' | 'compact';
  showComparison?: boolean;
}

/**
 * トレンドアイコンを取得
 */
function getTrendIcon(trend: 'up' | 'down' | 'neutral', changeValue?: number) {
  if (trend === 'neutral' || changeValue === 0) {
    return <Minus className="w-3 h-3" />;
  }
  
  if (trend === 'up' || (changeValue && changeValue > 0)) {
    return <TrendingUp className="w-3 h-3" />;
  }
  
  return <TrendingDown className="w-3 h-3" />;
}

/**
 * トレンドカラーを取得
 */
function getTrendColor(trend: 'up' | 'down' | 'neutral', changeValue?: number) {
  if (trend === 'neutral' || changeValue === 0) {
    return 'text-muted-foreground';
  }
  
  if (trend === 'up' || (changeValue && changeValue > 0)) {
    return 'text-success';
  }
  
  return 'text-destructive';
}

/**
 * 変化率を表示用にフォーマット
 */
function formatChangeValue(value: number): string {
  const absValue = Math.abs(value);
  const sign = value >= 0 ? '+' : '-';
  return `${sign}${absValue.toFixed(1)}%`;
}

/**
 * サマリーカードコンポーネント
 * 分析ダッシュボードの主要指標表示に使用
 */
export function SummaryCard({
  title,
  value,
  subtitle,
  change,
  icon,
  loading = false,
  className = '',
  valueFormatter,
  trend,
  variant = 'default',
  showComparison = true,
}: SummaryCardProps) {
  // トレンドを自動判定（changeがある場合）
  const determinedTrend =
    trend ||
    (change?.value ? (change.value > 0 ? 'up' : change.value < 0 ? 'down' : 'neutral') : 'neutral')

  // 値をフォーマット
  const formattedValue = valueFormatter
    ? valueFormatter(value)
    : typeof value === 'number'
      ? value.toLocaleString()
      : value

  if (loading) {
    return (
      <Card className={cn('h-fit', className)}>
        <CardHeader
          className={cn(
            'flex flex-row items-center justify-between space-y-0',
            variant === 'compact' ? 'pb-2' : 'pb-3'
          )}
        >
          <Skeleton className="h-4 w-24" />
          {icon && <Skeleton className="h-4 w-4" />}
        </CardHeader>
        <CardContent className={variant === 'compact' ? 'pt-0' : ''}>
          <Skeleton className="h-8 w-32 mb-2" />
          {showComparison && <Skeleton className="h-4 w-20" />}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn('h-fit transition-all hover:shadow-md', className)}>
      <CardHeader
        className={cn(
          'flex flex-row items-center justify-between space-y-0',
          variant === 'compact' ? 'pb-2' : 'pb-3'
        )}
      >
        <CardTitle
          className={cn(
            'font-medium text-muted-foreground',
            variant === 'compact' ? 'text-sm' : 'text-sm'
          )}
        >
          {title}
        </CardTitle>
        {icon && <div className="text-muted-foreground opacity-70">{icon}</div>}
      </CardHeader>

      <CardContent className={variant === 'compact' ? 'pt-0' : ''}>
        <div
          className={cn(
            'font-bold tracking-tight text-foreground',
            variant === 'compact' ? 'text-2xl' : 'text-3xl'
          )}
        >
          {formattedValue}
        </div>

        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}

        {showComparison && change && (
          <div className="flex items-center gap-2 mt-2">
            <Badge
              variant="outline"
              className={cn(
                'text-xs border-0 px-2 py-0.5 font-medium',
                getTrendColor(determinedTrend, change.value)
              )}
            >
              <span className="flex items-center gap-1">
                {getTrendIcon(determinedTrend, change.value)}
                {formatChangeValue(change.value)}
              </span>
            </Badge>

            {change.label && <span className="text-xs text-muted-foreground">{change.label}</span>}

            {change.period && (
              <span className="text-xs text-muted-foreground">vs {change.period}</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * サマリーカードグリッドコンポーネント
 * 複数のSummaryCardをグリッド表示
 */
interface SummaryCardGridProps {
  cards: (Omit<SummaryCardProps, 'className'> & { id: string })[]
  loading?: boolean
  className?: string
  columns?: 2 | 3 | 4
}

export function SummaryCardGrid({
  cards,
  loading = false,
  className = '',
  columns = 4,
}: SummaryCardGridProps) {
  const gridCols = {
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  }

  return (
    <div className={cn('grid gap-4', gridCols[columns], className)}>
      {cards.map((card) => (
        <SummaryCard key={card.id} {...card} loading={loading} variant="compact" />
      ))}
    </div>
  )
}

export default SummaryCard;