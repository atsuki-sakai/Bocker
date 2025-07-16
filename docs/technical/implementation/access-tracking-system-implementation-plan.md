# アクセストラッキングシステム実装計画書

## 📋 システム概要

### 目的
美容サロン向けSaaSプラットフォーム「Bocker」において、流入元別のアクセス追跡とコンバージョン測定によるROI分析機能を提供する。

### 主要機能
- **流入元判定**: 8種類の流入元（LINE、Instagram、Facebook、Google Maps、Twitter、TikTok、YouTube、Web）を自動識別
- **コンバージョン測定**: 予約完了時の自動コンバージョン記録と売上価値追跡
- **ROI分析**: 流入元別のコンバージョン率、売上、ROI計算
- **ダッシュボード**: リアルタイムデータ可視化と期間比較機能

### アーキテクチャ概要
```
ユーザーアクセス
    ↓
Next.jsミドルウェア（流入元判定・セッション管理）
    ↓
Supabase RPC関数（訪問記録）
    ↓ （予約完了時）
Convex Action → Supabase RPC関数（コンバージョン記録）
    ↓
TrackingRepository（データ分析）
    ↓
React Dashboard（可視化）
```

### データ量・パフォーマンス想定
- **3,000店舗規模**: 月間93,000レコード
- **年間データ量**: 約110万レコード（100MB程度）
- **追加インフラコスト**: 0円（既存Supabase範囲内）
- **同一ユーザー検知**: 24時間Cookieベースの基本的な重複除去

---

## 🗄️ データベース設計

### パーティション設計

#### 親テーブル
```sql
-- supabase/migrations/20250715000001_create_tracking_base.sql
CREATE TABLE tracking_summary (
    id SERIAL,
    tenant_id TEXT NOT NULL,
    org_id TEXT NOT NULL,
    date DATE NOT NULL,
    
    -- 流入元別訪問数
    line_visits INTEGER DEFAULT 0,
    instagram_visits INTEGER DEFAULT 0,
    facebook_visits INTEGER DEFAULT 0,
    google_map_visits INTEGER DEFAULT 0,
    twitter_visits INTEGER DEFAULT 0,
    tiktok_visits INTEGER DEFAULT 0,
    youtube_visits INTEGER DEFAULT 0,
    web_visits INTEGER DEFAULT 0,
    
    -- 流入元別コンバージョン数
    line_conversions INTEGER DEFAULT 0,
    instagram_conversions INTEGER DEFAULT 0,
    facebook_conversions INTEGER DEFAULT 0,
    google_map_conversions INTEGER DEFAULT 0,
    twitter_conversions INTEGER DEFAULT 0,
    tiktok_conversions INTEGER DEFAULT 0,
    youtube_conversions INTEGER DEFAULT 0,
    web_conversions INTEGER DEFAULT 0,
    
    -- 流入元別コンバージョン価値
    line_conversion_value DECIMAL(12,2) DEFAULT 0,
    instagram_conversion_value DECIMAL(12,2) DEFAULT 0,
    facebook_conversion_value DECIMAL(12,2) DEFAULT 0,
    google_map_conversion_value DECIMAL(12,2) DEFAULT 0,
    twitter_conversion_value DECIMAL(12,2) DEFAULT 0,
    tiktok_conversion_value DECIMAL(12,2) DEFAULT 0,
    youtube_conversion_value DECIMAL(12,2) DEFAULT 0,
    web_conversion_value DECIMAL(12,2) DEFAULT 0,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    PRIMARY KEY (tenant_id, org_id, date)
) PARTITION BY RANGE (date);

-- 基本インデックス
CREATE INDEX idx_tracking_summary_tenant_org ON tracking_summary (tenant_id, org_id);
CREATE INDEX idx_tracking_summary_date ON tracking_summary (date);
```

#### 月次パーティション作成
```sql
-- supabase/migrations/20250715000002_create_tracking_partitions.sql

-- 現在月から3ヶ月分のパーティション
CREATE TABLE tracking_summary_202501 PARTITION OF tracking_summary
FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE tracking_summary_202502 PARTITION OF tracking_summary
FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');

CREATE TABLE tracking_summary_202503 PARTITION OF tracking_summary
FOR VALUES FROM ('2025-03-01') TO ('2025-04-01');

-- 各パーティションの最適化インデックス
CREATE INDEX idx_tracking_summary_202501_tenant_org_date ON tracking_summary_202501 (tenant_id, org_id, date);
CREATE INDEX idx_tracking_summary_202502_tenant_org_date ON tracking_summary_202502 (tenant_id, org_id, date);
CREATE INDEX idx_tracking_summary_202503_tenant_org_date ON tracking_summary_202503 (tenant_id, org_id, date);

-- パフォーマンス最適化のための複合インデックス
CREATE INDEX idx_tracking_summary_202501_performance ON tracking_summary_202501 (tenant_id, org_id) INCLUDE (date, line_visits, instagram_visits, facebook_visits, google_map_visits, twitter_visits, tiktok_visits, youtube_visits, web_visits);
CREATE INDEX idx_tracking_summary_202502_performance ON tracking_summary_202502 (tenant_id, org_id) INCLUDE (date, line_visits, instagram_visits, facebook_visits, google_map_visits, twitter_visits, tiktok_visits, youtube_visits, web_visits);
CREATE INDEX idx_tracking_summary_202503_performance ON tracking_summary_202503 (tenant_id, org_id) INCLUDE (date, line_visits, instagram_visits, facebook_visits, google_map_visits, twitter_visits, tiktok_visits, youtube_visits, web_visits);
```

#### 自動パーティション作成トリガー
```sql
-- supabase/migrations/20250715000003_create_partition_trigger.sql
CREATE OR REPLACE FUNCTION create_monthly_partition()
RETURNS TRIGGER AS $$
DECLARE
    start_date DATE;
    end_date DATE;
    partition_name TEXT;
    performance_index_name TEXT;
    basic_index_name TEXT;
BEGIN
    start_date := DATE_TRUNC('month', NEW.date);
    end_date := start_date + INTERVAL '1 month';
    partition_name := 'tracking_summary_' || TO_CHAR(start_date, 'YYYYMM');
    basic_index_name := partition_name || '_tenant_org_date_idx';
    performance_index_name := partition_name || '_performance_idx';
    
    -- パーティションが存在しない場合は作成
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = partition_name) THEN
        -- パーティション作成
        EXECUTE format('
            CREATE TABLE %I PARTITION OF tracking_summary 
            FOR VALUES FROM (%L) TO (%L)',
            partition_name, start_date, end_date);
        
        -- 基本インデックス作成
        EXECUTE format('
            CREATE INDEX %I ON %I (tenant_id, org_id, date)',
            basic_index_name, partition_name);
        
        -- パフォーマンス最適化インデックス作成
        EXECUTE format('
            CREATE INDEX %I ON %I (tenant_id, org_id) 
            INCLUDE (date, line_visits, instagram_visits, facebook_visits, 
                     google_map_visits, twitter_visits, tiktok_visits, 
                     youtube_visits, web_visits)',
            performance_index_name, partition_name);
        
        RAISE NOTICE 'Created partition with indexes: %', partition_name;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_monthly_partition
    BEFORE INSERT ON tracking_summary
    FOR EACH ROW
    EXECUTE FUNCTION create_monthly_partition();
```

---

## 🔧 RPC関数実装

### 訪問記録関数
```sql
-- supabase/migrations/20250715000004_create_tracking_rpcs.sql
CREATE OR REPLACE FUNCTION record_visit(
    p_tenant_id TEXT,
    p_org_id TEXT,
    p_source TEXT,
    p_date DATE DEFAULT CURRENT_DATE
) RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
    visit_column TEXT;
    result JSONB;
    affected_rows INTEGER;
BEGIN
    -- 流入元バリデーション
    IF p_source NOT IN ('line', 'instagram', 'facebook', 'google_map', 'twitter', 'tiktok', 'youtube', 'web') THEN
        RETURN jsonb_build_object(
            'status', 'error',
            'message', 'Invalid source: ' || p_source,
            'valid_sources', '["line", "instagram", "facebook", "google_map", "twitter", "tiktok", "youtube", "web"]'
        );
    END IF;
    
    -- テナント・組織IDのバリデーション
    IF p_tenant_id IS NULL OR p_tenant_id = '' OR p_org_id IS NULL OR p_org_id = '' THEN
        RETURN jsonb_build_object(
            'status', 'error',
            'message', 'tenant_id and org_id are required'
        );
    END IF;
    
    visit_column := p_source || '_visits';
    
    -- 動的SQLでUPSERT（パフォーマンス最適化）
    EXECUTE format('
        INSERT INTO tracking_summary (tenant_id, org_id, date, %I)
        VALUES ($1, $2, $3, 1)
        ON CONFLICT (tenant_id, org_id, date)
        DO UPDATE SET
            %I = tracking_summary.%I + 1,
            updated_at = NOW()
    ', visit_column, visit_column, visit_column)
    USING p_tenant_id, p_org_id, p_date;
    
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    
    result := jsonb_build_object(
        'status', 'success',
        'message', 'Visit recorded successfully',
        'data', jsonb_build_object(
            'tenant_id', p_tenant_id,
            'org_id', p_org_id,
            'source', p_source,
            'date', p_date,
            'affected_rows', affected_rows
        )
    );
    
    RETURN result;
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'status', 'error',
            'message', 'Database error occurred',
            'error_detail', SQLERRM,
            'error_code', SQLSTATE
        );
END;
$$;
```

### コンバージョン記録関数
```sql
CREATE OR REPLACE FUNCTION record_conversion(
    p_tenant_id TEXT,
    p_org_id TEXT,
    p_source TEXT,
    p_conversion_value DECIMAL DEFAULT 0,
    p_date DATE DEFAULT CURRENT_DATE
) RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
    conversion_column TEXT;
    value_column TEXT;
    result JSONB;
    affected_rows INTEGER;
BEGIN
    -- 流入元バリデーション
    IF p_source NOT IN ('line', 'instagram', 'facebook', 'google_map', 'twitter', 'tiktok', 'youtube', 'web') THEN
        RETURN jsonb_build_object(
            'status', 'error',
            'message', 'Invalid source: ' || p_source,
            'valid_sources', '["line", "instagram", "facebook", "google_map", "twitter", "tiktok", "youtube", "web"]'
        );
    END IF;
    
    -- テナント・組織IDのバリデーション
    IF p_tenant_id IS NULL OR p_tenant_id = '' OR p_org_id IS NULL OR p_org_id = '' THEN
        RETURN jsonb_build_object(
            'status', 'error',
            'message', 'tenant_id and org_id are required'
        );
    END IF;
    
    -- コンバージョン価値のバリデーション
    IF p_conversion_value < 0 THEN
        RETURN jsonb_build_object(
            'status', 'error',
            'message', 'conversion_value must be non-negative'
        );
    END IF;
    
    conversion_column := p_source || '_conversions';
    value_column := p_source || '_conversion_value';
    
    -- 動的SQLでUPSERT
    EXECUTE format('
        INSERT INTO tracking_summary (tenant_id, org_id, date, %I, %I)
        VALUES ($1, $2, $3, 1, $4)
        ON CONFLICT (tenant_id, org_id, date)
        DO UPDATE SET
            %I = tracking_summary.%I + 1,
            %I = tracking_summary.%I + $4,
            updated_at = NOW()
    ', conversion_column, value_column, conversion_column, conversion_column, value_column, value_column)
    USING p_tenant_id, p_org_id, p_date, p_conversion_value;
    
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    
    result := jsonb_build_object(
        'status', 'success',
        'message', 'Conversion recorded successfully',
        'data', jsonb_build_object(
            'tenant_id', p_tenant_id,
            'org_id', p_org_id,
            'source', p_source,
            'conversion_value', p_conversion_value,
            'date', p_date,
            'affected_rows', affected_rows
        )
    );
    
    RETURN result;
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'status', 'error',
            'message', 'Database error occurred',
            'error_detail', SQLERRM,
            'error_code', SQLSTATE
        );
END;
$$;
```

### 分析データ取得関数
```sql
CREATE OR REPLACE FUNCTION get_tracking_summary(
    p_tenant_id TEXT,
    p_org_id TEXT,
    p_date_from DATE,
    p_date_to DATE
) RETURNS TABLE (
    date DATE,
    line_visits INTEGER,
    line_conversions INTEGER,
    line_conversion_value DECIMAL,
    line_conversion_rate DECIMAL,
    instagram_visits INTEGER,
    instagram_conversions INTEGER,
    instagram_conversion_value DECIMAL,
    instagram_conversion_rate DECIMAL,
    facebook_visits INTEGER,
    facebook_conversions INTEGER,
    facebook_conversion_value DECIMAL,
    facebook_conversion_rate DECIMAL,
    google_map_visits INTEGER,
    google_map_conversions INTEGER,
    google_map_conversion_value DECIMAL,
    google_map_conversion_rate DECIMAL,
    twitter_visits INTEGER,
    twitter_conversions INTEGER,
    twitter_conversion_value DECIMAL,
    twitter_conversion_rate DECIMAL,
    tiktok_visits INTEGER,
    tiktok_conversions INTEGER,
    tiktok_conversion_value DECIMAL,
    tiktok_conversion_rate DECIMAL,
    youtube_visits INTEGER,
    youtube_conversions INTEGER,
    youtube_conversion_value DECIMAL,
    youtube_conversion_rate DECIMAL,
    web_visits INTEGER,
    web_conversions INTEGER,
    web_conversion_value DECIMAL,
    web_conversion_rate DECIMAL
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
    -- パラメータバリデーション
    IF p_tenant_id IS NULL OR p_tenant_id = '' OR p_org_id IS NULL OR p_org_id = '' THEN
        RAISE EXCEPTION 'tenant_id and org_id are required';
    END IF;
    
    IF p_date_from > p_date_to THEN
        RAISE EXCEPTION 'date_from must be less than or equal to date_to';
    END IF;
    
    RETURN QUERY
    SELECT 
        t.date,
        t.line_visits,
        t.line_conversions,
        t.line_conversion_value,
        CASE 
            WHEN t.line_visits > 0 THEN ROUND((t.line_conversions::DECIMAL / t.line_visits) * 100, 2)
            ELSE 0::DECIMAL
        END as line_conversion_rate,
        t.instagram_visits,
        t.instagram_conversions,
        t.instagram_conversion_value,
        CASE 
            WHEN t.instagram_visits > 0 THEN ROUND((t.instagram_conversions::DECIMAL / t.instagram_visits) * 100, 2)
            ELSE 0::DECIMAL
        END as instagram_conversion_rate,
        t.facebook_visits,
        t.facebook_conversions,
        t.facebook_conversion_value,
        CASE 
            WHEN t.facebook_visits > 0 THEN ROUND((t.facebook_conversions::DECIMAL / t.facebook_visits) * 100, 2)
            ELSE 0::DECIMAL
        END as facebook_conversion_rate,
        t.google_map_visits,
        t.google_map_conversions,
        t.google_map_conversion_value,
        CASE 
            WHEN t.google_map_visits > 0 THEN ROUND((t.google_map_conversions::DECIMAL / t.google_map_visits) * 100, 2)
            ELSE 0::DECIMAL
        END as google_map_conversion_rate,
        t.twitter_visits,
        t.twitter_conversions,
        t.twitter_conversion_value,
        CASE 
            WHEN t.twitter_visits > 0 THEN ROUND((t.twitter_conversions::DECIMAL / t.twitter_visits) * 100, 2)
            ELSE 0::DECIMAL
        END as twitter_conversion_rate,
        t.tiktok_visits,
        t.tiktok_conversions,
        t.tiktok_conversion_value,
        CASE 
            WHEN t.tiktok_visits > 0 THEN ROUND((t.tiktok_conversions::DECIMAL / t.tiktok_visits) * 100, 2)
            ELSE 0::DECIMAL
        END as tiktok_conversion_rate,
        t.youtube_visits,
        t.youtube_conversions,
        t.youtube_conversion_value,
        CASE 
            WHEN t.youtube_visits > 0 THEN ROUND((t.youtube_conversions::DECIMAL / t.youtube_visits) * 100, 2)
            ELSE 0::DECIMAL
        END as youtube_conversion_rate,
        t.web_visits,
        t.web_conversions,
        t.web_conversion_value,
        CASE 
            WHEN t.web_visits > 0 THEN ROUND((t.web_conversions::DECIMAL / t.web_visits) * 100, 2)
            ELSE 0::DECIMAL
        END as web_conversion_rate
    FROM tracking_summary t
    WHERE t.tenant_id = p_tenant_id 
      AND t.org_id = p_org_id
      AND t.date >= p_date_from 
      AND t.date <= p_date_to
    ORDER BY t.date DESC;
END;
$$;

-- 権限設定
GRANT EXECUTE ON FUNCTION record_visit TO service_role;
GRANT EXECUTE ON FUNCTION record_visit TO authenticated;
GRANT EXECUTE ON FUNCTION record_conversion TO service_role;
GRANT EXECUTE ON FUNCTION record_conversion TO authenticated;
GRANT EXECUTE ON FUNCTION get_tracking_summary TO service_role;
GRANT EXECUTE ON FUNCTION get_tracking_summary TO authenticated;
```

---

## 🌐 Next.jsミドルウェア実装

### メインミドルウェア
```typescript
// middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseClientService } from '@/services/supabase/SupabaseService';

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  
  // トラッキング対象のパスかチェック
  if (shouldTrackRequest(request)) {
    try {
      await handleTracking(request, response);
    } catch (error) {
      // エラーは記録するが、リクエストは継続
      console.error('[Tracking] Error:', error);
      // Sentryなどでエラー監視
      if (process.env.NODE_ENV === 'production') {
        // await reportError(error, { context: 'tracking_middleware' });
      }
    }
  }
  
  return response;
}

async function handleTracking(request: NextRequest, response: NextResponse) {
  // 組織情報の取得
  const orgInfo = extractOrgInfo(request);
  if (!orgInfo) return;
  
  // 流入元の判定
  const trafficSource = detectTrafficSource(request);
  
  // セッション管理（24時間Cookie）
  const isNewVisit = await checkNewVisit(request, response, orgInfo, trafficSource);
  
  // 新しい訪問の場合のみ記録
  if (isNewVisit) {
    await recordVisit(orgInfo, trafficSource);
  }
}

function shouldTrackRequest(request: NextRequest): boolean {
  const path = request.nextUrl.pathname;
  
  // トラッキング対象パス
  const trackingPaths = [
    '/reservation/',
    '/customer/',
    '/',
    '/about',
    '/menu',
    '/staff',
    '/contact',
    '/pricing'
  ];
  
  // 除外パス
  const excludePaths = [
    '/api/',
    '/_next/',
    '/favicon.ico',
    '/robots.txt',
    '/sitemap.xml',
    '/.well-known/',
    '/manifest.json'
  ];
  
  // User-Agentによるボット除外
  const userAgent = request.headers.get('user-agent')?.toLowerCase() || '';
  const botPatterns = [
    'bot', 'crawler', 'spider', 'scraper', 'facebookexternalhit',
    'twitterbot', 'linkedinbot', 'whatsapp', 'telegram'
  ];
  
  if (botPatterns.some(pattern => userAgent.includes(pattern))) {
    return false;
  }
  
  // 除外パスをチェック
  if (excludePaths.some(exclude => path.startsWith(exclude))) {
    return false;
  }
  
  // トラッキング対象パスをチェック
  return trackingPaths.some(include => path.startsWith(include));
}

function extractOrgInfo(request: NextRequest): { tenantId: string; orgId: string } | null {
  const url = request.nextUrl;
  
  // 1. 予約ページからの組織情報抽出
  if (url.pathname.startsWith('/reservation/')) {
    const segments = url.pathname.split('/');
    const orgId = segments[2];
    
    if (orgId && orgId !== 'undefined' && orgId.length > 0) {
      // TODO: 実際の実装では、orgIdからtenantIdを取得する処理が必要
      // 現在は仮の実装
      return { 
        tenantId: `tenant_${orgId}`, 
        orgId 
      };
    }
  }
  
  // 2. カスタマーページからの組織情報抽出
  if (url.pathname.startsWith('/customer/')) {
    const segments = url.pathname.split('/');
    const orgId = segments[2];
    
    if (orgId && orgId !== 'undefined' && orgId.length > 0) {
      return { 
        tenantId: `tenant_${orgId}`, 
        orgId 
      };
    }
  }
  
  // 3. その他のパスでは、Cookieやヘッダーから取得を試行
  const orgHeader = request.headers.get('x-org-id');
  const tenantHeader = request.headers.get('x-tenant-id');
  
  if (orgHeader && tenantHeader) {
    return {
      tenantId: tenantHeader,
      orgId: orgHeader
    };
  }
  
  return null;
}

function detectTrafficSource(request: NextRequest): string {
  const url = request.nextUrl;
  const referer = request.headers.get('referer');
  
  // 1. UTMパラメータの確認（最優先）
  const utmSource = url.searchParams.get('utm_source');
  const utmMedium = url.searchParams.get('utm_medium');
  
  if (utmSource) {
    return mapUtmToSource(utmSource, utmMedium);
  }
  
  // 2. リファラーの解析
  if (referer) {
    return analyzeReferrer(referer);
  }
  
  // 3. その他のパラメータチェック
  const fbclid = url.searchParams.get('fbclid'); // Facebook Click ID
  const gclid = url.searchParams.get('gclid');   // Google Click ID
  const igshid = url.searchParams.get('igshid'); // Instagram Share ID
  
  if (fbclid) return 'facebook';
  if (gclid) return 'web'; // Googleは検索なのでwebに分類
  if (igshid) return 'instagram';
  
  // 4. デフォルト
  return 'web';
}

function mapUtmToSource(utmSource: string, utmMedium?: string): string {
  const source = utmSource.toLowerCase();
  
  const mapping: Record<string, string> = {
    'line': 'line',
    'instagram': 'instagram',
    'facebook': 'facebook',
    'google-maps': 'google_map',
    'googlemaps': 'google_map',
    'twitter': 'twitter',
    'tiktok': 'tiktok',
    'youtube': 'youtube',
    'google': 'web',
    'yahoo': 'web',
    'bing': 'web',
    'search': 'web'
  };
  
  // utm_mediumによる詳細判定
  if (utmMedium) {
    const medium = utmMedium.toLowerCase();
    if (medium === 'social') {
      // ソーシャルメディアの場合はsourceをそのまま使用
      return mapping[source] || 'web';
    }
    if (medium === 'cpc' || medium === 'paid') {
      // 有料広告の場合
      return mapping[source] || 'web';
    }
  }
  
  return mapping[source] || 'web';
}

function analyzeReferrer(referer: string): string {
  try {
    const refererUrl = new URL(referer);
    const hostname = refererUrl.hostname.toLowerCase();
    
    // 完全一致チェック
    const exactMatches: Record<string, string> = {
      'line.me': 'line',
      'liff.line.me': 'line',
      'instagram.com': 'instagram',
      'www.instagram.com': 'instagram',
      'facebook.com': 'facebook',
      'www.facebook.com': 'facebook',
      'm.facebook.com': 'facebook',
      'twitter.com': 'twitter',
      'www.twitter.com': 'twitter',
      'x.com': 'twitter',
      'tiktok.com': 'tiktok',
      'www.tiktok.com': 'tiktok',
      'youtube.com': 'youtube',
      'www.youtube.com': 'youtube',
      'm.youtube.com': 'youtube',
      'maps.google.com': 'google_map',
      'maps.google.co.jp': 'google_map'
    };
    
    if (exactMatches[hostname]) {
      return exactMatches[hostname];
    }
    
    // 部分一致チェック
    if (hostname.includes('instagram')) return 'instagram';
    if (hostname.includes('facebook') || hostname.includes('fb.me')) return 'facebook';
    if (hostname.includes('twitter') || hostname.includes('t.co')) return 'twitter';
    if (hostname.includes('tiktok')) return 'tiktok';
    if (hostname.includes('youtube') || hostname.includes('youtu.be')) return 'youtube';
    if (hostname.includes('line')) return 'line';
    if (hostname.includes('google')) {
      // Google系サービスの詳細判定
      if (hostname.includes('maps')) return 'google_map';
      return 'web'; // 検索などはwebに分類
    }
    
    return 'web';
  } catch (error) {
    console.warn('[Tracking] Failed to parse referer:', referer, error);
    return 'web';
  }
}
```

### セッション管理システム
```typescript
// セッション管理の詳細実装
interface TrackingSession {
  timestamp: number;
  source: string;
  orgId: string;
  tenantId: string;
  sessionId: string;
  visitCount: number;
}

async function checkNewVisit(
  request: NextRequest,
  response: NextResponse,
  orgInfo: { tenantId: string; orgId: string },
  trafficSource: string
): Promise<boolean> {
  const cookieName = `bocker_tracking_${orgInfo.orgId}`;
  const existingSession = request.cookies.get(cookieName);
  
  if (existingSession) {
    try {
      const sessionData: TrackingSession = JSON.parse(existingSession.value);
      const now = Date.now();
      const sessionDuration = 24 * 60 * 60 * 1000; // 24時間
      
      // セッションが有効かチェック
      if (now - sessionData.timestamp < sessionDuration) {
        // 既存セッションを更新
        const updatedSession: TrackingSession = {
          ...sessionData,
          timestamp: now,
          visitCount: sessionData.visitCount + 1
        };
        
        setSessionCookie(response, cookieName, updatedSession);
        return false; // 新しい訪問ではない
      }
    } catch (error) {
      console.warn('[Tracking] Failed to parse session cookie:', error);
    }
  }
  
  // 新しいセッションの作成
  const newSession: TrackingSession = {
    timestamp: Date.now(),
    source: trafficSource,
    orgId: orgInfo.orgId,
    tenantId: orgInfo.tenantId,
    sessionId: generateSessionId(),
    visitCount: 1
  };
  
  setSessionCookie(response, cookieName, newSession);
  return true; // 新しい訪問
}

function setSessionCookie(
  response: NextResponse, 
  cookieName: string, 
  session: TrackingSession
) {
  const sessionData = JSON.stringify(session);
  
  response.cookies.set(cookieName, sessionData, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60, // 24時間（秒単位）
    path: '/',
    // domain: process.env.NODE_ENV === 'production' ? '.bocker.jp' : undefined
  });
}

function generateSessionId(): string {
  return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

async function recordVisit(
  orgInfo: { tenantId: string; orgId: string },
  trafficSource: string
) {
  try {
    const { data, error } = await supabaseClientService.getClient()
      .rpc('record_visit', {
        p_tenant_id: orgInfo.tenantId,
        p_org_id: orgInfo.orgId,
        p_source: trafficSource
      });
    
    if (error) {
      console.error('[Tracking] RPC error:', error);
      return;
    }
    
    if (data?.status === 'error') {
      console.error('[Tracking] Visit recording failed:', data.message);
      return;
    }
    
    console.log('[Tracking] Visit recorded:', {
      orgId: orgInfo.orgId,
      source: trafficSource,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[Tracking] Failed to record visit:', error);
  }
}

// ミドルウェアの適用範囲設定
export const config = {
  matcher: [
    /*
     * 以下を除く全てのパス:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)  
     * - favicon.ico (favicon file)
     * - その他の静的ファイル
     */
    '/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.json).*)',
  ],
};
```

---

## 📊 TrackingRepository実装

### 基本Repository
```typescript
// services/supabase/repositories/tracking/TrackingRepository.ts
import { AnalyticsRepository } from '../analytics/AnalyticsRepository';
import { supabaseClientService } from '@/services/supabase/SupabaseService';
import type { SupabaseService } from '@/services/supabase/SupabaseService';
import { 
  TrackingFilterOptions,
  TrackingSourceData,
  TrackingAnalyticsData,
  TrackingComparisonData,
  PeriodOption
} from './types';

export class TrackingRepository extends AnalyticsRepository {
  
  constructor(supabaseService: SupabaseService = supabaseClientService) {
    super(supabaseService);
  }
  
  /**
   * 流入元別の分析データを取得
   */
  async getTrackingAnalytics(filters: TrackingFilterOptions): Promise<TrackingSourceData[]> {
    try {
      const dateRange = this.formatDateRange(filters.dateRange);
      
      console.log('[TrackingRepository] Getting analytics:', {
        tenantId: filters.tenantId,
        orgId: filters.orgId,
        dateRange
      });
      
      const { data, error } = await this.supabaseService.getClient()
        .rpc('get_tracking_summary', {
          p_tenant_id: filters.tenantId,
          p_org_id: filters.orgId,
          p_date_from: dateRange.from,
          p_date_to: dateRange.to
        });
      
      if (error) {
        console.error('[TrackingRepository] RPC error:', error);
        this.handleError(error, 'get tracking analytics');
      }
      
      console.log('[TrackingRepository] RPC response:', {
        dataLength: data?.length || 0,
        sampleData: data?.slice(0, 2)
      });
      
      return this.processTrackingData(data || []);
    } catch (error) {
      console.error('[TrackingRepository] Unexpected error:', error);
      this.handleError(error, 'get tracking analytics');
    }
  }
  
  /**
   * 期間比較データを取得
   */
  async getTrackingComparison(filters: TrackingFilterOptions): Promise<TrackingComparisonData> {
    try {
      const currentData = await this.getTrackingAnalytics(filters);
      
      // 前期間のデータを取得
      const previousPeriod = this.getPreviousPeriod(filters.dateRange);
      const previousFilters = { ...filters, dateRange: previousPeriod };
      const previousData = await this.getTrackingAnalytics(previousFilters);
      
      return {
        current: currentData,
        previous: previousData,
        growth: this.calculateGrowthMetrics(currentData, previousData)
      };
    } catch (error) {
      this.handleError(error, 'get tracking comparison');
    }
  }
  
  /**
   * 期間オプションに基づく日付範囲を取得
   */
  getDateRangeFromPeriod(period: PeriodOption): { from: Date; to: Date } {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (period) {
      case 'last_7_days':
        return {
          from: new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000),
          to: today
        };
      
      case 'last_30_days':
        return {
          from: new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000),
          to: today
        };
      
      case 'this_month':
        return {
          from: new Date(now.getFullYear(), now.getMonth(), 1),
          to: today
        };
      
      case 'last_month':
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        return {
          from: lastMonth,
          to: new Date(now.getFullYear(), now.getMonth(), 0) // 前月末日
        };
      
      case 'two_months_ago':
        const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);
        return {
          from: twoMonthsAgo,
          to: new Date(now.getFullYear(), now.getMonth() - 1, 0) // 2ヶ月前の末日
        };
      
      case 'last_3_months':
        return {
          from: new Date(now.getFullYear(), now.getMonth() - 2, 1),
          to: today
        };
      
      case 'last_6_months':
        return {
          from: new Date(now.getFullYear(), now.getMonth() - 5, 1),
          to: today
        };
      
      case 'this_year':
        return {
          from: new Date(now.getFullYear(), 0, 1),
          to: today
        };
      
      default:
        return {
          from: new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000),
          to: today
        };
    }
  }
  
  /**
   * 訪問記録
   */
  async recordVisit(tenantId: string, orgId: string, source: string): Promise<void> {
    try {
      const { data, error } = await this.supabaseService.getClient()
        .rpc('record_visit', {
          p_tenant_id: tenantId,
          p_org_id: orgId,
          p_source: source
        });
      
      if (error) {
        this.handleError(error, 'record visit');
      }
      
      if (data?.status === 'error') {
        throw new Error(`Visit recording failed: ${data.message}`);
      }
      
      console.log('[TrackingRepository] Visit recorded successfully:', data);
    } catch (error) {
      this.handleError(error, 'record visit');
    }
  }
  
  /**
   * コンバージョン記録
   */
  async recordConversion(
    tenantId: string, 
    orgId: string, 
    source: string, 
    value: number
  ): Promise<void> {
    try {
      const { data, error } = await this.supabaseService.getClient()
        .rpc('record_conversion', {
          p_tenant_id: tenantId,
          p_org_id: orgId,
          p_source: source,
          p_conversion_value: value
        });
      
      if (error) {
        this.handleError(error, 'record conversion');
      }
      
      if (data?.status === 'error') {
        throw new Error(`Conversion recording failed: ${data.message}`);
      }
      
      console.log('[TrackingRepository] Conversion recorded successfully:', data);
    } catch (error) {
      this.handleError(error, 'record conversion');
    }
  }
  
  // プライベートメソッド
  private processTrackingData(data: any[]): TrackingSourceData[] {
    const sources = ['line', 'instagram', 'facebook', 'google_map', 'twitter', 'tiktok', 'youtube', 'web'];
    const result: TrackingSourceData[] = [];
    
    sources.forEach(source => {
      const visits = data.reduce((sum, row) => sum + (row[`${source}_visits`] || 0), 0);
      const conversions = data.reduce((sum, row) => sum + (row[`${source}_conversions`] || 0), 0);
      const conversionValue = data.reduce((sum, row) => sum + (Number(row[`${source}_conversion_value`]) || 0), 0);
      
      // データが存在する流入元のみ追加
      if (visits > 0 || conversions > 0) {
        result.push({
          source,
          visits,
          conversions,
          conversionValue,
          conversionRate: visits > 0 ? (conversions / visits) * 100 : 0,
          averageOrderValue: conversions > 0 ? conversionValue / conversions : 0
        });
      }
    });
    
    // 訪問数の多い順にソート
    return result.sort((a, b) => b.visits - a.visits);
  }
  
  private calculateGrowthMetrics(
    current: TrackingSourceData[], 
    previous: TrackingSourceData[]
  ) {
    return current.map(currentSource => {
      const prevSource = previous.find(p => p.source === currentSource.source);
      
      return {
        source: currentSource.source,
        visitsGrowth: this.calculateGrowthRate(
          currentSource.visits, 
          prevSource?.visits || 0
        ),
        conversionsGrowth: this.calculateGrowthRate(
          currentSource.conversions, 
          prevSource?.conversions || 0
        ),
        valueGrowth: this.calculateGrowthRate(
          currentSource.conversionValue, 
          prevSource?.conversionValue || 0
        ),
        conversionRateGrowth: this.calculateGrowthRate(
          currentSource.conversionRate, 
          prevSource?.conversionRate || 0
        )
      };
    });
  }
  
  // 基底クラスの抽象メソッド実装
  protected async getPeriodData(filters: any): Promise<{ total_amount: number; booking_count: number }> {
    const data = await this.getTrackingAnalytics(filters);
    const totalValue = data.reduce((sum, source) => sum + source.conversionValue, 0);
    const totalConversions = data.reduce((sum, source) => sum + source.conversions, 0);
    
    return {
      total_amount: totalValue,
      booking_count: totalConversions
    };
  }
  
  protected async getPartitionAwarePeriodData(filters: any): Promise<{ total_amount: number; booking_count: number }> {
    return this.getPeriodData(filters);
  }
}
```

### 型定義
```typescript
// services/supabase/repositories/tracking/types.ts
import { DateRange } from '../analytics/types';

export interface TrackingFilterOptions {
  tenantId: string;
  orgId: string;
  dateRange: DateRange;
}

export interface TrackingSourceData {
  source: string;
  visits: number;
  conversions: number;
  conversionValue: number;
  conversionRate: number;
  averageOrderValue: number;
}

export interface TrackingAnalyticsData {
  date: string;
  source: string;
  visits: number;
  conversions: number;
  conversionValue: number;
  conversionRate: number;
}

export interface TrackingComparisonData {
  current: TrackingSourceData[];
  previous: TrackingSourceData[];
  growth: Array<{
    source: string;
    visitsGrowth: number;
    conversionsGrowth: number;
    valueGrowth: number;
    conversionRateGrowth: number;
  }>;
}

export type PeriodOption = 
  | 'last_7_days'
  | 'last_30_days' 
  | 'this_month'
  | 'last_month'
  | 'two_months_ago'
  | 'last_3_months'
  | 'last_6_months'
  | 'this_year';

export interface PeriodSelectOption {
  value: PeriodOption;
  label: string;
}
```

---

## 🎨 ダッシュボード実装

### メインページ
```typescript
// app/[locale]/(dashboard)/dashboard/analytics/tracking/page.tsx
import { Suspense } from 'react';
import { TrackingDashboard } from './_components/TrackingDashboard';
import { DashboardSection } from '@/components/common/DashboardSection';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export const dynamic = 'force-dynamic';

export default async function TrackingAnalyticsPage() {
  return (
    <div className="space-y-6">
      <DashboardSection
        title="アクセス分析"
        subtitle="流入元別のアクセス数とコンバージョン率を分析し、マーケティングROIを最適化"
      >
        <Suspense fallback={<TrackingDashboardSkeleton />}>
          <TrackingDashboard />
        </Suspense>
      </DashboardSection>
    </div>
  );
}

function TrackingDashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* 期間選択スケルトン */}
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
      </div>
      
      {/* サマリーカードスケルトン */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-8 w-16 mb-1" />
              <Skeleton className="h-3 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* チャートスケルトン */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(2)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-6 w-32 mb-4" />
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* テーブルスケルトン */}
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-6 w-24 mb-4" />
          <div className="space-y-2">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

### ダッシュボードコンポーネント
```typescript
// app/[locale]/(dashboard)/dashboard/analytics/tracking/_components/TrackingDashboard.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Users, 
  Target, 
  DollarSign, 
  Percent,
  RefreshCw,
  Download,
  Calendar
} from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { TrackingRepository } from '@/services/supabase/repositories/tracking/TrackingRepository';
import { useTenantAndOrganization } from '@/hooks/useTenantAndOrganization';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart
} from 'recharts';
import type { 
  TrackingSourceData, 
  TrackingComparisonData,
  PeriodOption,
  PeriodSelectOption 
} from '@/services/supabase/repositories/tracking/types';

const COLORS = [
  '#0088FE', '#00C49F', '#FFBB28', '#FF8042', 
  '#8884D8', '#82CA9D', '#FFC658', '#FF7C7C'
];

const PERIOD_OPTIONS: PeriodSelectOption[] = [
  { value: 'last_7_days', label: '過去7日' },
  { value: 'last_30_days', label: '過去30日' },
  { value: 'this_month', label: '今月' },
  { value: 'last_month', label: '先月' },
  { value: 'two_months_ago', label: '先々月' },
  { value: 'last_3_months', label: '過去3ヶ月' },
  { value: 'last_6_months', label: '過去半年' },
  { value: 'this_year', label: '今年' }
];

export function TrackingDashboard() {
  const { tenantId, orgId } = useTenantAndOrganization();
  const { handleError } = useErrorHandler();
  
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodOption>('last_30_days');
  const [trackingData, setTrackingData] = useState<TrackingSourceData[]>([]);
  const [comparisonData, setComparisonData] = useState<TrackingComparisonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  const repository = new TrackingRepository();
  
  useEffect(() => {
    if (tenantId && orgId) {
      loadTrackingData();
    }
  }, [tenantId, orgId, selectedPeriod]);
  
  const loadTrackingData = async () => {
    try {
      setLoading(true);
      
      const dateRange = repository.getDateRangeFromPeriod(selectedPeriod);
      const filters = { tenantId, orgId, dateRange };
      
      console.log('[TrackingDashboard] Loading data with filters:', filters);
      
      const [data, comparison] = await Promise.all([
        repository.getTrackingAnalytics(filters),
        repository.getTrackingComparison(filters)
      ]);
      
      console.log('[TrackingDashboard] Data loaded:', {
        dataLength: data.length,
        comparisonLength: comparison.current.length
      });
      
      setTrackingData(data);
      setComparisonData(comparison);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('[TrackingDashboard] Failed to load data:', error);
      handleError(error, 'アクセストラッキングデータの読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };
  
  const handleRefresh = () => {
    loadTrackingData();
  };
  
  const handleExport = () => {
    if (trackingData.length === 0) return;
    
    // CSV形式でデータをエクスポート
    const headers = ['流入元', '訪問数', 'コンバージョン数', 'コンバージョン率', '売上', '平均単価'];
    const csvContent = [
      headers.join(','),
      ...trackingData.map(source => [
        source.source,
        source.visits,
        source.conversions,
        `${source.conversionRate.toFixed(2)}%`,
        source.conversionValue,
        source.averageOrderValue.toFixed(0)
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `tracking-analytics-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  if (loading && trackingData.length === 0) {
    return <div className="flex items-center justify-center h-64">
      <RefreshCw className="h-8 w-8 animate-spin" />
      <span className="ml-2">データを読み込み中...</span>
    </div>;
  }
  
  // 総計の計算
  const totalVisits = trackingData.reduce((sum, source) => sum + source.visits, 0);
  const totalConversions = trackingData.reduce((sum, source) => sum + source.conversions, 0);
  const totalValue = trackingData.reduce((sum, source) => sum + source.conversionValue, 0);
  const overallConversionRate = totalVisits > 0 ? (totalConversions / totalVisits) * 100 : 0;
  const averageOrderValue = totalConversions > 0 ? totalValue / totalConversions : 0;
  
  // 前期間比較データ
  const previousTotalVisits = comparisonData?.previous.reduce((sum, source) => sum + source.visits, 0) || 0;
  const previousTotalConversions = comparisonData?.previous.reduce((sum, source) => sum + source.conversions, 0) || 0;
  const previousTotalValue = comparisonData?.previous.reduce((sum, source) => sum + source.conversionValue, 0) || 0;
  const previousConversionRate = previousTotalVisits > 0 ? (previousTotalConversions / previousTotalVisits) * 100 : 0;
  
  const visitsGrowth = previousTotalVisits > 0 ? ((totalVisits - previousTotalVisits) / previousTotalVisits) * 100 : 0;
  const conversionsGrowth = previousTotalConversions > 0 ? ((totalConversions - previousTotalConversions) / previousTotalConversions) * 100 : 0;
  const valueGrowth = previousTotalValue > 0 ? ((totalValue - previousTotalValue) / previousTotalValue) * 100 : 0;
  const conversionRateGrowth = previousConversionRate > 0 ? ((overallConversionRate - previousConversionRate) / previousConversionRate) * 100 : 0;
  
  const GrowthIcon = ({ value }: { value: number }) => {
    if (value > 0) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (value < 0) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-gray-400" />;
  };
  
  const formatGrowth = (value: number) => {
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };
  
  return (
    <div className="space-y-6">
      {/* ヘッダー・コントロール */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Select value={selectedPeriod} onValueChange={(value: PeriodOption) => setSelectedPeriod(value)}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="期間を選択" />
            </SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {lastUpdated && (
            <div className="flex items-center text-sm text-muted-foreground">
              <Calendar className="h-4 w-4 mr-1" />
              最終更新: {format(lastUpdated, 'yyyy/MM/dd HH:mm', { locale: ja })}
            </div>
          )}
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            更新
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={trackingData.length === 0}>
            <Download className="h-4 w-4 mr-1" />
            エクスポート
          </Button>
        </div>
      </div>
      
      {/* サマリーカード */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総訪問数</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalVisits.toLocaleString()}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <GrowthIcon value={visitsGrowth} />
              <span className="ml-1">前期間比 {formatGrowth(visitsGrowth)}</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">コンバージョン数</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalConversions.toLocaleString()}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <GrowthIcon value={conversionsGrowth} />
              <span className="ml-1">前期間比 {formatGrowth(conversionsGrowth)}</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">コンバージョン率</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallConversionRate.toFixed(1)}%</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <GrowthIcon value={conversionRateGrowth} />
              <span className="ml-1">前期間比 {formatGrowth(conversionRateGrowth)}</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総売上</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">¥{totalValue.toLocaleString()}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <GrowthIcon value={valueGrowth} />
              <span className="ml-1">前期間比 {formatGrowth(valueGrowth)}</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">平均客単価</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">¥{averageOrderValue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              予約あたりの平均金額
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* データが存在しない場合の表示 */}
      {trackingData.length === 0 && !loading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">データがありません</h3>
            <p className="text-muted-foreground text-center max-w-sm">
              選択した期間にアクセスデータが記録されていません。<br />
              期間を変更するか、しばらくお待ちください。
            </p>
          </CardContent>
        </Card>
      )}
      
      {/* チャート */}
      {trackingData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>流入元別コンバージョン率</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={trackingData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="source" 
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    formatter={(value) => [`${value.toFixed(1)}%`, 'コンバージョン率']}
                    labelFormatter={(label) => `流入元: ${label}`}
                  />
                  <Bar dataKey="conversionRate" fill="#8884d8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>流入元別訪問数</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={trackingData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ source, visits, percent }) => 
                      `${source}: ${(percent * 100).toFixed(0)}%`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="visits"
                  >
                    {trackingData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value, name, props) => [
                      `${value.toLocaleString()}回`,
                      '訪問数'
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* 詳細テーブル */}
      {trackingData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>流入元別詳細データ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium">流入元</th>
                    <th className="text-right p-3 font-medium">訪問数</th>
                    <th className="text-right p-3 font-medium">CV数</th>
                    <th className="text-right p-3 font-medium">CV率</th>
                    <th className="text-right p-3 font-medium">売上</th>
                    <th className="text-right p-3 font-medium">平均単価</th>
                    <th className="text-center p-3 font-medium">成長率</th>
                  </tr>
                </thead>
                <tbody>
                  {trackingData.map((source, index) => {
                    const growth = comparisonData?.growth.find(g => g.source === source.source);
                    return (
                      <tr key={source.source} className="border-b hover:bg-muted/50">
                        <td className="p-3">
                          <Badge variant="outline" className="font-normal">
                            {source.source}
                          </Badge>
                        </td>
                        <td className="text-right p-3 font-mono">
                          {source.visits.toLocaleString()}
                        </td>
                        <td className="text-right p-3 font-mono">
                          {source.conversions.toLocaleString()}
                        </td>
                        <td className="text-right p-3 font-mono">
                          <span className={
                            source.conversionRate >= 5 ? 'text-green-600 font-medium' :
                            source.conversionRate >= 2 ? 'text-yellow-600' :
                            'text-red-600'
                          }>
                            {source.conversionRate.toFixed(1)}%
                          </span>
                        </td>
                        <td className="text-right p-3 font-mono">
                          ¥{source.conversionValue.toLocaleString()}
                        </td>
                        <td className="text-right p-3 font-mono">
                          ¥{source.averageOrderValue.toLocaleString()}
                        </td>
                        <td className="text-center p-3">
                          {growth && (
                            <div className="flex items-center justify-center gap-1">
                              <GrowthIcon value={growth.valueGrowth} />
                              <span className={`text-xs font-mono ${
                                growth.valueGrowth > 0 ? 'text-green-600' :
                                growth.valueGrowth < 0 ? 'text-red-600' :
                                'text-gray-400'
                              }`}>
                                {formatGrowth(growth.valueGrowth)}
                              </span>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* パフォーマンス指標 */}
      {trackingData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>パフォーマンス指標</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {trackingData.filter(s => s.conversionRate >= 5).length}
                </div>
                <p className="text-sm text-muted-foreground">高CV率チャネル (≥5%)</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {trackingData.reduce((sum, s) => sum + s.conversions, 0)}
                </div>
                <p className="text-sm text-muted-foreground">総コンバージョン数</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  ¥{(totalValue / Math.max(totalVisits, 1)).toLocaleString()}
                </div>
                <p className="text-sm text-muted-foreground">訪問あたり価値</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

---

## 🔗 Convex統合

### 予約完了処理への統合
```typescript
// convex/reservation/action.ts への追加部分

import { supabaseClientService } from '@/services/supabase/SupabaseService';

// 既存のhandleStatusSideEffects関数に以下を追加
if (payload.status === 'completed' && reservation.customer_uid) {
  try {
    // ... 既存のSupabase処理（LTV更新、ポイント等）
    
    // 🆕 コンバージョン記録処理
    await recordConversionTracking(reservation);
    
    console.log(`[コンバージョン記録] 予約完了処理完了: ${reservation._id}`);
  } catch (error) {
    console.error(`[コンバージョン記録エラー] 予約ID: ${reservation._id}`, error);
    // 重要: エラーでも予約完了処理は継続する
  }
}

/**
 * コンバージョントラッキング記録関数
 */
async function recordConversionTracking(reservation: Doc<'reservation'>) {
  if (!reservation.detail) {
    console.warn('[コンバージョン記録] reservation.detail が存在しません:', reservation._id);
    return;
  }
  
  // 流入元の取得（予約作成時に保存されたもの）
  const trafficSource = reservation.traffic_source || 'web';
  const conversionValue = reservation.detail.total_price || 0;
  const businessDate = new Date(reservation.start_time_unix).toISOString().split('T')[0];
  
  console.log('[コンバージョン記録] 記録開始:', {
    reservationId: reservation._id,
    trafficSource,
    conversionValue,
    businessDate,
    tenantId: reservation.tenant_id,
    orgId: reservation.org_id
  });
  
  try {
    // Supabase RPC関数を呼び出し
    const { data, error } = await supabaseClientService.getClient()
      .rpc('record_conversion', {
        p_tenant_id: reservation.tenant_id,
        p_org_id: reservation.org_id,
        p_source: trafficSource,
        p_conversion_value: conversionValue,
        p_date: businessDate
      });
    
    if (error) {
      throw new Error(`Supabase RPC error: ${error.message}`);
    }
    
    if (data?.status === 'error') {
      throw new Error(`RPC function error: ${data.message}`);
    }
    
    console.log('[コンバージョン記録] 成功:', {
      reservationId: reservation._id,
      trafficSource,
      conversionValue,
      rpcResponse: data
    });
    
  } catch (error) {
    console.error('[コンバージョン記録] 失敗:', {
      reservationId: reservation._id,
      trafficSource,
      conversionValue,
      error: error.message
    });
    
    // エラーを再スローして上位でキャッチさせる
    throw error;
  }
}
```

### 予約作成時のtraffic_source保存
```typescript
// 予約作成関数での traffic_source 保存

export const createReservation = mutation({
  args: {
    // ... 既存のargs
    traffic_source: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // ... 既存の処理
    
    // traffic_source の処理
    const trafficSource = args.traffic_source || 'web';
    
    // バリデーション
    const validSources = ['line', 'instagram', 'facebook', 'google_map', 'twitter', 'tiktok', 'youtube', 'web'];
    const finalTrafficSource = validSources.includes(trafficSource) ? trafficSource : 'web';
    
    const reservationData = {
      // ... 既存のフィールド
      traffic_source: finalTrafficSource,
      // ... その他のフィールド
    };
    
    console.log('[予約作成] traffic_source保存:', {
      original: args.traffic_source,
      validated: finalTrafficSource,
      reservationId: reservationData._id
    });
    
    // ... 既存の予約作成処理
  }
});
```

### クライアント側での流入元情報送信
```typescript
// app/[locale]/(reservation)/reservation/[id]/calendar/page.tsx での修正

// 予約作成時にtraffic_sourceを含める
const createReservationWithTracking = async (reservationData: any) => {
  // Cookieから流入元情報を取得
  const trafficSource = getTrafficSourceFromSession();
  
  const reservationPayload = {
    ...reservationData,
    traffic_source: trafficSource
  };
  
  console.log('[予約作成] traffic_source付きペイロード:', {
    trafficSource,
    reservationId: reservationPayload.id
  });
  
  return await createReservationMutation(reservationPayload);
};

/**
 * セッションCookieから流入元情報を取得
 */
function getTrafficSourceFromSession(): string {
  if (typeof document === 'undefined') return 'web';
  
  try {
    // URLパラメータから組織IDを取得
    const pathSegments = window.location.pathname.split('/');
    const orgId = pathSegments[2];
    
    if (!orgId) return 'web';
    
    const cookieName = `bocker_tracking_${orgId}`;
    const cookies = document.cookie.split(';');
    const sessionCookie = cookies.find(c => c.trim().startsWith(`${cookieName}=`));
    
    if (sessionCookie) {
      const sessionData = JSON.parse(sessionCookie.split('=')[1]);
      const validSources = ['line', 'instagram', 'facebook', 'google_map', 'twitter', 'tiktok', 'youtube', 'web'];
      
      if (validSources.includes(sessionData.source)) {
        console.log('[流入元取得] セッションから取得:', sessionData.source);
        return sessionData.source;
      }
    }
  } catch (error) {
    console.warn('[流入元取得] Cookieの解析に失敗:', error);
  }
  
  return 'web';
}
```

---

## 🔧 運用・保守

### データ保持期間・アーカイブ戦略
```sql
-- 古いパーティションの自動削除（年次実行推奨）
CREATE OR REPLACE FUNCTION cleanup_old_tracking_partitions(
    months_to_keep INTEGER DEFAULT 24
) RETURNS void AS $$
DECLARE
    cutoff_date DATE := DATE_TRUNC('month', CURRENT_DATE - (months_to_keep || ' months')::INTERVAL);
    partition_record RECORD;
    partition_count INTEGER := 0;
BEGIN
    -- 削除対象のパーティションを検索
    FOR partition_record IN 
        SELECT schemaname, tablename 
        FROM pg_tables 
        WHERE tablename ~ '^tracking_summary_\d{6}$'
          AND schemaname = 'public'
    LOOP
        -- パーティション名から日付を抽出
        DECLARE
            partition_date DATE;
        BEGIN
            partition_date := TO_DATE(RIGHT(partition_record.tablename, 6), 'YYYYMM');
            
            IF partition_date < cutoff_date THEN
                -- パーティションを削除
                EXECUTE format('DROP TABLE IF EXISTS %I.%I', partition_record.schemaname, partition_record.tablename);
                partition_count := partition_count + 1;
                RAISE NOTICE 'Deleted old partition: %', partition_record.tablename;
            END IF;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE WARNING 'Failed to process partition %: %', partition_record.tablename, SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE 'Cleanup completed. Deleted % partitions older than %', partition_count, cutoff_date;
END;
$$ LANGUAGE plpgsql;

-- 年次自動実行のためのスケジュール設定（手動実行）
-- SELECT cleanup_old_tracking_partitions(24); -- 2年より古いデータを削除
```

### パフォーマンス監視
```sql
-- パーティション状況監視用View
CREATE VIEW tracking_partition_health AS
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as table_size,
    (SELECT COUNT(*) FROM information_schema.table_constraints 
     WHERE table_name = pt.tablename AND constraint_type = 'PRIMARY KEY') as has_primary_key,
    (SELECT COUNT(*) FROM pg_stat_user_tables 
     WHERE relname = pt.tablename) as stats_available
FROM pg_tables pt
WHERE tablename LIKE 'tracking_summary_%'
ORDER BY tablename DESC;

-- クエリパフォーマンス監視
CREATE VIEW tracking_query_performance AS
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    rows,
    100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
FROM pg_stat_statements 
WHERE query LIKE '%tracking_summary%'
ORDER BY total_time DESC;
```

### エラー監視・アラート
```sql
-- エラーログテーブル（オプション）
CREATE TABLE tracking_error_log (
    id SERIAL PRIMARY KEY,
    tenant_id TEXT,
    org_id TEXT,
    error_type TEXT NOT NULL,
    error_message TEXT NOT NULL,
    context JSONB,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tracking_error_log_occurred_at ON tracking_error_log (occurred_at);
CREATE INDEX idx_tracking_error_log_tenant_org ON tracking_error_log (tenant_id, org_id);

-- エラー記録用RPC関数
CREATE OR REPLACE FUNCTION log_tracking_error(
    p_tenant_id TEXT,
    p_org_id TEXT,
    p_error_type TEXT,
    p_error_message TEXT,
    p_context JSONB DEFAULT '{}'::JSONB
) RETURNS void AS $$
BEGIN
    INSERT INTO tracking_error_log (tenant_id, org_id, error_type, error_message, context)
    VALUES (p_tenant_id, p_org_id, p_error_type, p_error_message, p_context);
END;
$$ LANGUAGE plpgsql;
```

### パフォーマンス最適化指針

#### 1. インデックス最適化
- **複合インデックス**: `(tenant_id, org_id, date)` の順序でクエリパフォーマンスを最大化
- **INCLUDE インデックス**: よく使用されるカラムを INCLUDE で追加してカバリングインデックス化
- **部分インデックス**: アクティブなデータのみにインデックスを作成

#### 2. クエリ最適化
- **パーティション除外**: 日付範囲クエリでパーティション除外を活用
- **集計クエリ**: 可能な限りパーティション単位で並列実行
- **キャッシュ活用**: 頻繁にアクセスされるデータのキャッシュ

#### 3. 運用最適化
- **統計情報更新**: 定期的な ANALYZE の実行
- **VACUUM**: パーティション単位での効率的な VACUUM
- **接続プール**: 適切な接続プール設定

### セキュリティ考慮事項

#### 1. データプライバシー
- **匿名化**: 個人を特定できる情報は保存しない
- **最小限のデータ**: 必要最小限のトラッキングデータのみ収集
- **同意取得**: 必要に応じてCookie同意バナーの実装

#### 2. アクセス制御
- **RLS**: Row Level Security による完全なテナント分離
- **最小権限**: 各機能に必要最小限の権限のみ付与
- **監査ログ**: 重要なデータアクセスの記録

#### 3. データ保護
- **暗号化**: 保存時と転送時の暗号化
- **バックアップ**: 定期的なデータバックアップ
- **削除機能**: ユーザーからの削除要求への対応

---

## 📋 実装チェックリスト

### Phase 1: データベース基盤構築
- [ ] 基本テーブル作成マイグレーション実行
- [ ] パーティション作成マイグレーション実行
- [ ] 自動パーティション作成トリガー設定
- [ ] RPC関数作成・権限設定
- [ ] 基本的な動作テスト実行

### Phase 2: ミドルウェア・トラッキング実装
- [ ] Next.jsミドルウェア実装
- [ ] 流入元判定ロジック実装
- [ ] セッション管理機能実装
- [ ] 訪問記録機能の動作確認
- [ ] エラーハンドリングの確認

### Phase 3: Repository・分析機能実装
- [ ] TrackingRepository基本機能実装
- [ ] 型定義ファイル作成
- [ ] 期間選択機能実装
- [ ] データ集計・変換ロジック実装
- [ ] エラーハンドリング強化

### Phase 4: ダッシュボード実装
- [ ] メインダッシュボードページ作成
- [ ] 期間選択コンポーネント実装
- [ ] サマリーカード実装
- [ ] チャート・グラフ実装
- [ ] 詳細テーブル実装
- [ ] レスポンシブデザイン対応

### Phase 5: Convex統合
- [ ] 予約完了処理へのコンバージョン記録追加
- [ ] traffic_source保存機能実装
- [ ] クライアント側流入元取得機能実装
- [ ] エラーハンドリング強化
- [ ] 動作テスト・デバッグ

### Phase 6: 運用・最適化
- [ ] パフォーマンス監視設定
- [ ] エラーログ・監視機能実装
- [ ] データ保持期間・削除機能設定
- [ ] セキュリティ・プライバシー対応
- [ ] ドキュメント・運用手順書作成

---

## 💡 期待される効果

### 定量的効果
- **データ削減**: 従来方式と比較して98%のデータ量削減
- **コスト効率**: 追加インフラコスト0円で高度な分析機能を提供
- **パフォーマンス**: ページロード時間への影響を最小限（<50ms）に抑制
- **スケーラビリティ**: 3,000店舗同時運用でも安定動作

### ビジネス効果
- **ROI可視化**: 流入元別のマーケティングROIを定量的に分析
- **広告最適化**: 効果の低いチャネルの特定と予算再配分
- **コンバージョン向上**: データドリブンな改善施策の実行
- **競合優位性**: 精密なデータ分析による戦略的優位性の確保

### 技術的効果
- **保守性向上**: 既存アーキテクチャとの完全統合
- **拡張性確保**: 将来的な機能追加への柔軟な対応
- **信頼性向上**: 堅牢なエラーハンドリングと監視機能
- **開発効率**: 段階的デプロイとテスト容易性

---

**最終更新**: 2025年7月15日  
**プロジェクト**: Bocker アクセストラッキングシステム  
**実装期間**: 2週間（段階的デプロイ対応）  
**運用開始**: 実装完了後即座に利用可能