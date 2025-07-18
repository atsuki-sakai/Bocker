'use client'

import Link from 'next/link'
import { ChevronRight, Home } from 'lucide-react'

interface BreadcrumbItem {
  label: string
  href: string
  current?: boolean
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[]
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  if (items.length === 0) return null

  return (
    <nav aria-label="パンくずリスト" className="flex items-center space-x-2 text-sm text-muted-foreground">
      <Link 
        href="/"
        className="flex items-center hover:text-foreground transition-colors"
        aria-label="ホームに戻る"
      >
        <Home className="h-4 w-4" />
        <span className="sr-only">ホーム</span>
      </Link>
      
      {items.map((item, index) => (
        <div key={index} className="flex items-center">
          <ChevronRight className="h-4 w-4 mx-2" />
          {item.current ? (
            <span className="text-foreground font-medium" aria-current="page">
              {item.label}
            </span>
          ) : (
            <Link
              href={item.href}
              className="hover:text-foreground transition-colors"
            >
              {item.label}
            </Link>
          )}
        </div>
      ))}
    </nav>
  )
}

// プリセットのパンくずリストコンポーネント
export function HomeBreadcrumbs() {
  return (
    <Breadcrumbs
      items={[
        { label: 'ホーム', href: '/', current: true }
      ]}
    />
  )
}

export function FeaturesBreadcrumbs() {
  return (
    <Breadcrumbs
      items={[
        { label: '機能', href: '/features', current: true }
      ]}
    />
  )
}

export function PricingBreadcrumbs() {
  return (
    <Breadcrumbs
      items={[
        { label: '料金', href: '/pricing', current: true }
      ]}
    />
  )
}

export function ContactBreadcrumbs() {
  return (
    <Breadcrumbs
      items={[
        { label: 'お問い合わせ', href: '/contact', current: true }
      ]}
    />
  )
}