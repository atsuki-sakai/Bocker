-- =========================================================================
-- カルテテーブル拡張（顧客記入・店舗記入フィールド追加）
-- =========================================================================
-- 作成日: 2025年7月11日
-- 目的: カルテに顧客記入項目、店舗記入項目、共通項目を追加
-- 対象環境: 開発環境（DEV_Bocker）
-- =========================================================================

-- カルテテーブルに新しいフィールドを追加
-- 全て NULL 許可で、適切なデフォルト値を設定

-- 🟢【お客様が記入する項目】 - 顧客の主観や好みが重要なもの
ALTER TABLE public.carte ADD COLUMN IF NOT EXISTS prefer_silence BOOLEAN DEFAULT NULL;
COMMENT ON COLUMN public.carte.prefer_silence IS '静かに過ごしたい（お客様記入）';

ALTER TABLE public.carte ADD COLUMN IF NOT EXISTS avoid_chemicals TEXT DEFAULT NULL;
COMMENT ON COLUMN public.carte.avoid_chemicals IS '使用してほしくない薬剤や苦手な成分（お客様記入）';

ALTER TABLE public.carte ADD COLUMN IF NOT EXISTS has_sensitive_skin BOOLEAN DEFAULT NULL;
COMMENT ON COLUMN public.carte.has_sensitive_skin IS '敏感肌・アレルギー有無（お客様記入）';

ALTER TABLE public.carte ADD COLUMN IF NOT EXISTS sensitive_skin_detail TEXT DEFAULT NULL;
COMMENT ON COLUMN public.carte.sensitive_skin_detail IS '敏感肌・アレルギー詳細（お客様記入）';

ALTER TABLE public.carte ADD COLUMN IF NOT EXISTS fragrance_sensitivity BOOLEAN DEFAULT NULL;
COMMENT ON COLUMN public.carte.fragrance_sensitivity IS '香りに敏感・苦手（お客様記入）';

ALTER TABLE public.carte ADD COLUMN IF NOT EXISTS use_contact_lenses BOOLEAN DEFAULT NULL;
COMMENT ON COLUMN public.carte.use_contact_lenses IS 'コンタクトレンズの使用有無（お客様記入）';

ALTER TABLE public.carte ADD COLUMN IF NOT EXISTS avoid_sales_talk BOOLEAN DEFAULT NULL;
COMMENT ON COLUMN public.carte.avoid_sales_talk IS '商品紹介・セールスを控えてほしい（お客様記入）';

ALTER TABLE public.carte ADD COLUMN IF NOT EXISTS avoid_private_topics BOOLEAN DEFAULT NULL;
COMMENT ON COLUMN public.carte.avoid_private_topics IS '個人的な話題を避けたい（お客様記入）';

ALTER TABLE public.carte ADD COLUMN IF NOT EXISTS daily_styling_time INTEGER DEFAULT NULL;
COMMENT ON COLUMN public.carte.daily_styling_time IS '普段のスタイリングにかける時間（分）（お客様記入）';

ALTER TABLE public.carte ADD COLUMN IF NOT EXISTS allow_photo_sns BOOLEAN DEFAULT NULL;
COMMENT ON COLUMN public.carte.allow_photo_sns IS '写真撮影・SNS掲載の許可（お客様記入）';

-- 🔵【店舗側が記入する項目】 - 美容師やプロ目線で客観的に記録すべきもの
ALTER TABLE public.carte ADD COLUMN IF NOT EXISTS hair_thickness TEXT DEFAULT NULL;
COMMENT ON COLUMN public.carte.hair_thickness IS '髪の太さ（fine/medium/coarse）（店舗記入）';

ALTER TABLE public.carte ADD COLUMN IF NOT EXISTS hair_volume TEXT DEFAULT NULL;
COMMENT ON COLUMN public.carte.hair_volume IS '髪の量（low/medium/high）（店舗記入）';

ALTER TABLE public.carte ADD COLUMN IF NOT EXISTS hair_wave_level TEXT DEFAULT NULL;
COMMENT ON COLUMN public.carte.hair_wave_level IS '髪のくせ・うねりの程度（straight/slight/moderate/strong）（店舗記入）';

ALTER TABLE public.carte ADD COLUMN IF NOT EXISTS hair_damage_tendency BOOLEAN DEFAULT NULL;
COMMENT ON COLUMN public.carte.hair_damage_tendency IS '髪が絡まりやすい・傷みやすい（店舗記入）';

ALTER TABLE public.carte ADD COLUMN IF NOT EXISTS poor_dye_perm_retention BOOLEAN DEFAULT NULL;
COMMENT ON COLUMN public.carte.poor_dye_perm_retention IS 'カラーやパーマの持ちが悪い（店舗記入）';

ALTER TABLE public.carte ADD COLUMN IF NOT EXISTS quick_color_fade BOOLEAN DEFAULT NULL;
COMMENT ON COLUMN public.carte.quick_color_fade IS 'カラーの色落ちが早い（店舗記入）';

ALTER TABLE public.carte ADD COLUMN IF NOT EXISTS hair_dryness BOOLEAN DEFAULT NULL;
COMMENT ON COLUMN public.carte.hair_dryness IS '髪の乾燥・パサつき傾向（店舗記入）';

ALTER TABLE public.carte ADD COLUMN IF NOT EXISTS scalp_condition TEXT DEFAULT NULL;
COMMENT ON COLUMN public.carte.scalp_condition IS '頭皮の状態（normal/dry/oily/sensitive）（店舗記入）';

ALTER TABLE public.carte ADD COLUMN IF NOT EXISTS scalp_trouble_detail TEXT DEFAULT NULL;
COMMENT ON COLUMN public.carte.scalp_trouble_detail IS 'フケなど頭皮トラブル詳細（店舗記入）';

-- 🟡【両方が記入・編集できる項目】 - 顧客と店舗側で調整が必要な項目
ALTER TABLE public.carte ADD COLUMN IF NOT EXISTS prefer_hair_styling BOOLEAN DEFAULT NULL;
COMMENT ON COLUMN public.carte.prefer_hair_styling IS '仕上げにスタイリングやアイロンやコテを使用希望（共通編集）';

ALTER TABLE public.carte ADD COLUMN IF NOT EXISTS use_styling_product BOOLEAN DEFAULT NULL;
COMMENT ON COLUMN public.carte.use_styling_product IS '普段スタイリング剤を使うか（共通編集）';

-- インデックス作成（必要に応じて）
-- 検索頻度の高い項目にインデックスを追加
CREATE INDEX IF NOT EXISTS idx_carte_sensitive_skin 
  ON public.carte(tenant_id, org_id, has_sensitive_skin) 
  WHERE has_sensitive_skin = true AND is_archive = false;

CREATE INDEX IF NOT EXISTS idx_carte_hair_type_assessment 
  ON public.carte(tenant_id, org_id, hair_thickness, hair_volume) 
  WHERE is_archive = false;

CREATE INDEX IF NOT EXISTS idx_carte_scalp_condition 
  ON public.carte(tenant_id, org_id, scalp_condition) 
  WHERE scalp_condition IS NOT NULL AND is_archive = false;

-- 制約追加（値の検証）
-- 髪の太さは特定の値のみ許可
ALTER TABLE public.carte ADD CONSTRAINT check_hair_thickness 
  CHECK (hair_thickness IS NULL OR hair_thickness IN ('fine', 'medium', 'coarse'));

-- 髪の量は特定の値のみ許可
ALTER TABLE public.carte ADD CONSTRAINT check_hair_volume 
  CHECK (hair_volume IS NULL OR hair_volume IN ('low', 'medium', 'high'));

-- 髪のくせ・うねりは特定の値のみ許可
ALTER TABLE public.carte ADD CONSTRAINT check_hair_wave_level 
  CHECK (hair_wave_level IS NULL OR hair_wave_level IN ('straight', 'slight', 'moderate', 'strong'));

-- 頭皮の状態は特定の値のみ許可
ALTER TABLE public.carte ADD CONSTRAINT check_scalp_condition 
  CHECK (scalp_condition IS NULL OR scalp_condition IN ('normal', 'dry', 'oily', 'sensitive'));

-- スタイリング時間は0-120分の範囲で制限
ALTER TABLE public.carte ADD CONSTRAINT check_daily_styling_time 
  CHECK (daily_styling_time IS NULL OR (daily_styling_time >= 0 AND daily_styling_time <= 120));

-- テーブルコメント更新
COMMENT ON TABLE public.carte IS 'カルテ基本情報（拡張：顧客記入・店舗記入項目対応）';

-- 成功ログ
DO $$
BEGIN
    RAISE NOTICE '✅ カルテテーブル拡張マイグレーション完了';
    RAISE NOTICE '   - 🟢 顧客記入項目: 10フィールド追加';
    RAISE NOTICE '   - 🔵 店舗記入項目: 9フィールド追加';
    RAISE NOTICE '   - 🟡 共通編集項目: 2フィールド追加';
    RAISE NOTICE '   - インデックス: 3個追加';
    RAISE NOTICE '   - 制約: 5個追加';
    RAISE NOTICE '   - 対象環境: 開発環境（DEV_Bocker）';
END $$;