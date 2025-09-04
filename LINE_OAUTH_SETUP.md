# LINE OAuth 認証設定手順

## 問題の概要
LINE認証で「Invalid redirect_uri value」エラーが発生しています。
これはLINE開発者コンソールにリダイレクトURIが登録されていないことが原因です。

## 解決手順

### 1. LINE開発者コンソールにアクセス
1. [LINE Developers](https://developers.line.biz/ja/) にアクセス
2. LINEアカウントでログイン
3. プロバイダーを選択（すでに設定されている場合）

### 2. チャネル設定にアクセス
1. 該当するLINEログインチャネルを選択
2. チャネルID `2007063417` を確認
3. 「LINE Login」タブを選択

### 3. コールバックURL（リダイレクトURI）の設定
「コールバックURL」セクションで以下のURLを**すべて**追加してください：

```
https://bocker.jp/ja/reservation/auth/callback
https://bocker-project.vercel.app/ja/reservation/auth/callback
https://barely-prague-cargo-charger.trycloudflare.com/ja/reservation/auth/callback  
http://localhost:3000/ja/reservation/auth/callback
```

### 4. チャネルシークレットの確認
1. 「チャネル基本設定」タブに移動
2. 「チャネルシークレット」を取得
3. `.env.local`ファイルの`LINE_CHANNEL_SECRET=REPLACE_WITH_ACTUAL_CHANNEL_SECRET`を実際の値に置換

### 5. その他の設定確認
- **スコープ**: `profile` と `openid` が有効になっていることを確認
- **ウェブアプリでのLINEログイン**: 有効になっていることを確認

## 開発環境での注意事項

### 動的ドメインの問題
- Cloudflareトンネルや類似のサービスを使用する場合、ドメインが動的に変わる可能性があります
- その場合は新しいドメインもLINE開発者コンソールに追加する必要があります

### 現在のリダイレクトURI生成ロジック
以下の優先順位でリダイレクトURIを決定します：
1. `customRedirectUri` が指定されている場合はそれを使用
2. `localhost` で動作中かつ `NEXT_PUBLIC_DEVELOP_URL` が設定されている場合、そのオリジンを使用
3. それ以外は常に `window.location.origin` を使用（Preview/Production 環境でドメイン不一致を防止）

注: Production 環境では `NEXT_PUBLIC_DEVELOP_URL` は使用されません（設定されていても無視されます）。

### 環境変数の設定
`.env.local`ファイルに以下が追加されました：
```env
# LINE OAuth Authentication
LINE_CHANNEL_ID=2007063417
LINE_CHANNEL_SECRET=REPLACE_WITH_ACTUAL_CHANNEL_SECRET
```

**重要**: `LINE_CHANNEL_SECRET`を実際の値に置き換えてください。

## トラブルシューティング

### まだエラーが発生する場合
1. LINE開発者コンソールでコールバックURLが正しく保存されていることを確認
2. ブラウザのキャッシュをクリア
3. 開発サーバーを再起動
4. コンソールログでリダイレクトURIが正しく生成されていることを確認

### デバッグ情報
ブラウザのDevToolsで以下を確認：
- `[useLineAuth] Starting authentication flow:` のログ
- 生成されたリダイレクトURIが期待値と一致するか
- LINEの認証URLに含まれる`redirect_uri`パラメータ

## セキュリティ考慮事項
- 本番環境では必要最小限のリダイレクトURIのみを登録
- 開発用のlocalhostやトンネルURLは本番環境では削除
- チャネルシークレットは絶対に公開しないよう注意
