# CDN実装ガイド

## 概要
GCP CDNを通じた画像配信の実装が完了しました。この実装により、画像の配信速度が向上し、オリジンサーバーの負荷が軽減されます。

## 実装内容

### Phase 2: 基盤実装 ✅
1. **GoogleStorageService.ts更新** (`/services/gcp/cloud_storage/GoogleStorageService.ts`)
   - CDNユーティリティメソッドを統合
   - `getCdnUrl`: GCS URLをCDN URLに変換
   - `getCdnUrls`: 複数URL一括変換
   - `transformImageUrlsInObject`: オブジェクト内URL変換
   - `isCdnEnabled`: CDN有効/無効判定
   - `isCdnUrl`: CDN URL判定
   - `getGcsUrlFromCdn`: デバッグ用逆変換
   - `uploadFileBuffer`メソッドでCDN URL返却
   - Cache-Controlヘッダー設定済み（1年間キャッシュ）

2. **helpers.ts更新** (`/services/gcp/cloud_storage/helpers.ts`)
   - `uploadCompressedImageWithThumbnailSignedUrl`関数でCDN URL返却
   - GoogleStorageServiceのCDNメソッドを使用

4. **next.config.ts更新**
   - CDNドメインの動的追加

### Phase 3: コンポーネント実装 ✅
1. **OptimizedImage.tsx** (`/components/common/OptimizedImage.tsx`)
   - CDN自動変換機能
   - エラーハンドリング
   - ローディング状態管理
   - 特化型コンポーネント（サムネイル、バナー、アバター）

## 環境変数設定

### 必要な環境変数
```env
# CDNのベースURL（例: https://cdn.example.com）
NEXT_PUBLIC_CDN_DOMAIN=https://your-cdn-domain.com

# CDNベータテスト機能フラグ（オプション）
NEXT_PUBLIC_CDN_BETA=true
```

### Vercel環境変数設定
1. Vercelダッシュボードで Settings > Environment Variables へ
2. `NEXT_PUBLIC_CDN_DOMAIN` を追加
3. 各環境（Production, Preview, Development）で適切な値を設定

### GCP CDN設定例
```env
# 本番環境
NEXT_PUBLIC_CDN_DOMAIN=https://cdn.yourdomain.com

# ステージング環境
NEXT_PUBLIC_CDN_DOMAIN=https://cdn-staging.yourdomain.com

# 開発環境（CDN無効）
# NEXT_PUBLIC_CDN_DOMAIN= （設定しない）
```

## 使用方法

### 1. 基本的な画像表示
```tsx
import { OptimizedImage } from '@/components/common';

// CDN URLへの自動変換あり（デフォルト）
<OptimizedImage
  src={imageUrl}
  alt="商品画像"
  width={300}
  height={200}
/>

// CDN変換を無効化
<OptimizedImage
  src={imageUrl}
  alt="商品画像"
  width={300}
  height={200}
  transformSrc={false}
/>
```

### 2. 特化型コンポーネント
```tsx
// サムネイル画像
<OptimizedThumbnail
  src={thumbnailUrl}
  alt="サムネイル"
  size={120}
/>

// バナー画像（レスポンシブ）
<OptimizedBanner
  src={bannerUrl}
  alt="バナー"
  className="h-64"
/>

// アバター画像
<OptimizedAvatar
  src={userAvatarUrl}
  alt="ユーザーアバター"
  size={48}
/>
```

### 3. プログラマティックな使用
```tsx
import { gcsService } from '@/services/gcp/cloud_storage/GoogleStorageService';

// 単一URLの変換
const cdnUrl = gcsService.getCdnUrl(gcsUrl);

// オブジェクト内のURL一括変換
const menu = gcsService.transformImageUrlsInObject(menuData, ['imageUrl', 'thumbnailUrl']);
```

### 4. 機能フラグの使用
```tsx
import { isFeatureEnabled, FEATURE_FLAGS } from '@/lib/feature-flags';

// CDNが有効かチェック
if (isFeatureEnabled(FEATURE_FLAGS.CDN_ENABLED)) {
  // CDN有効時の処理
}

// デバッグ情報の出力（開発環境のみ）
import { debugFeatureFlags } from '@/lib/feature-flags';
debugFeatureFlags();
```

## 移行ガイド

### 既存のImageコンポーネントからの移行
```tsx
// Before
import Image from 'next/image';
<Image src={imageUrl} alt="画像" width={300} height={200} />

// After
import { OptimizedImage } from '@/components/common';
<OptimizedImage src={imageUrl} alt="画像" width={300} height={200} />
```

### 既存のimg要素からの移行
```tsx
// Before
<img src={imageUrl} alt="画像" className="w-full h-auto" />

// After
<OptimizedImage 
  src={imageUrl} 
  alt="画像" 
  width={1200} 
  height={800} 
  className="w-full h-auto"
  sizes="100vw"
/>
```

## パフォーマンス最適化のベストプラクティス

1. **適切なサイズ指定**
   - 実際の表示サイズに合わせて`width`と`height`を指定
   - レスポンシブ画像には`sizes`属性を活用

2. **遅延読み込み**
   - ファーストビュー外の画像は`loading="lazy"`（デフォルト）
   - ファーストビュー内の重要な画像は`priority={true}`

3. **フォールバック画像**
   - ブランドロゴなど適切なフォールバック画像を`fallbackSrc`で指定

## トラブルシューティング

### CDN URLが適用されない
1. `NEXT_PUBLIC_CDN_DOMAIN`環境変数が設定されているか確認
2. ビルド後に環境変数が反映されているか確認
3. `transformSrc={false}`が設定されていないか確認

### 画像が表示されない
1. CDNのCORS設定を確認
2. Next.jsの`remotePatterns`にCDNドメインが含まれているか確認
3. ブラウザのネットワークタブでエラーを確認

### キャッシュが更新されない
1. 画像URLが変更されているか確認（同じURLは1年間キャッシュ）
2. ブラウザのキャッシュをクリア
3. CDNのキャッシュパージが必要な場合は実行

## 今後の拡張可能性

1. **画像最適化パラメータ**
   - CDN側での動的リサイズ
   - フォーマット変換（WebP、AVIF）
   - 品質調整

2. **監視・分析**
   - CDNヒット率の監視
   - 配信速度の測定
   - コスト分析

3. **セキュリティ強化**
   - 署名付きURL
   - アクセス制限
   - DDoS対策