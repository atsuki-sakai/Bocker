import { z } from 'zod'

// UTMパラメータの型定義
export const UTMParametersSchema = z.object({
  utm_source: z.string().optional(),
  utm_medium: z.string().optional(),
  utm_campaign: z.string().optional(),
  utm_term: z.string().optional(),
  utm_content: z.string().optional(),
})

export type UTMParameters = z.infer<typeof UTMParametersSchema>

// プリセットの型定義
export const PresetSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  category: z.enum(['social', 'ads', 'email', 'custom']),
  utm_parameters: UTMParametersSchema,
  created_at: z.date(),
  is_default: z.boolean().default(false),
})

export type Preset = z.infer<typeof PresetSchema>

// URL生成用の型定義
export const URLGeneratorConfigSchema = z.object({
  base_url: z.string().url(),
  utm_parameters: UTMParametersSchema,
  generate_qr: z.boolean().default(false),
})

export type URLGeneratorConfig = z.infer<typeof URLGeneratorConfigSchema>

// プリセットカテゴリの表示名
export const PRESET_CATEGORIES = {
  social: 'ソーシャルメディア',
  ads: '広告・プロモーション',
  email: 'メール・DM',
  custom: 'カスタム',
} as const

// デフォルトプリセット
export const DEFAULT_PRESETS: Omit<Preset, 'id' | 'created_at'>[] = [
  {
    name: 'Instagram投稿',
    description: 'Instagram投稿用のパラメータ',
    category: 'social',
    utm_parameters: {
      utm_source: 'instagram',
      utm_medium: 'social',
      utm_campaign: '',
      utm_content: 'post',
    },
    is_default: true,
  },
  {
    name: 'Instagramストーリー',
    description: 'Instagramストーリー用のパラメータ',
    category: 'social',
    utm_parameters: {
      utm_source: 'instagram',
      utm_medium: 'social',
      utm_campaign: '',
      utm_content: 'story',
    },
    is_default: true,
  },
  {
    name: 'Google広告',
    description: 'Google広告用のパラメータ',
    category: 'ads',
    utm_parameters: {
      utm_source: 'google',
      utm_medium: 'cpc',
      utm_campaign: '',
      utm_term: '',
      utm_content: '',
    },
    is_default: true,
  },
  {
    name: 'Facebook広告',
    description: 'Facebook広告用のパラメータ',
    category: 'ads',
    utm_parameters: {
      utm_source: 'facebook',
      utm_medium: 'cpc',
      utm_campaign: '',
      utm_content: '',
    },
    is_default: true,
  },
  {
    name: 'LINE公式アカウント',
    description: 'LINE公式アカウント投稿用',
    category: 'social',
    utm_parameters: {
      utm_source: 'line',
      utm_medium: 'social',
      utm_campaign: '',
      utm_content: 'official',
    },
    is_default: true,
  },
  {
    name: 'メール配信',
    description: 'メール配信用のパラメータ',
    category: 'email',
    utm_parameters: {
      utm_source: 'email',
      utm_medium: 'email',
      utm_campaign: '',
      utm_content: 'newsletter',
    },
    is_default: true,
  },
]

// UTMパラメータのフィールド情報
export const UTM_FIELD_CONFIG = {
  utm_source: {
    label: '参照元 (Source)',
    description: 'トラフィックの発生元（例: google, facebook, instagram）',
    placeholder: 'google',
    required: true,
  },
  utm_medium: {
    label: 'メディア (Medium)',
    description: 'マーケティング媒体（例: cpc, social, email）',
    placeholder: 'cpc',
    required: false,
  },
  utm_campaign: {
    label: 'キャンペーン (Campaign)',
    description: 'キャンペーン名（例: summer_sale, new_menu）',
    placeholder: 'summer_sale',
    required: false,
  },
  utm_term: {
    label: 'キーワード (Term)',
    description: '検索キーワード（主にリスティング広告用）',
    placeholder: '美容室+予約',
    required: false,
  },
  utm_content: {
    label: 'コンテンツ (Content)',
    description: 'A/Bテスト用の識別子（例: banner1, text_link）',
    placeholder: 'banner1',
    required: false,
  },
} as const

// よく使われるUTM値の候補
export const UTM_SUGGESTIONS = {
  utm_source: ['google', 'facebook', 'instagram', 'line', 'twitter', 'youtube', 'direct', 'email'],
  utm_medium: ['cpc', 'social', 'email', 'organic', 'referral', 'banner', 'affiliate'],
  utm_campaign: ['summer_sale', 'new_menu', 'grand_opening', 'holiday_special', 'birthday_campaign'],
  utm_content: ['post', 'story', 'banner1', 'banner2', 'text_link', 'button', 'header', 'footer'],
  utm_term: ['美容室', 'ヘアサロン', '予約', 'カット', 'カラー', 'パーマ', 'トリートメント'],
} as const