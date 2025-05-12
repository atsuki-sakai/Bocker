# Google Cloud Storage サービス

このモジュールでは、GCP Cloud Storageを利用して画像ファイルのアップロードと管理を行います。

## 機能概要

- サービスアカウントによる認証
- 適切な階層構造でのファイル保存
- サムネイル自動生成機能
- 画像の最適化とリサイズ

## フォルダ階層

```
your-bucket/
├─ originals/          # 元画像
│   ├─ staff/          # スタッフ画像
│   ├─ menu/           # メニュー画像 
│   ├─ salon/          # サロン店舗画像
│   └─ example/        # 施術例画像
└─ thumbnails/         # サムネイル
    ├─ staff/
    ├─ menu/
    ├─ salon/
    └─ example/
```

## 使用方法

### 画像のアップロード（サムネイル自動生成）

```typescript
import { useAction } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { fileToBase64 } from '@/lib/utils';

// コンポーネント内
const uploadWithThumbnail = useAction(api.storage.uploadWithThumbnail);

const handleFileUpload = async (file: File) => {
  if (!file) return;
  
  // ファイルをBase64に変換
  const base64Data = await fileToBase64(file);
  
  // アップロード実行
  const result = await uploadWithThumbnail({
    base64Data,
    filePath: file.name,
    contentType: file.type,
    category: 'staff' // 'staff', 'menu', 'salon', 'example' のいずれか
  });
  
  // 結果処理
  console.log('Original URL:', result.original.publicUrl);
  console.log('Thumbnail URL:', result.thumbnail.publicUrl);
  
  // DBに保存する場合は、両方のURLを保存することが推奨されます
  // 例: await createStaff({ ...staffData, imgUrl: result.original.publicUrl, thumbnailUrl: result.thumbnail.publicUrl });
};
```

### 画像の削除

```typescript
import { useAction } from 'convex/react';
import { api } from '@/convex/_generated/api';

// コンポーネント内
const deleteImage = useAction(api.storage.killWithThumbnail);

const handleDelete = async (imgUrl: string) => {
  // オリジナル画像のURLを渡すと、サムネイルも同時に削除されます
  await deleteImage({
    imgUrl: imgUrl
  });
};
```

## 推奨実装パターン

1. 画像アップロードには `uploadWithThumbnail` アクションを使用し、オリジナルとサムネイルの両方のURLをDBに保存
2. 一覧表示画面ではサムネイルURLを使用
3. 詳細表示画面では高解像度のオリジナルURLを使用

これにより、表示速度、データ通信量、ユーザー体験がすべて向上します。 