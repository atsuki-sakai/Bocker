'use client'

import React, { useEffect, useState } from 'react'
import { useQuery, useConvex } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { LiffProvider } from '@/components/providers/LiffProvider'
import { Loading } from '@/components/common'
import { Id } from '@/convex/_generated/dataModel'

// ストレージキー（サロンIDごとに異なるキーを生成）
const getStorageKey = (org_id: Id<'organization'>) => `liff_id_org_${org_id}`

interface DynamicLiffProviderProps {
  children: React.ReactNode
  tenantId: Id<'tenant'>
  orgId: Id<'organization'>
}

export function DynamicLiffProvider({ children, tenantId, orgId }: DynamicLiffProviderProps) {
  const [liffId, setLiffId] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [showError, setShowError] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string>('')

  // Convexクライアントの取得 - 接続状態を確認するために使用
  // 注: 接続状態の使用はconsole.logの削除に伴い不要になったため、変数を削除
  useConvex()

  // 1. 初期化時にキャッシュから読み込み
  useEffect(() => {
    if (!orgId) {
      setErrorMessage('組織IDが不明です')
      setShowError(true)
      return
    }

    try {
      // まずキャッシュされたLIFF IDを確認
      const storageKey = getStorageKey(orgId)
      const cachedData = localStorage.getItem(storageKey)
      if (cachedData) {
        const parsed = JSON.parse(cachedData)
        // キャッシュの有効期限をチェック（24時間）
        const isValid = Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000
        if (isValid && parsed.liffId) {
          setLiffId(parsed.liffId)
        } else {
          // 期限切れの場合はキャッシュを削除
          localStorage.removeItem(storageKey)
        }
      }
    } catch (err) {
      console.error('キャッシュ読み込みエラー:', err)
    }
  }, [orgId])

  // 2. Convex接続状態とクエリの実行
  // 接続状態を確認（connectionStateの型エラーを回避するため同値チェックではなく接続状態の存在確認に変更）

  // 3. 接続状態に関わらずクエリを実行（効率的なリトライ処理に任せる）
  const dbLiffId = useQuery(
    api.organization.api_config.query.getLiffId,
    tenantId && orgId ? { tenant_id: tenantId, org_id: orgId } : 'skip'
  )

  // 4. クエリ結果の処理とリトライロジック
  useEffect(() => {
    // dbLiffId が undefined の場合、まだクエリ実行中か失敗している可能性がある
    if (dbLiffId === undefined) {
      // リトライ回数に達していない場合のみ処理
      if (retryCount < 5) {
        const timer = setTimeout(() => {
          setRetryCount((prev) => prev + 1)
        }, 2000)

        return () => clearTimeout(timer)
      } else {
        setErrorMessage(
          'このサロンのLINE連携情報を取得できませんでした。管理者にお問い合わせください。'
        )
        setShowError(true)
      }
      return
    }

    // dbLiffIdが取得できた場合、保存と設定
    if (dbLiffId) {
      setLiffId(dbLiffId)
      setShowError(false)

      // キャッシュに保存
      try {
        const storageKey = getStorageKey(orgId)
        localStorage.setItem(
          storageKey,
          JSON.stringify({
            liffId: dbLiffId,
            timestamp: Date.now(),
          })
        )
      } catch (err) {
        console.error('キャッシュ保存エラー:', err)
      }
    }
    // nullが明示的に返された場合（サロンIDは正しいがLIFF IDが設定されていない）
    else if (dbLiffId === null) {
      setErrorMessage('このサロンにはLINE連携が設定されていません。管理者にお問い合わせください。')
      setShowError(true)
    }
    return
  }, [dbLiffId, retryCount, orgId])

  // エラー表示
  if (showError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50">
        <div className="bg-white p-6 rounded-lg shadow-md max-w-md w-full">
          <h2 className="text-red-600 text-xl font-bold mb-4">エラーが発生しました</h2>
          <p className="text-gray-700 mb-6">{errorMessage}</p>
          <div className="flex justify-center">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              再読み込み
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ローディング表示
  if (!liffId) {
    return <Loading />
  }

  return <LiffProvider liffId={liffId}>{children}</LiffProvider>
}

// Suspenseを使用したラッパーコンポーネント
export function DynamicLiffProviderWithSuspense(props: DynamicLiffProviderProps) {
  return <DynamicLiffProvider {...props} />
}
