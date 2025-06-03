# 美容サロン施術メニュー説明文生成API

Gemini AIを使用して、美容サロンの施術メニューの魅力的な説明文を自動生成するAPIエンドポイントです。

## エンドポイント

```
POST /api/generate-menu-description
```

## 環境変数

APIを使用する前に、以下の環境変数を設定してください：

```bash
GEMINI_API_KEY=your_gemini_api_key_here
```

## リクエスト形式

### ヘッダー
```
Content-Type: application/json
```

### リクエストボディ
```typescript
{
  "product_name": string,      // 商品名（施術名）
  "duration": string,          // 施術時間
  "price": string,             // 価格
  "features": string,          // 主な特徴・サービス内容
  "effects": string,           // 期待できる効果
  "recommended_for": string    // おすすめの人・シーン
}
```

### リクエスト例
```json
{
  "product_name": "極上ヘッドスパ",
  "duration": "60分",
  "price": "6,600円",
  "features": "頭皮のコリを丁寧にほぐし、リラクゼーション効果抜群",
  "effects": "髪や頭皮が健康になり、ストレス解消にも最適",
  "recommended_for": "日々の疲れが溜まっている方、リフレッシュしたい方"
}
```

## レスポンス形式

### 成功時（200 OK）
```json
{
  "success": true,
  "description": "生成された施術メニュー説明文（200-300文字程度）"
}
```

### エラー時（400 Bad Request / 500 Internal Server Error）
```json
{
  "success": false,
  "error": "エラーメッセージ"
}
```

## 使用例

### curl
```bash
curl -X POST http://localhost:3000/api/generate-menu-description \
  -H "Content-Type: application/json" \
  -d '{
    "product_name": "極上ヘッドスパ",
    "duration": "60分",
    "price": "6,600円",
    "features": "頭皮のコリを丁寧にほぐし、リラクゼーション効果抜群",
    "effects": "髪や頭皮が健康になり、ストレス解消にも最適",
    "recommended_for": "日々の疲れが溜まっている方、リフレッシュしたい方"
  }'
```

### JavaScript/TypeScript
```typescript
const response = await fetch('/api/generate-menu-description', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    product_name: '極上ヘッドスパ',
    duration: '60分',
    price: '6,600円',
    features: '頭皮のコリを丁寧にほぐし、リラクゼーション効果抜群',
    effects: '髪や頭皮が健康になり、ストレス解消にも最適',
    recommended_for: '日々の疲れが溜まっている方、リフレッシュしたい方'
  })
});

const data = await response.json();
if (data.success) {
  console.log('生成された説明文:', data.description);
} else {
  console.error('エラー:', data.error);
}
```

## 注意事項

1. **環境変数の設定**: GEMINI_API_KEYが正しく設定されていることを確認してください
2. **リクエスト制限**: Gemini APIの利用制限に注意してください
3. **文字数**: 生成される説明文は200-300文字程度です
4. **言語**: 日本語での説明文を生成します
5. **セキュリティ**: 本番環境では適切な認証・認可機能を追加してください

## エラーハンドリング

- 必須フィールドが不足している場合は400エラー
- APIキーが設定されていない場合は500エラー
- Gemini APIでエラーが発生した場合は500エラー

## 依存関係

このAPIを使用するには、以下のパッケージが必要です：

```bash
pnpm install @google/generative-ai
```


## テストデータ
{
  "samples": [
    {
      "name": "ヘッドスパメニュー",
      "request": {
        "product_name": "極上ヘッドスパ",
        "duration": "60分",
        "price": "6,600円",
        "features": "頭皮のコリを丁寧にほぐし、リラクゼーション効果抜群",
        "effects": "髪や頭皮が健康になり、ストレス解消にも最適",
        "recommended_for": "日々の疲れが溜まっている方、リフレッシュしたい方"
      }
    },
    {
      "name": "フェイシャルトリートメント",
      "request": {
        "product_name": "美肌再生フェイシャル",
        "duration": "80分",
        "price": "9,800円",
        "features": "医療グレードの美容成分を使用した深層ケア、専用機器による毛穴洗浄とリフトアップ",
        "effects": "くすみ改善、毛穴の引き締め、肌のハリ・弾力向上、明るい肌色へ",
        "recommended_for": "肌のくすみやたるみが気になる方、特別な日に向けて肌を整えたい方"
      }
    },
    {
      "name": "ボディマッサージ",
      "request": {
        "product_name": "アロマdeep リラクゼーション",
        "duration": "90分",
        "price": "12,000円",
        "features": "天然アロマオイルを使用した全身マッサージ、リンパの流れを改善する手技",
        "effects": "血行促進、むくみ解消、疲労回復、深いリラクゼーション効果",
        "recommended_for": "デスクワークで体が凝っている方、ストレス発散したい方、自分へのご褒美を求める方"
      }
    },
    {
      "name": "痩身エステ",
      "request": {
        "product_name": "セルライト撃退コース",
        "duration": "70分",
        "price": "15,000円",
        "features": "最新のキャビテーション機器とハンドマッサージの組み合わせ、温感ジェル使用",
        "effects": "セルライトの改善、部分痩せ効果、肌の引き締め、基礎代謝向上",
        "recommended_for": "頑固なセルライトにお悩みの方、部分痩せしたい方、理想のボディラインを目指す方"
      }
    },
    {
      "name": "ネイルケア",
      "request": {
        "product_name": "贅沢ハンドケア＆ジェルネイル",
        "duration": "120分",
        "price": "8,500円",
        "features": "角質ケア、保湿パック、爪の形成からアート仕上げまでトータルケア",
        "effects": "手肌の保湿・美白効果、爪の強化、美しいネイルアートで指先美人に",
        "recommended_for": "手荒れが気になる方、特別なイベントを控えている方、指先をキレイに保ちたい方"
      }
    }
  ]
}
