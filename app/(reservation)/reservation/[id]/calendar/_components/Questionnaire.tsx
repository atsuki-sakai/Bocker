'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Form, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { ImageDrop } from '@/components/common'
import Image from 'next/image'
import { Badge } from '@/components/ui/badge'

// ステップ1（基本情報）とステップ2（サマリー）の実装
const totalSteps = 10
const QuestionnaireSchema = z.object({
  styleWishType: z.array(z.enum(['omakase', 'image', 'specific'])),
  hairImgFile: z.instanceof(File).optional(),
  specificStyle: z.string().optional(),
  purpose: z.array(z.enum(['change', 'keep', 'trim', 'volume', 'other'])),
  purposeOther: z.string().optional(),
  satisfaction: z.enum(['good', 'bad', 'neutral']),
  satisfactionOther: z.string().optional(),
  likePoint: z.string().optional(),
  currentLength: z.enum(['short', 'bob', 'medium', 'long']),
  frontHair: z.enum(['make', 'nothing', 'stretching', 'adjustment']),
  frontHairLength: z.string().optional(),
  hairWeight: z.enum(['light', 'medium', 'heavy']),
  hairType: z.array(z.enum(['straight', 'slightly_wavy', 'strongly_wavy', 'thick', 'thin'])),
  volume: z.enum(['spread', 'flat', 'normal']),
  scalp: z.array(z.enum(['sensitive', 'normal', 'dandruff', 'allergy'])),
  trouble: z.string().optional(),
  stylingMethod: z.array(z.enum(['dry', 'iron', 'wax'])),
  stylingTime: z.enum(['none', 'short', 'long']),
  careShampoo: z.string().optional(),
  careTreatment: z.string().optional(),
  careStyling: z.string().optional(),
  stylingTrouble: z.string().optional(),
  workRule: z.enum(['none', 'haircolor_ng', 'length_limit']),
  lifestyle: z.array(z.enum(['childcare', 'sports', 'hat', 'other'])),
  lifestyleOther: z.string().optional(),
  colorHistory: z.enum(['none', 'yes']),
  colorLastMonth: z.string().optional(),
  colorType: z.string().optional(),
  permHistory: z.enum(['none', 'perm', 'straight']),
  permLastMonth: z.string().optional(),
  bleachHistory: z.enum(['none', 'yes']),
  bleachCount: z.string().optional(),
  bleachPart: z.enum(['part', 'all']).optional(),
  damagePart: z.enum(['tip', 'all', 'none']),
  otherRequest: z.string().optional(),
})

export type QuestionnaireData = z.infer<typeof QuestionnaireSchema>

export const Questionnaire = ({
  onComplete,
  onStepChange,
}: {
  onComplete: (data: QuestionnaireData) => void
  onStepChange?: (step: number) => void
}) => {
  const [step, setStep] = useState(1)
  const [hairImgFile, setHairImgFile] = useState<File | null>(null)
  const [hairImgPreviewUrl, setHairImgPreviewUrl] = useState<string | null>(null)

  const form = useForm<QuestionnaireData>({
    resolver: zodResolver(QuestionnaireSchema),
    defaultValues: {
      styleWishType: ['omakase'],
      hairImgFile: hairImgFile || undefined,
      specificStyle: '',
      purpose: [],
      purposeOther: '',
      hairType: [],
      volume: undefined,
      scalp: [],
      trouble: '',
      stylingMethod: [],
      stylingTime: undefined,
      careShampoo: '',
      careTreatment: '',
      careStyling: '',
      stylingTrouble: '',
      workRule: undefined,
      lifestyle: [],
      lifestyleOther: '',
      colorHistory: undefined,
      colorLastMonth: '',
      colorType: '',
      permHistory: undefined,
      permLastMonth: '',
      bleachHistory: undefined,
      bleachCount: '',
      bleachPart: undefined,
      damagePart: undefined,
      otherRequest: '',
    },
  })

  useEffect(() => {
    if (onStepChange) onStepChange(step)
  }, [step, onStepChange])

  // 次へ／完了ボタン
  const handleNext = async () => {
    const values = form.getValues()
    const fields: (keyof QuestionnaireData)[] = []
    if (step === 2) {
      fields.push('styleWishType')
      if (values.styleWishType.includes('specific')) {
        fields.push('specificStyle')
      }
    } else if (step === 3) {
      fields.push('purpose')
      if ((values.purpose ?? []).includes('other')) {
        fields.push('purposeOther')
      }
    }
    const isValid = await form.trigger(fields)
    if (!isValid) return
    if (step < totalSteps) {
      setStep(step + 1)
    } else {
      onComplete(values)
    }
  }

  // 戻るボタン
  const back = () => setStep((prev) => Math.max(prev - 1, 1))

  const handleUploadComplete = (serverUrl: string) => {
    setHairImgPreviewUrl(serverUrl)
  }
  return (
    <div className="p-1 w-full">
      <div>
        <div className="flex justify-between items-center w-full">
          <CardTitle>
            STEP {step}/{totalSteps}
          </CardTitle>
          <div className="w-1/2">
            <Progress value={(step / totalSteps) * 100} />
          </div>
        </div>
      </div>

      <div className="mt-6 w-full">
        <Form {...form}>
          {step === 1 && (
            <>
              <FormItem>
                <FormLabel>どのようなスタイルをご希望ですか？</FormLabel>
                <FormControl>
                  <ToggleGroup
                    type="multiple"
                    value={form.watch('styleWishType')}
                    onValueChange={(val) => {
                      const valTyped = val as z.infer<
                        typeof QuestionnaireSchema.shape.styleWishType
                      >
                      const prev = form.watch('styleWishType') as Array<
                        'omakase' | 'image' | 'specific'
                      >
                      const added = valTyped.find((v) => !prev.includes(v)) as
                        | 'omakase'
                        | 'image'
                        | 'specific'
                        | undefined

                      // 「おまかせ」と「具体的に」が両方含まれている場合のみ排他
                      if (valTyped.includes('omakase') && valTyped.includes('specific')) {
                        if (added === 'omakase') {
                          form.setValue('styleWishType', [
                            'omakase',
                            ...valTyped.filter((v) => v === 'image'),
                          ] as Array<'omakase' | 'image' | 'specific'>)
                        } else if (added === 'specific') {
                          form.setValue('styleWishType', [
                            'specific',
                            ...valTyped.filter((v) => v === 'image'),
                          ] as Array<'omakase' | 'image' | 'specific'>)
                        }
                      } else {
                        form.setValue('styleWishType', valTyped)
                      }
                    }}
                    className="flex flex-wrap gap-2"
                  >
                    <ToggleGroupItem value="omakase">おまかせ</ToggleGroupItem>
                    <ToggleGroupItem value="image">
                      理想のイメージ画像をアップロード
                    </ToggleGroupItem>
                    <ToggleGroupItem value="specific">希望のスタイルを具体的に</ToggleGroupItem>
                  </ToggleGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
              {form.watch('styleWishType').includes('specific') && (
                <FormItem className="mt-4">
                  <FormLabel>希望のスタイルを具体的に</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={6}
                      {...form.register('specificStyle')}
                      placeholder="例：肩につくくらいのボブにしたい、前髪は流せるようにカットしてほしい"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
              {form.watch('styleWishType').includes('image') && (
                <FormItem className="mt-4">
                  <FormLabel>理想のイメージ画像をアップロード</FormLabel>
                  <FormControl>
                    <ImageDrop
                      onUploadComplete={handleUploadComplete}
                      initialImageUrl={hairImgPreviewUrl || undefined}
                      maxSizeMB={6}
                      onFileSelect={(file) => {
                        form.setValue('hairImgFile', file)
                        setHairImgFile(file)
                        if (hairImgPreviewUrl && hairImgPreviewUrl.startsWith('blob:')) {
                          URL.revokeObjectURL(hairImgPreviewUrl)
                        }
                        setHairImgPreviewUrl(URL.createObjectURL(file))
                      }}
                    />
                  </FormControl>
                </FormItem>
              )}
            </>
          )}
          {step === 2 && (
            <>
              <FormItem>
                <FormLabel>今回の目的は？</FormLabel>
                <FormControl>
                  <ToggleGroup
                    type="single"
                    value={form.watch('purpose')[0] ?? ''}
                    onValueChange={(val) =>
                      form.setValue(
                        'purpose',
                        val ? [val as z.infer<typeof QuestionnaireSchema.shape.purpose>[0]] : []
                      )
                    }
                    className="flex flex-wrap gap-2"
                  >
                    <ToggleGroupItem value="change">イメチェン</ToggleGroupItem>
                    <ToggleGroupItem value="keep">現状維持</ToggleGroupItem>
                    <ToggleGroupItem value="trim">少し整える</ToggleGroupItem>
                    <ToggleGroupItem value="volume">毛量調整のみ</ToggleGroupItem>
                    <ToggleGroupItem value="other">その他</ToggleGroupItem>
                  </ToggleGroup>
                </FormControl>
                <FormMessage />
              </FormItem>

              {(form.watch('purpose') ?? []).includes('other') && (
                <FormItem>
                  <FormLabel>その他の内容</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={6}
                      {...form.register('purposeOther')}
                      placeholder="例：結婚式に出席するので華やかにしたい、子育て中なので手入れが簡単な髪型が良いです"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            </>
          )}
          {step === 3 && (
            <>
              <FormItem>
                <FormLabel>現在の髪型に満足していますか？</FormLabel>
                <FormControl>
                  <ToggleGroup
                    type="single"
                    value={form.watch('satisfaction') ?? ''}
                    onValueChange={(val) =>
                      form.setValue(
                        'satisfaction',
                        val as z.infer<typeof QuestionnaireSchema.shape.satisfaction>
                      )
                    }
                    className="flex flex-wrap gap-2"
                  >
                    <ToggleGroupItem value="good">満足</ToggleGroupItem>
                    <ToggleGroupItem value="neutral">普通</ToggleGroupItem>
                    <ToggleGroupItem value="bad">不満</ToggleGroupItem>
                  </ToggleGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
              {form.watch('satisfaction') === 'bad' && (
                <FormItem className="mt-4">
                  <FormLabel>不満の理由</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={6}
                      {...form.register('satisfactionOther')}
                      placeholder="例：トップがペタッとしやすい、前髪がすぐに伸びてしまう"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}

              <FormItem className="mt-4">
                <FormLabel>今の髪型できにいっている点 / 嫌いな点は？</FormLabel>
                <FormControl>
                  <Textarea
                    rows={6}
                    {...form.register('likePoint')}
                    placeholder="例：まとまりやすいところが気に入っています、毛先がはねやすいのが悩みです"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            </>
          )}
          {step === 4 && (
            <>
              <FormItem>
                <FormLabel>現在の長さ</FormLabel>
                <FormControl>
                  <ToggleGroup
                    type="single"
                    value={form.watch('currentLength') ?? ''}
                    onValueChange={(val) =>
                      form.setValue(
                        'currentLength',
                        val as z.infer<typeof QuestionnaireSchema.shape.currentLength>
                      )
                    }
                    className="flex flex-wrap gap-2"
                  >
                    <ToggleGroupItem value="short">ショート</ToggleGroupItem>
                    <ToggleGroupItem value="bob">ボブ</ToggleGroupItem>
                    <ToggleGroupItem value="medium">ミディアム</ToggleGroupItem>
                    <ToggleGroupItem value="long">ロング</ToggleGroupItem>
                  </ToggleGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
              <FormItem className="mt-4">
                <FormLabel>前髪の仕上がり</FormLabel>
                <FormControl>
                  <ToggleGroup
                    type="single"
                    value={form.watch('frontHair') ?? ''}
                    onValueChange={(val) =>
                      form.setValue(
                        'frontHair',
                        val as z.infer<typeof QuestionnaireSchema.shape.frontHair>
                      )
                    }
                    className="flex flex-wrap gap-2"
                  >
                    <ToggleGroupItem value="make">作る</ToggleGroupItem>
                    <ToggleGroupItem value="nothing">カットしない</ToggleGroupItem>
                    <ToggleGroupItem value="stretching">伸ばす</ToggleGroupItem>
                    <ToggleGroupItem value="adjustment">長さ調整</ToggleGroupItem>
                  </ToggleGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
              {form.watch('frontHair') === 'make' && (
                <FormItem className="mt-4">
                  <FormLabel>前髪の長さ</FormLabel>
                  <FormControl>
                    <Input
                      {...form.register('frontHairLength')}
                      placeholder="例：眉が隠れるくらい、目にかからない長さ"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
              <FormItem className="mt-4">
                <FormLabel>量・重さの希望</FormLabel>
                <FormControl>
                  <ToggleGroup
                    type="single"
                    value={form.watch('hairWeight') ?? ''}
                    onValueChange={(val) =>
                      form.setValue(
                        'hairWeight',
                        val as z.infer<typeof QuestionnaireSchema.shape.hairWeight>
                      )
                    }
                    className="flex flex-wrap gap-2"
                  >
                    <ToggleGroupItem value="light">軽め</ToggleGroupItem>
                    <ToggleGroupItem value="medium">中くらい</ToggleGroupItem>
                    <ToggleGroupItem value="heavy">重め</ToggleGroupItem>
                  </ToggleGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            </>
          )}
          {step === 5 && (
            <>
              <FormItem>
                <FormLabel>髪質</FormLabel>
                <FormControl>
                  <ToggleGroup
                    type="multiple"
                    value={form.watch('hairType')}
                    onValueChange={(vals) =>
                      form.setValue(
                        'hairType',
                        vals as z.infer<typeof QuestionnaireSchema.shape.hairType>
                      )
                    }
                    className="flex flex-wrap gap-2"
                  >
                    <ToggleGroupItem value="straight">直毛</ToggleGroupItem>
                    <ToggleGroupItem value="slightly_wavy">ややクセ</ToggleGroupItem>
                    <ToggleGroupItem value="strongly_wavy">強いクセ</ToggleGroupItem>
                    <ToggleGroupItem value="thick">太い</ToggleGroupItem>
                    <ToggleGroupItem value="thin">細い</ToggleGroupItem>
                  </ToggleGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
              <FormItem className="mt-4">
                <FormLabel>ボリューム感</FormLabel>
                <FormControl>
                  <ToggleGroup
                    type="single"
                    value={form.watch('volume') ?? ''}
                    onValueChange={(val) =>
                      form.setValue(
                        'volume',
                        val as z.infer<typeof QuestionnaireSchema.shape.volume>
                      )
                    }
                    className="flex flex-wrap gap-2"
                  >
                    <ToggleGroupItem value="spread">広がりやすい</ToggleGroupItem>
                    <ToggleGroupItem value="flat">ペタッとしやすい</ToggleGroupItem>
                    <ToggleGroupItem value="normal">ちょうど良い</ToggleGroupItem>
                  </ToggleGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
              <FormItem className="mt-4">
                <FormLabel>頭皮の状態</FormLabel>
                <FormControl>
                  <ToggleGroup
                    type="multiple"
                    value={form.watch('scalp')}
                    onValueChange={(vals) =>
                      form.setValue(
                        'scalp',
                        vals as z.infer<typeof QuestionnaireSchema.shape.scalp>
                      )
                    }
                    className="flex flex-wrap gap-2"
                  >
                    <ToggleGroupItem value="sensitive">敏感</ToggleGroupItem>
                    <ToggleGroupItem value="normal">普通</ToggleGroupItem>
                    <ToggleGroupItem value="dandruff">フケ・かゆみあり</ToggleGroupItem>
                    <ToggleGroupItem value="allergy">アレルギー体質</ToggleGroupItem>
                  </ToggleGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
              <FormItem className="mt-4">
                <FormLabel>過去のトラブル</FormLabel>
                <FormControl>
                  <Textarea
                    rows={6}
                    {...form.register('trouble')}
                    placeholder="例：かぶれ、かゆみ、アレルギー反応が出たことがある"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            </>
          )}
          {step === 6 && (
            <>
              <FormItem>
                <FormLabel>普段のスタイリング方法</FormLabel>
                <FormControl>
                  <ToggleGroup
                    className="flex flex-wrap gap-2"
                    type="multiple"
                    value={form.watch('stylingMethod')}
                    onValueChange={(vals) =>
                      form.setValue(
                        'stylingMethod',
                        vals as z.infer<typeof QuestionnaireSchema.shape.stylingMethod>
                      )
                    }
                  >
                    <ToggleGroupItem value="dry">ドライのみ</ToggleGroupItem>
                    <ToggleGroupItem value="iron">アイロン／コテ使用</ToggleGroupItem>
                    <ToggleGroupItem value="wax">ワックス／オイル使用</ToggleGroupItem>
                  </ToggleGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
              <FormItem className="mt-4">
                <FormLabel>スタイリング時間</FormLabel>
                <FormControl>
                  <ToggleGroup
                    type="single"
                    value={form.watch('stylingTime') ?? ''}
                    onValueChange={(val) =>
                      form.setValue(
                        'stylingTime',
                        val as z.infer<typeof QuestionnaireSchema.shape.stylingTime>
                      )
                    }
                  >
                    <ToggleGroupItem value="none">0分（何もしない）</ToggleGroupItem>
                    <ToggleGroupItem value="short">5分以内</ToggleGroupItem>
                    <ToggleGroupItem value="long">10分以上</ToggleGroupItem>
                  </ToggleGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
              <FormItem className="mt-4">
                <FormLabel>使用しているヘアケア製品</FormLabel>
                <FormControl>
                  <div className="flex flex-col gap-4">
                    <Input {...form.register('careShampoo')} placeholder="例：○○シャンプー" />
                    <Input {...form.register('careTreatment')} placeholder="例：○○トリートメント" />
                    <Input {...form.register('careStyling')} placeholder="例：ワックス、オイル" />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
              <FormItem className="mt-4">
                <FormLabel>スタイリングで困っていること</FormLabel>
                <FormControl>
                  <Textarea
                    rows={6}
                    {...form.register('stylingTrouble')}
                    placeholder="例：湿気で広がる、セットがすぐ崩れる"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            </>
          )}
          {step === 7 && (
            <>
              <FormItem>
                <FormLabel>職場や学校の規定</FormLabel>
                <FormControl>
                  <ToggleGroup
                    type="single"
                    value={form.watch('workRule') ?? ''}
                    onValueChange={(val) =>
                      form.setValue(
                        'workRule',
                        val as z.infer<typeof QuestionnaireSchema.shape.workRule>
                      )
                    }
                    className="flex flex-wrap gap-2"
                  >
                    <ToggleGroupItem value="none">特になし</ToggleGroupItem>
                    <ToggleGroupItem value="haircolor_ng">髪色NG</ToggleGroupItem>
                    <ToggleGroupItem value="length_limit">長さの制限あり</ToggleGroupItem>
                  </ToggleGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            </>
          )}
          {step === 8 && (
            <>
              <FormItem>
                <FormLabel>カラー</FormLabel>
                <FormControl>
                  <ToggleGroup
                    type="single"
                    value={form.watch('colorHistory') ?? ''}
                    onValueChange={(val) =>
                      form.setValue(
                        'colorHistory',
                        val as z.infer<typeof QuestionnaireSchema.shape.colorHistory>
                      )
                    }
                    className="flex flex-wrap gap-2"
                  >
                    <ToggleGroupItem value="none">なし</ToggleGroupItem>
                    <ToggleGroupItem value="yes">あり</ToggleGroupItem>
                  </ToggleGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
              {form.watch('colorHistory') === 'yes' && (
                <div className="flex flex-col gap-4 mt-4">
                  <Label>最後にカラーしたのはいつですか？</Label>

                  <Select
                    value={form.watch('permLastMonth') ?? ''}
                    onValueChange={(val) =>
                      form.setValue(
                        'permLastMonth',
                        val as z.infer<typeof QuestionnaireSchema.shape.permLastMonth>
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="何ヶ月前にしましたか？" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1ヶ月以内">1ヶ月以内</SelectItem>
                      <SelectItem value="1ヶ月前">1ヶ月前</SelectItem>
                      <SelectItem value="2ヶ月前">2ヶ月前</SelectItem>
                      <SelectItem value="3ヶ月前">3ヶ月前</SelectItem>
                      <SelectItem value="4ヶ月前">4ヶ月前</SelectItem>
                      <SelectItem value="5ヶ月前">5ヶ月前</SelectItem>
                      <SelectItem value="6ヶ月前">6ヶ月前</SelectItem>
                      <SelectItem value="半年以上">半年以上</SelectItem>
                    </SelectContent>
                  </Select>
                  <Label>カラーした際の色はなんですか？</Label>
                  <Input
                    {...form.register('colorType')}
                    placeholder="例：アッシュブラウン、ピンク系"
                    className="w-full"
                  />
                </div>
              )}

              <FormItem className="mt-4">
                <FormLabel>パーマ／縮毛矯正</FormLabel>
                <FormControl>
                  <ToggleGroup
                    type="single"
                    value={form.watch('permHistory') ?? ''}
                    onValueChange={(val) =>
                      form.setValue(
                        'permHistory',
                        val as z.infer<typeof QuestionnaireSchema.shape.permHistory>
                      )
                    }
                    className="flex flex-wrap gap-2"
                  >
                    <ToggleGroupItem value="none">なし</ToggleGroupItem>
                    <ToggleGroupItem value="perm">パーマ</ToggleGroupItem>
                    <ToggleGroupItem value="straight">縮毛矯正</ToggleGroupItem>
                  </ToggleGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
              {['perm', 'straight'].includes(form.watch('permHistory')) && (
                <FormItem className="mt-4">
                  <FormLabel>パーマ／縮毛矯正をしたのはいつですか？</FormLabel>
                  <FormControl>
                    <Select
                      value={form.watch('permLastMonth') ?? ''}
                      onValueChange={(val) =>
                        form.setValue(
                          'permLastMonth',
                          val as z.infer<typeof QuestionnaireSchema.shape.permLastMonth>
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="何ヶ月前にしましたか？" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1ヶ月以内">1ヶ月以内</SelectItem>
                        <SelectItem value="1ヶ月前">1ヶ月前</SelectItem>
                        <SelectItem value="2ヶ月前">2ヶ月前</SelectItem>
                        <SelectItem value="3ヶ月前">3ヶ月前</SelectItem>
                        <SelectItem value="4ヶ月前">4ヶ月前</SelectItem>
                        <SelectItem value="5ヶ月前">5ヶ月前</SelectItem>
                        <SelectItem value="6ヶ月前">6ヶ月前</SelectItem>
                        <SelectItem value="半年以上">半年以上</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                </FormItem>
              )}

              <FormItem className="mt-4">
                <FormLabel>ブリーチ</FormLabel>
                <FormControl>
                  <ToggleGroup
                    type="single"
                    value={form.watch('bleachHistory') ?? ''}
                    onValueChange={(val) =>
                      form.setValue(
                        'bleachHistory',
                        val as z.infer<typeof QuestionnaireSchema.shape.bleachHistory>
                      )
                    }
                    className="flex flex-wrap gap-2"
                  >
                    <ToggleGroupItem value="none">なし</ToggleGroupItem>
                    <ToggleGroupItem value="yes">あり</ToggleGroupItem>
                  </ToggleGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
              {form.watch('bleachHistory') === 'yes' && (
                <div className="flex flex-col gap-4 mt-4">
                  <Label>現在の髪の毛をブリーチをした回数は？</Label>
                  <Select
                    value={form.watch('bleachCount') ?? ''}
                    onValueChange={(val) =>
                      form.setValue(
                        'bleachCount',
                        val as z.infer<typeof QuestionnaireSchema.shape.bleachCount>
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="何回ブリーチしましたか？" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1回">1回</SelectItem>
                      <SelectItem value="2回">2回</SelectItem>
                      <SelectItem value="3回">3回</SelectItem>
                      <SelectItem value="4回">4回</SelectItem>
                      <SelectItem value="5回">5回</SelectItem>
                      <SelectItem value="5回以上">5回以上</SelectItem>
                    </SelectContent>
                  </Select>
                  <Label>ブリーチした部分はどこですか？</Label>
                  <Select
                    value={form.watch('bleachPart') ?? ''}
                    onValueChange={(val) =>
                      form.setValue(
                        'bleachPart',
                        val as z.infer<typeof QuestionnaireSchema.shape.bleachPart>
                      )
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="部分 or 全体" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="part">部分</SelectItem>
                      <SelectItem value="all">全体</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <FormItem className="mt-4">
                <FormLabel>傷みの気になる箇所</FormLabel>
                <FormControl>
                  <ToggleGroup
                    type="single"
                    value={form.watch('damagePart') ?? ''}
                    onValueChange={(val) =>
                      form.setValue(
                        'damagePart',
                        val as z.infer<typeof QuestionnaireSchema.shape.damagePart>
                      )
                    }
                    className="flex flex-wrap gap-2"
                  >
                    <ToggleGroupItem value="tip">毛先</ToggleGroupItem>
                    <ToggleGroupItem value="all">全体</ToggleGroupItem>
                    <ToggleGroupItem value="none">特にない</ToggleGroupItem>
                  </ToggleGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            </>
          )}
          {step === 9 && (
            <FormItem>
              <FormLabel>その他ご希望・ご質問</FormLabel>
              <FormControl>
                <Textarea
                  rows={6}
                  {...form.register('otherRequest')}
                  placeholder="例：ケア方法の相談をしたい、乾かし方のコツを知りたい、NGなこと：短くしすぎないでほしい"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
          {step === totalSteps && (
            <div className="flex flex-col gap-6 mt-4">
              {/* 希望スタイル */}
              <div className="">
                <div className="text-muted-foreground text-xs mb-2">希望スタイル</div>
                <div className="flex flex-col gap-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground font-medium w-24 text-sm">ご希望</span>
                    <span className="flex flex-wrap gap-1 justify-end">
                      {form.getValues().styleWishType.length > 0 ? (
                        form
                          .getValues()
                          .styleWishType.map((v: string) => (
                            <Badge key={v}>
                              {v === 'omakase'
                                ? 'おまかせ'
                                : v === 'image'
                                  ? 'イメージ画像有り'
                                  : '希望のスタイルを具体的に'}
                            </Badge>
                          ))
                      ) : (
                        <span className="text-muted-foreground text-sm">未入力</span>
                      )}
                    </span>
                  </div>
                  {form.getValues().styleWishType.includes('specific') && (
                    <div className="flex justify-between items-center w-full">
                      <span className="text-muted-foreground font-medium w-1/3 text-sm">
                        具体的な希望
                      </span>
                      <span className="w-2/3 text-end">
                        {form.getValues().specificStyle || (
                          <span className="text-muted-foreground text-sm">未入力</span>
                        )}
                      </span>
                    </div>
                  )}
                  {form.getValues().styleWishType.includes('image') && (
                    <div className="flex justify-between items-center w-full">
                      <span className="text-muted-foreground font-medium w-1/3 text-sm">
                        理想のイメージ
                      </span>

                      {hairImgPreviewUrl ? (
                        <Image
                          src={hairImgPreviewUrl}
                          alt="理想のイメージ"
                          width={100}
                          height={100}
                        />
                      ) : (
                        <span className="text-muted-foreground text-sm">未入力</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <Separator />
              {/* 目的 */}
              <div className="">
                <div className="text-muted-foreground text-xs mb-2">今回の目的</div>
                <div className="flex flex-col gap-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground font-medium w-24 text-sm">目的</span>
                    <span className="flex flex-wrap gap-1 justify-end">
                      {form.getValues().purpose.length > 0 ? (
                        form.getValues().purpose.map((v: string) => (
                          <span
                            key={v}
                            className="inline-block bg-muted border border-border text-muted-foreground rounded px-2 py-1 text-xs mr-1"
                          >
                            {v === 'change'
                              ? 'イメチェン'
                              : v === 'keep'
                                ? '現状維持'
                                : v === 'trim'
                                  ? '少し整える'
                                  : v === 'volume'
                                    ? '毛量調整のみ'
                                    : 'その他'}
                          </span>
                        ))
                      ) : (
                        <span className="text-muted-foreground text-sm">未入力</span>
                      )}
                    </span>
                  </div>
                  {form.getValues().purpose.includes('other') && (
                    <div className="flex justify-between items-center w-full">
                      <span className="text-muted-foreground font-medium w-1/3 text-sm">
                        その他の内容
                      </span>
                      <span className="w-2/3 text-end">
                        {form.getValues().purposeOther || (
                          <span className="text-muted-foreground text-sm">未入力</span>
                        )}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <Separator />
              {/* 満足度・髪型 */}
              <div className="">
                <div className="text-muted-foreground text-xs mb-2">現在の髪型</div>
                <div className="flex flex-col gap-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground font-medium w-24 text-sm">満足度</span>
                    <span className="w-2/3 text-end">
                      {form.getValues().satisfaction === 'good' ? (
                        '満足'
                      ) : form.getValues().satisfaction === 'neutral' ? (
                        '普通'
                      ) : form.getValues().satisfaction === 'bad' ? (
                        '不満'
                      ) : (
                        <span className="text-muted-foreground text-sm">未入力</span>
                      )}
                    </span>
                  </div>
                  {form.getValues().satisfaction === 'bad' && (
                    <div className="flex justify-between items-center w-full">
                      <span className="text-muted-foreground font-medium w-1/3 text-sm">
                        不満の理由
                      </span>
                      <span className="w-2/3 text-end">
                        {form.getValues().satisfactionOther || (
                          <span className="text-muted-foreground text-sm">未入力</span>
                        )}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center w-full">
                    <span className="text-muted-foreground font-medium w-1/3 text-sm">
                      気に入っている点・嫌いな点
                    </span>
                    <span className="w-2/3 text-end">
                      {form.getValues().likePoint || (
                        <span className="text-muted-foreground text-sm">未入力</span>
                      )}
                    </span>
                  </div>
                </div>
              </div>
              <Separator />
              {/* 髪の長さ・前髪・重さ */}
              <div className="">
                <div className="text-muted-foreground text-xs mb-2">髪の長さ・前髪・重さ</div>
                <div className="flex flex-col gap-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground font-medium w-24 text-sm">長さ</span>
                    <span className="w-2/3 text-end">
                      {form.getValues().currentLength === 'short' ? (
                        '短め'
                      ) : form.getValues().currentLength === 'bob' ? (
                        'ボブ'
                      ) : form.getValues().currentLength === 'medium' ? (
                        '中長め'
                      ) : form.getValues().currentLength === 'long' ? (
                        '長め'
                      ) : (
                        <span className="text-muted-foreground text-sm">未入力</span>
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground font-medium w-24 text-sm">前髪</span>
                    <span className="w-2/3 text-end">
                      {form.getValues().frontHair === 'make' ? (
                        '作る'
                      ) : form.getValues().frontHair === 'nothing' ? (
                        'カットしない'
                      ) : form.getValues().frontHair === 'stretching' ? (
                        '伸ばす'
                      ) : form.getValues().frontHair === 'adjustment' ? (
                        '長さ調整'
                      ) : (
                        <span className="text-muted-foreground text-sm">未入力</span>
                      )}
                    </span>
                  </div>
                  {form.getValues().frontHair === 'make' && (
                    <div className="flex justify-between items-center w-full">
                      <span className="text-muted-foreground font-medium w-1/3 text-sm">
                        前髪の長さ
                      </span>
                      <span className="w-2/3 text-end">
                        {form.getValues().frontHairLength || (
                          <span className="text-muted-foreground text-sm">未入力</span>
                        )}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground font-medium w-24 text-sm">量・重さ</span>
                    <span className="w-2/3 text-end">
                      {form.getValues().hairWeight === 'light' ? (
                        '軽め'
                      ) : form.getValues().hairWeight === 'medium' ? (
                        '中くらい'
                      ) : form.getValues().hairWeight === 'heavy' ? (
                        '重め'
                      ) : (
                        <span className="text-muted-foreground text-sm">未入力</span>
                      )}
                    </span>
                  </div>
                </div>
              </div>
              <Separator />
              {/* 髪質・ボリューム・頭皮 */}
              <div className="">
                <div className="text-muted-foreground text-xs mb-2">髪質・ボリューム・頭皮</div>
                <div className="flex flex-col gap-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground font-medium w-24 text-sm">髪質</span>
                    <span className="flex flex-wrap gap-1 justify-end w-2/3">
                      {form.getValues().hairType.length > 0 ? (
                        form.getValues().hairType.map((v: string) => (
                          <span
                            key={v}
                            className="inline-block bg-muted border border-border text-muted-foreground rounded px-2 py-1 text-xs mr-1"
                          >
                            {v === 'straight'
                              ? '直毛'
                              : v === 'slightly_wavy'
                                ? 'ややクセ'
                                : v === 'strongly_wavy'
                                  ? '強いクセ'
                                  : v === 'thick'
                                    ? '太い'
                                    : '細い'}
                          </span>
                        ))
                      ) : (
                        <span className="text-muted-foreground text-sm">未入力</span>
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground font-medium w-24 text-sm">
                      ボリューム感
                    </span>
                    <span className="w-2/3 text-end">
                      {form.getValues().volume === 'spread' ? (
                        '広がりやすい'
                      ) : form.getValues().volume === 'flat' ? (
                        'ペタッとしやすい'
                      ) : form.getValues().volume === 'normal' ? (
                        'ちょうど良い'
                      ) : (
                        <span className="text-muted-foreground text-sm">未入力</span>
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground font-medium w-24 text-sm">
                      頭皮の状態
                    </span>
                    <span className="flex flex-wrap gap-1 justify-end w-2/3">
                      {form.getValues().scalp.length > 0 ? (
                        form.getValues().scalp.map((v: string) => (
                          <span
                            key={v}
                            className="inline-block bg-muted border border-border text-muted-foreground rounded px-2 py-1 text-xs mr-1"
                          >
                            {v === 'sensitive'
                              ? '敏感'
                              : v === 'normal'
                                ? '普通'
                                : v === 'dandruff'
                                  ? 'フケ・かゆみあり'
                                  : 'アレルギー体質'}
                          </span>
                        ))
                      ) : (
                        <span className="text-muted-foreground text-sm">未入力</span>
                      )}
                    </span>
                  </div>
                </div>
              </div>
              <Separator />
              {/* スタイリング */}
              <div className="">
                <div className="text-muted-foreground text-xs mb-2">スタイリング</div>
                <div className="flex flex-col gap-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground font-medium w-24 text-sm">
                      普段の方法
                    </span>
                    <span className="flex flex-wrap gap-1 justify-end w-2/3">
                      {form.getValues().stylingMethod.length > 0 ? (
                        form.getValues().stylingMethod.map((v: string) => (
                          <span
                            key={v}
                            className="inline-block bg-slate-200 border border-slate-300 text-slate-700 rounded px-2 py-1 text-xs mr-1"
                          >
                            {v === 'dry'
                              ? 'ドライのみ'
                              : v === 'iron'
                                ? 'アイロン／コテ使用'
                                : 'ワックス／オイル使用'}
                          </span>
                        ))
                      ) : (
                        <span className="text-muted-foreground text-sm">未入力</span>
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground font-medium w-24 text-sm">
                      スタイリング時間
                    </span>
                    <span className="w-2/3 text-end">
                      {form.getValues().stylingTime === 'none' ? (
                        '0分（何もしない）'
                      ) : form.getValues().stylingTime === 'short' ? (
                        '5分以内'
                      ) : form.getValues().stylingTime === 'long' ? (
                        '10分以上'
                      ) : (
                        <span className="text-muted-foreground text-sm">未入力</span>
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground font-medium w-24 text-sm">
                      シャンプー
                    </span>
                    <span className="w-2/3 text-end">
                      {form.getValues().careShampoo || (
                        <span className="text-muted-foreground text-sm">未入力</span>
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground font-medium w-24 text-sm">
                      トリートメント
                    </span>
                    <span className="w-2/3 text-end">
                      {form.getValues().careTreatment || (
                        <span className="text-muted-foreground text-sm">未入力</span>
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground font-medium w-24 text-sm">
                      スタイリング剤
                    </span>
                    <span className="w-2/3 text-end">
                      {form.getValues().careStyling || (
                        <span className="text-muted-foreground text-sm">未入力</span>
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground font-medium w-24 text-sm">
                      困っていること
                    </span>
                    <span className="w-2/3 text-end">
                      {form.getValues().stylingTrouble || (
                        <span className="text-muted-foreground text-sm">未入力</span>
                      )}
                    </span>
                  </div>
                </div>
              </div>
              <Separator />
              {/* 職場や学校の規定・ライフスタイル */}
              <div className="">
                <div className="text-muted-foreground text-xs mb-2">職場・ライフスタイル</div>
                <div className="flex flex-col gap-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground w-24 text-sm">職場や学校の規定</span>
                    <span className="w-2/3 text-end">
                      {form.getValues().workRule === 'none' ? (
                        '特になし'
                      ) : form.getValues().workRule === 'haircolor_ng' ? (
                        '髪色NG'
                      ) : form.getValues().workRule === 'length_limit' ? (
                        '長さの制限あり'
                      ) : (
                        <span className="text-muted-foreground text-sm">未入力</span>
                      )}
                    </span>
                  </div>

                  {form.getValues().lifestyle.includes('other') && (
                    <div className="flex justify-between items-center w-full">
                      <span className="text-muted-foreground font-medium w-1/3 text-sm">
                        その他の内容
                      </span>
                      <span className="w-2/3 text-end">
                        {form.getValues().lifestyleOther || (
                          <span className="text-muted-foreground text-sm">未入力</span>
                        )}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <Separator />
              {/* カラー・パーマ・ブリーチ・ダメージ */}
              <div className="">
                <div className="text-muted-foreground text-xs mb-2">
                  カラー・パーマ・ブリーチ・ダメージ
                </div>
                <div className="flex flex-col gap-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground font-medium w-24 text-sm">
                      カラー履歴
                    </span>
                    <span className="w-2/3 text-end">
                      {form.getValues().colorHistory === 'none' ? (
                        'なし'
                      ) : form.getValues().colorHistory === 'yes' ? (
                        'あり'
                      ) : (
                        <span className="text-muted-foreground text-sm">未入力</span>
                      )}
                    </span>
                  </div>
                  {form.getValues().colorHistory === 'yes' && (
                    <>
                      <div className="flex justify-between items-center w-full">
                        <span className="text-muted-foreground font-medium w-1/3 text-sm">
                          最終カラー時期
                        </span>
                        <span className="w-2/3 text-end">
                          {form.getValues().colorLastMonth || (
                            <span className="text-muted-foreground text-sm">未入力</span>
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between items-center w-full">
                        <span className="text-muted-foreground font-medium w-1/3 text-sm">
                          カラーの色
                        </span>
                        <span className="w-2/3 text-end">
                          {form.getValues().colorType || (
                            <span className="text-muted-foreground text-sm">未入力</span>
                          )}
                        </span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground font-medium w-24 text-sm">
                      パーマ／縮毛矯正履歴
                    </span>
                    <span className="w-2/3 text-end">
                      {form.getValues().permHistory === 'none' ? (
                        'なし'
                      ) : form.getValues().permHistory === 'perm' ? (
                        'パーマ'
                      ) : form.getValues().permHistory === 'straight' ? (
                        '縮毛矯正'
                      ) : (
                        <span className="text-muted-foreground text-sm">未入力</span>
                      )}
                    </span>
                  </div>
                  {['perm', 'straight'].includes(form.getValues().permHistory) && (
                    <div className="flex justify-between items-center w-full">
                      <span className="text-muted-foreground font-medium w-1/3 text-sm">
                        最終パーマ時期
                      </span>
                      <span className="w-2/3 text-end">
                        {form.getValues().permLastMonth || (
                          <span className="text-muted-foreground text-sm">未入力</span>
                        )}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground font-medium w-24 text-sm">
                      ブリーチ履歴
                    </span>
                    <span className="w-2/3 text-end">
                      {form.getValues().bleachHistory === 'none' ? (
                        'なし'
                      ) : form.getValues().bleachHistory === 'yes' ? (
                        'あり'
                      ) : (
                        <span className="text-muted-foreground text-sm">未入力</span>
                      )}
                    </span>
                  </div>
                  {form.getValues().bleachHistory === 'yes' && (
                    <>
                      <div className="flex justify-between items-center w-full">
                        <span className="text-muted-foreground font-medium w-1/3 text-sm">
                          ブリーチ回数
                        </span>
                        <span className="w-2/3 text-end">
                          {form.getValues().bleachCount || (
                            <span className="text-muted-foreground text-sm">未入力</span>
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between items-center w-full">
                        <span className="text-muted-foreground w-1/3 text-sm">ブリーチ部分</span>
                        <span className="w-2/3 text-end">
                          {form.getValues().bleachPart === 'part' ? (
                            '部分'
                          ) : form.getValues().bleachPart === 'all' ? (
                            '全体'
                          ) : (
                            <span className="text-muted-foreground text-sm">未入力</span>
                          )}
                        </span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground font-medium w-24 text-sm">
                      傷みの気になる箇所
                    </span>
                    <span className="w-2/3 text-end">
                      {form.getValues().damagePart === 'tip' ? (
                        '毛先'
                      ) : form.getValues().damagePart === 'all' ? (
                        '全体'
                      ) : form.getValues().damagePart === 'none' ? (
                        '特にない'
                      ) : (
                        <span className="text-muted-foreground text-sm">未入力</span>
                      )}
                    </span>
                  </div>
                </div>
              </div>
              <Separator />
              {/* その他ご希望・ご質問 */}
              <div className="">
                <div className="text-muted-foreground text-xs mb-2">その他ご希望・ご質問</div>
                <div className="flex flex-col gap-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground font-medium w-24 text-sm">
                      ご希望・ご質問
                    </span>
                    <span className="w-2/3 text-end">
                      {form.getValues().otherRequest || (
                        <span className="text-muted-foreground text-sm">未入力</span>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div className="flex justify-end gap-10 pt-4 w-full">
            {step > 1 && (
              <Button variant="outline" className="w-full " onClick={back}>
                戻る
              </Button>
            )}

            {step < totalSteps ? (
              <Button className="w-full" onClick={handleNext}>
                次へ
              </Button>
            ) : null}
          </div>
        </Form>
      </div>
    </div>
  )
}
