'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Plus, Edit, Trash2, Star, Copy } from 'lucide-react'
import { toast } from 'sonner'
import {
  Preset,
  UTMParameters,
  DEFAULT_PRESETS,
  PRESET_CATEGORIES,
} from '@/types/tracking'

interface UTMPresetsProps {
  onSelectPreset?: (preset: Preset) => void
  selectedPreset?: Preset | null
}

export function UTMPresets({ onSelectPreset, selectedPreset }: UTMPresetsProps) {
  const [presets, setPresets] = useState<Preset[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingPreset, setEditingPreset] = useState<Preset | null>(null)
  const [newPreset, setNewPreset] = useState<Partial<Preset>>({
    name: '',
    description: '',
    category: 'custom',
    utm_parameters: {},
  })

  // ローカルストレージからプリセットを読み込み
  useEffect(() => {
    const savedPresets = localStorage.getItem('utm-presets')
    if (savedPresets) {
      try {
        const parsed = JSON.parse(savedPresets) as Preset[]
        setPresets(parsed)
      } catch (error) {
        console.error('Failed to parse saved presets:', error)
        initializeDefaultPresets()
      }
    } else {
      initializeDefaultPresets()
    }
  }, [])

  // デフォルトプリセットの初期化
  const initializeDefaultPresets = () => {
    const defaultPresetsWithIds: Preset[] = DEFAULT_PRESETS.map((preset) => ({
      ...preset,
      id: `default-${preset.name.toLowerCase().replace(/\s+/g, '-')}`,
      created_at: new Date(),
    }))
    setPresets(defaultPresetsWithIds)
    savePresets(defaultPresetsWithIds)
  }

  // プリセットをローカルストレージに保存
  const savePresets = (presetsToSave: Preset[]) => {
    localStorage.setItem('utm-presets', JSON.stringify(presetsToSave))
  }

  // 新しいプリセットを作成
  const createPreset = () => {
    if (!newPreset.name?.trim()) {
      toast.error('プリセット名を入力してください')
      return
    }

    const preset: Preset = {
      id: `custom-${Date.now()}`,
      name: newPreset.name,
      description: newPreset.description || '',
      category: newPreset.category as 'social' | 'ads' | 'email' | 'custom',
      utm_parameters: newPreset.utm_parameters || {},
      created_at: new Date(),
      is_default: false,
    }

    const updatedPresets = [...presets, preset]
    setPresets(updatedPresets)
    savePresets(updatedPresets)
    
    setNewPreset({
      name: '',
      description: '',
      category: 'custom',
      utm_parameters: {},
    })
    setIsDialogOpen(false)
    toast.success('プリセットを作成しました')
  }

  // プリセットを編集
  const updatePreset = () => {
    if (!editingPreset || !editingPreset.name?.trim()) {
      toast.error('プリセット名を入力してください')
      return
    }

    const updatedPresets = presets.map((preset) =>
      preset.id === editingPreset.id ? editingPreset : preset
    )
    setPresets(updatedPresets)
    savePresets(updatedPresets)
    setEditingPreset(null)
    setIsDialogOpen(false)
    toast.success('プリセットを更新しました')
  }

  // プリセットを削除
  const deletePreset = (presetId: string) => {
    const updatedPresets = presets.filter((preset) => preset.id !== presetId)
    setPresets(updatedPresets)
    savePresets(updatedPresets)
    toast.success('プリセットを削除しました')
  }

  // プリセットを複製
  const duplicatePreset = (preset: Preset) => {
    const duplicated: Preset = {
      ...preset,
      id: `custom-${Date.now()}`,
      name: `${preset.name} (コピー)`,
      is_default: false,
      created_at: new Date(),
    }

    const updatedPresets = [...presets, duplicated]
    setPresets(updatedPresets)
    savePresets(updatedPresets)
    toast.success('プリセットを複製しました')
  }

  // ダイアログを開く
  const openDialog = (preset?: Preset) => {
    if (preset) {
      setEditingPreset({ ...preset })
    } else {
      setNewPreset({
        name: '',
        description: '',
        category: 'custom',
        utm_parameters: {},
      })
      setEditingPreset(null)
    }
    setIsDialogOpen(true)
  }

  // カテゴリ別にプリセットをグループ化
  const groupedPresets = presets.reduce((acc, preset) => {
    if (!acc[preset.category]) {
      acc[preset.category] = []
    }
    acc[preset.category].push(preset)
    return acc
  }, {} as Record<string, Preset[]>)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>プリセット管理</CardTitle>
            <CardDescription>
              よく使うUTMパラメータの組み合わせを保存・管理できます
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={() => openDialog()}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                新規作成
              </Button>
            </DialogTrigger>
            <PresetDialog
              preset={editingPreset || newPreset}
              isEditing={!!editingPreset}
              onChange={(preset) => {
                if (editingPreset) {
                  setEditingPreset(preset as Preset)
                } else {
                  setNewPreset(preset)
                }
              }}
              onSave={editingPreset ? updatePreset : createPreset}
              onCancel={() => setIsDialogOpen(false)}
            />
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {Object.entries(groupedPresets).map(([category, categoryPresets]) => (
            <div key={category}>
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                {PRESET_CATEGORIES[category as keyof typeof PRESET_CATEGORIES]}
                <Badge variant="secondary" className="text-xs">
                  {categoryPresets.length}
                </Badge>
              </h4>
              <div className="grid gap-3">
                {categoryPresets.map((preset) => (
                  <div
                    key={preset.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors hover:bg-muted/50 ${
                      selectedPreset?.id === preset.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border'
                    }`}
                    onClick={() => onSelectPreset?.(preset)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h5 className="font-medium text-sm">{preset.name}</h5>
                          {preset.is_default && (
                            <Star className="h-3 w-3 text-yellow-500 fill-current" />
                          )}
                        </div>
                        {preset.description && (
                          <p className="text-xs text-muted-foreground mb-2">
                            {preset.description}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(preset.utm_parameters).map(
                            ([key, value]) => {
                              if (!value) return null
                              return (
                                <Badge key={key} variant="outline" className="text-xs">
                                  {key.replace('utm_', '')}: {value}
                                </Badge>
                              )
                            }
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 ml-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={(e) => {
                            e.stopPropagation()
                            duplicatePreset(preset)
                          }}
                          title="複製"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        {!preset.is_default && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={(e) => {
                                e.stopPropagation()
                                openDialog(preset)
                              }}
                              title="編集"
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                  onClick={(e) => e.stopPropagation()}
                                  title="削除"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>プリセットを削除</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    「{preset.name}」を削除してもよろしいですか？
                                    この操作は取り消せません。
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>キャンセル</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deletePreset(preset.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    削除
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {presets.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">プリセットがありません</p>
              <Button
                variant="outline"
                className="mt-2"
                onClick={() => openDialog()}
              >
                最初のプリセットを作成
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// プリセット編集ダイアログ
interface PresetDialogProps {
  preset: Partial<Preset>
  isEditing: boolean
  onChange: (preset: Partial<Preset>) => void
  onSave: () => void
  onCancel: () => void
}

function PresetDialog({ preset, isEditing, onChange, onSave, onCancel }: PresetDialogProps) {
  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>
          {isEditing ? 'プリセットを編集' : 'プリセットを作成'}
        </DialogTitle>
        <DialogDescription>
          UTMパラメータの組み合わせに名前を付けて保存できます
        </DialogDescription>
      </DialogHeader>
      
      <div className="space-y-4">
        <div className="grid gap-2">
          <Label htmlFor="name">プリセット名</Label>
          <Input
            id="name"
            value={preset.name || ''}
            onChange={(e) => onChange({ ...preset, name: e.target.value })}
            placeholder="Instagram投稿"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="description">説明（任意）</Label>
          <Textarea
            id="description"
            value={preset.description || ''}
            onChange={(e) => onChange({ ...preset, description: e.target.value })}
            placeholder="このプリセットの用途を説明してください"
            rows={2}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="category">カテゴリ</Label>
          <Select
            value={preset.category || 'custom'}
            onValueChange={(value) => onChange({ ...preset, category: value as 'social' | 'ads' | 'email' | 'custom' })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(PRESET_CATEGORIES).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          <Label>UTMパラメータ</Label>
          {['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].map(
            (param) => (
              <div key={param} className="grid gap-2">
                <Label htmlFor={param} className="text-xs text-muted-foreground">
                  {param}
                </Label>
                <Input
                  id={param}
                  value={preset.utm_parameters?.[param as keyof UTMParameters] || ''}
                  onChange={(e) =>
                    onChange({
                      ...preset,
                      utm_parameters: {
                        ...preset.utm_parameters,
                        [param]: e.target.value,
                      },
                    })
                  }
                  placeholder={`${param} の値`}
                />
              </div>
            )
          )}
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          キャンセル
        </Button>
        <Button onClick={onSave}>
          {isEditing ? '更新' : '作成'}
        </Button>
      </DialogFooter>
    </DialogContent>
  )
}