# GCP Cloud CDN 実装計画書

## 概要

本ドキュメントは、Bcker プロジェクトにおいて Google Cloud Storage (GCS) の画像を Cloud CDN 経由で配信するための実装計画書です。

## 現状分析

### 現在の構成

- **ストレージ**: Google Cloud Storage (`bocker_storage` バケット)
- **アクセス方法**: `https://storage.googleapis.com/bocker_storage/` 経由での直接アクセス
- **画像フォーマット**: WebP（iOS以外）、JPEG/PNG（iOS）
- **画像サイズ**: オリジナル画像とサムネイル画像の2種類を生成

### 現在の問題点

1. **パフォーマンス**:
   - GCS直接アクセスのため、地理的に離れたユーザーの場合レイテンシが高い
   - キャッシュが効いていない

2. **コスト**:
   - 全てのリクエストがGCSに到達するため、転送料金が高い
   - 同じ画像への重複アクセスでも都度課金される

3. **スケーラビリティ**:
   - トラフィック増加時にGCSへの直接アクセスがボトルネックになる可能性

## CDN実装による改善点

1. **高速化**: エッジロケーションからの配信により、レイテンシを大幅削減
2. **コスト削減**: キャッシュヒット率向上により、GCSへのアクセスとデータ転送量を削減
3. **可用性向上**: CDNによる冗長性とDDoS保護

## 実装計画

### Phase 1: 基本的なCDN設定（現在一部完了）

#### 完了済み
- Cloud CDN の有効化
- ロードバランサーの設定（`bocker-storage-rood-balancer`）
- バックエンドバケットの設定（`bocker-storage-backend`）
- CDNエンドポイントの作成（`https://34.54.80.23`）

#### 必要な作業

1. **バケットの公開設定**
   ```bash
   # GCPコンソールまたはgcloudコマンドで実行
   gsutil iam ch allUsers:objectViewer gs://bocker_storage
   ```

2. **CORS設定の更新**
   ```json
   {
     "cors": [{
       "origin": ["https://bocker.jp", "https://bocker-project.vercel.app","http://localhost:3000"],
       "method": ["GET", "HEAD"],
       "responseHeader": ["Content-Type", "Cache-Control"],
       "maxAgeSeconds": 3600
     }]
   }
   ```

### Phase 2: Next.js アプリケーションの更新

#### 1. 環境変数の追加

```bash
# .env.local
NEXT_PUBLIC_CDN_DOMAIN=https://34.54.80.23
NEXT_PUBLIC_USE_CDN=true
```

#### 2. 画像URL生成ヘルパーの更新

```typescript
// lib/cdn-utils.ts
export function getImageUrl(path: string): string {
  const useCdn = process.env.NEXT_PUBLIC_USE_CDN === 'true';
  const cdnDomain = process.env.NEXT_PUBLIC_CDN_DOMAIN;
  const bucketName = process.env.NEXT_PUBLIC_GCP_STORAGE_BUCKET_NAME;
  
  if (useCdn && cdnDomain) {
    return `${cdnDomain}/${bucketName}/${path}`;
  }
  
  return `https://storage.googleapis.com/${bucketName}/${path}`;
}
```

#### 3. 既存のuploadヘルパー関数の更新

```typescript
// services/gcp/cloud_storage/helpers.ts に追加
import { getImageUrl } from '@/lib/cdn-utils';

// uploadCompressedImageWithThumbnailSignedUrl の戻り値を更新
const result = {
  original: { 
    publicUrl: getImageUrl(originalFilePath),
    filePath: originalFilePath 
  },
  thumbnail: { 
    publicUrl: getImageUrl(thumbFilePath),
    filePath: thumbFilePath 
  },
};
```

#### 4. Next.js設定の更新

```javascript
// next.config.ts
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
        pathname: '/bocker_storage/**',
      },
      {
        protocol: 'https',
        hostname: '34.54.80.23',
        pathname: '/**',
      },
    ],
    // CDN最適化のための設定
    minimumCacheTTL: 60 * 60 * 24, // 24時間
    formats: ['image/webp', 'image/avif'],
  },
};
```

### Phase 3: 段階的移行戦略

#### 1. 機能フラグによる制御

```typescript
// lib/feature-flags.ts
export const featureFlags = {
  useCdnForImages: process.env.NEXT_PUBLIC_USE_CDN === 'true',
  cdnRolloutPercentage: parseInt(process.env.NEXT_PUBLIC_CDN_ROLLOUT_PERCENTAGE || '0'),
};

export function shouldUseCdn(userId?: string): boolean {
  if (!featureFlags.useCdnForImages) return false;
  
  // A/Bテストロジック（必要に応じて）
  if (userId && featureFlags.cdnRolloutPercentage < 100) {
    const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return (hash % 100) < featureFlags.cdnRolloutPercentage;
  }
  
  return true;
}
```

#### 2. 画像コンポーネントのラッパー作成

```typescript
// components/common/OptimizedImage.tsx
import Image from 'next/image';
import { getImageUrl } from '@/lib/cdn-utils';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  fill?: boolean;
  className?: string;
  priority?: boolean;
  sizes?: string;
}

export function OptimizedImage({ src, ...props }: OptimizedImageProps) {
  const optimizedSrc = getImageUrl(src);
  
  return (
    <Image
      {...props}
      src={optimizedSrc}
      loader={({ src }) => src} // CDN URLをそのまま使用
    />
  );
}
```

### Phase 4: キャッシュ戦略の最適化

#### 1. Cloud CDN のキャッシュ設定

```yaml
# CDN キャッシュポリシー
cacheMode: USE_ORIGIN_HEADERS
clientTtl: 86400  # 24時間
defaultTtl: 86400 # 24時間
maxTtl: 31536000 # 1年
negativeCaching: true
negativeCachingPolicy:
  - code: 404
    ttl: 120  # 404エラーは2分間キャッシュ
```

#### 2. GCS側のCache-Controlヘッダー設定

```typescript
// services/gcp/cloud_storage/GoogleStorageService.ts
// uploadFileメソッドに追加
const file = this.bucket.file(filePath);
await file.save(buffer, {
  metadata: {
    contentType,
    cacheControl: 'public, max-age=31536000, immutable', // 1年間キャッシュ
  },
});
```

### Phase 5: モニタリングとアラート

#### 1. Cloud Monitoring 設定

- CDN ヒット率の監視
- オリジンへのリクエスト数
- レイテンシメトリクス
- エラー率

#### 2. アラート設定

```yaml
# アラートポリシー例
- displayName: "CDN Hit Rate Low"
  conditions:
    - displayName: "CDN hit rate below 80%"
      conditionThreshold:
        filter: 'resource.type="https_lb_rule" AND metric.type="loadbalancing.googleapis.com/https/request_count"'
        comparison: COMPARISON_LT
        thresholdValue: 0.8
```

## 実装上の注意点

### 1. セキュリティ考慮事項

- **署名付きURL**: プライベートコンテンツには引き続き署名付きURLを使用
- **CORS設定**: 必要最小限のオリジンのみ許可
- **画像の検証**: アップロード時のコンテンツタイプとファイルサイズの検証を維持

### 2. 既存機能との互換性

- **画像削除**: CDNキャッシュのパージも考慮
- **画像更新**: ファイル名にハッシュまたはタイムスタンプを含めてキャッシュバスティング
- **開発環境**: ローカル開発時はCDNをバイパス

### 3. パフォーマンス最適化

```typescript
// 画像プリロード（重要な画像用）
export function preloadImage(src: string) {
  if (typeof window !== 'undefined') {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = getImageUrl(src);
    document.head.appendChild(link);
  }
}
```

## 移行スケジュール

1. **Week 1**: 開発環境でのCDN設定とテスト
2. **Week 2**: ステージング環境での検証
3. **Week 3**: 本番環境での段階的ロールアウト（10% → 50% → 100%）
4. **Week 4**: モニタリングと最適化

## コスト試算

### 現状（CDNなし）
- GCS データ転送: $0.12/GB
- 月間転送量（推定）: 1TB
- 月額コスト: $120

### CDN導入後（キャッシュヒット率80%想定）
- CDN キャッシュヒット: $0.08/GB × 800GB = $64
- GCS データ転送: $0.12/GB × 200GB = $24
- CDN 固定費: $20
- 月額コスト: $108（約10%削減）

## リスクと軽減策

| リスク | 影響 | 軽減策 |
|--------|------|--------|
| CDN障害 | 画像が表示されない | フォールバック機能の実装 |
| キャッシュの不整合 | 古い画像が表示される | バージョニングとキャッシュ無効化 |
| CORS エラー | 画像読み込み失敗 | 適切なCORS設定と監視 |
| SSL証明書の問題 | HTTPS警告 | 証明書の自動更新設定 |

## まとめ

Cloud CDN の導入により、以下の効果が期待できます：

1. **ユーザー体験の向上**: 画像読み込み速度の改善
2. **コスト削減**: データ転送費用の削減
3. **スケーラビリティ**: トラフィック増加への対応力向上
4. **信頼性**: 可用性とパフォーマンスの向上

段階的な移行とモニタリングにより、リスクを最小限に抑えながら、確実にCDN配信を実現します。