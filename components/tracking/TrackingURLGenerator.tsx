'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Copy, ExternalLink, QrCode, Share, Download } from 'lucide-react'
import { toast } from 'sonner'
import { UTMBuilder } from './UTMBuilder'
import { UTMPresets } from './UTMPresets'
import {
  UTMParameters,
  Preset,
  URLGeneratorConfig,
} from '@/types/tracking'

interface TrackingURLGeneratorProps {
  defaultBaseUrl?: string
  onURLGenerated?: (url: string, config: URLGeneratorConfig) => void
}

export function TrackingURLGenerator({ 
  defaultBaseUrl = '',
  onURLGenerated,
}: TrackingURLGeneratorProps) {
  const [baseUrl, setBaseUrl] = useState(defaultBaseUrl)
  const [utmParameters, setUtmParameters] = useState<UTMParameters>({})
  const [selectedPreset, setSelectedPreset] = useState<Preset | null>(null)
  const [generateQR, setGenerateQR] = useState(false)
  const [generatedUrl, setGeneratedUrl] = useState('')

  // URLを生成
  const generateURL = () => {
    if (!baseUrl.trim()) {
      toast.error('ベースURLを入力してください')
      return
    }

    try {
      const url = new URL(baseUrl)
      
      // UTMパラメータを追加
      Object.entries(utmParameters).forEach(([key, value]) => {
        if (value && value.trim()) {
          url.searchParams.set(key, value.trim())
        }
      })

      const finalUrl = url.toString()
      setGeneratedUrl(finalUrl)

      // コールバックを呼び出し
      onURLGenerated?.(finalUrl, {
        base_url: baseUrl,
        utm_parameters: utmParameters,
        generate_qr: generateQR,
      })

      toast.success('URLを生成しました')
    } catch (error) {
      toast.error('有効なURLを入力してください')
    }
  }

  // URLをクリップボードにコピー
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success('クリップボードにコピーしました')
    } catch (error) {
      toast.error('コピーに失敗しました')
    }
  }

  // URLを新しいタブで開く
  const openInNewTab = (url: string) => {
    window.open(url, '_blank')
  }

  // QRコードを生成（簡易版）
  const generateQRCode = () => {
    if (!generatedUrl) {
      toast.error('先にURLを生成してください')
      return
    }
    
    // QRコード生成サービスを使用（Google Chart API）
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(generatedUrl)}`
    window.open(qrUrl, '_blank')
    toast.success('QRコードを生成しました')
  }

  // プリセット選択時の処理
  const handlePresetSelect = (preset: Preset) => {
    setSelectedPreset(preset)
    setUtmParameters(preset.utm_parameters)
  }

  // UTMパラメータ変更時の処理
  const handleUTMChange = (params: UTMParameters) => {
    setUtmParameters(params)
    // プリセットの選択状態をクリア（手動編集された場合）
    if (selectedPreset) {
      const isPresetMatch = Object.keys(selectedPreset.utm_parameters).every(
        (key) => selectedPreset.utm_parameters[key as keyof UTMParameters] === params[key as keyof UTMParameters]
      )
      if (!isPresetMatch) {
        setSelectedPreset(null)
      }
    }
  }

  // URLプレビュー用のテキスト
  const previewUrl = () => {
    if (!baseUrl.trim()) return ''
    
    try {
      const url = new URL(baseUrl)
      Object.entries(utmParameters).forEach(([key, value]) => {
        if (value && value.trim()) {
          url.searchParams.set(key, value.trim())
        }
      })
      return url.toString()
    } catch {
      return ''
    }
  }

  // 共有用のテキストを生成
  const generateShareText = () => {
    const campaignName = utmParameters.utm_campaign || 'キャンペーン'
    const source = utmParameters.utm_source || '不明'
    return `【${campaignName}】\n\n詳細はこちら👇\n${generatedUrl}\n\n#美容室 #予約 #${source}`
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>トラッキングURL生成</CardTitle>
          <CardDescription>
            UTMパラメータ付きのトラッキングURLを生成して、マーケティング効果を測定できます
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="base-url">ベースURL</Label>
              <Input
                id="base-url"
                type="url"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://your-salon.com/reservation"
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                トラッキングしたいページのURLを入力してください
              </p>
            </div>

            {/* URL プレビュー */}
            {baseUrl && (
              <div className="p-3 bg-muted/50 rounded-md">
                <Label className="text-xs text-muted-foreground">プレビュー</Label>
                <div className="mt-1 break-all font-mono text-sm">
                  {previewUrl() || '無効なURL'}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="manual" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="presets">プリセット</TabsTrigger>
          <TabsTrigger value="manual">手動設定</TabsTrigger>
        </TabsList>

        <TabsContent value="presets" className="space-y-4">
          <UTMPresets
            onSelectPreset={handlePresetSelect}
            selectedPreset={selectedPreset}
          />
        </TabsContent>

        <TabsContent value="manual" className="space-y-4">
          <UTMBuilder
            initialValues={utmParameters}
            onChange={handleUTMChange}
            onReset={() => {
              setUtmParameters({})
              setSelectedPreset(null)
            }}
          />
        </TabsContent>
      </Tabs>

      {/* 生成ボタンとオプション */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Switch
                  id="generate-qr"
                  checked={generateQR}
                  onCheckedChange={setGenerateQR}
                />
                <Label htmlFor="generate-qr">QRコードも生成する</Label>
              </div>
              <Button onClick={generateURL} className="flex items-center gap-2">
                <ExternalLink className="h-4 w-4" />
                URLを生成
              </Button>
            </div>

            {/* 生成されたURL */}
            {generatedUrl && (
              <div className="space-y-4 pt-4 border-t">
                <div>
                  <Label className="text-sm font-medium">生成されたURL</Label>
                  <div className="mt-2 p-3 bg-muted/50 rounded-md">
                    <div className="break-all font-mono text-sm mb-3">
                      {generatedUrl}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(generatedUrl)}
                        className="flex items-center gap-2"
                      >
                        <Copy className="h-3 w-3" />
                        コピー
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openInNewTab(generatedUrl)}
                        className="flex items-center gap-2"
                      >
                        <ExternalLink className="h-3 w-3" />
                        開く
                      </Button>
                      {generateQR && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={generateQRCode}
                          className="flex items-center gap-2"
                        >
                          <QrCode className="h-3 w-3" />
                          QRコード
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* 共有用テキスト */}
                <div>
                  <Label className="text-sm font-medium">SNS共有用テキスト</Label>
                  <Textarea
                    value={generateShareText()}
                    readOnly
                    className="mt-2 resize-none"
                    rows={4}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2 flex items-center gap-2"
                    onClick={() => copyToClipboard(generateShareText())}
                  >
                    <Copy className="h-3 w-3" />
                    テキストをコピー
                  </Button>
                </div>

                {/* UTMパラメータサマリー */}
                <div>
                  <Label className="text-sm font-medium">設定されたUTMパラメータ</Label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {Object.entries(utmParameters).map(([key, value]) => {
                      if (!value) return null
                      return (
                        <Badge key={key} variant="secondary" className="text-xs">
                          {key.replace('utm_', '')}: {value}
                        </Badge>
                      )
                    })}
                    {Object.values(utmParameters).every((v) => !v) && (
                      <p className="text-sm text-muted-foreground">
                        UTMパラメータが設定されていません
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 使い方ガイド */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">使い方ガイド</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <h4 className="font-medium">1. ベースURLを設定</h4>
            <p className="text-muted-foreground">
              トラッキングしたいページのURLを入力します（例：予約ページ、キャンペーンページ）
            </p>
          </div>
          <Separator />
          <div>
            <h4 className="font-medium">2. UTMパラメータを設定</h4>
            <p className="text-muted-foreground">
              プリセットを選択するか、手動でUTMパラメータを設定します
            </p>
          </div>
          <Separator />
          <div>
            <h4 className="font-medium">3. URLを生成・共有</h4>
            <p className="text-muted-foreground">
              生成されたURLをInstagram投稿、Google広告、メール配信等で使用します
            </p>
          </div>
          <Separator />
          <div>
            <h4 className="font-medium">4. 効果測定</h4>
            <p className="text-muted-foreground">
              ダッシュボードでトラッキングデータを確認し、マーケティング効果を分析します
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}