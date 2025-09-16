# LINEログインフロー仕様

## 全体像

- 予約フローのサインインは `app/[locale]/(reservation)/reservation/[id]/page.tsx` から開始され、メール/パスワードログインと同じ画面に `OptimizedLineLoginButton` を表示する。
- ボタンは `hooks/useLineAuth.ts` を通じて OAuth 2.1 (PKCE) フローを開始し、サーバー側 API (`/api/auth/line/*`) と連携して LINE とトークン交換を行う。
- トークンは `lib/auth/token-manager.ts` により HttpOnly Cookie へ暗号化保存され、`/api/auth/line-session` が Supabase 上の顧客情報と照合して `bocker_login_session` (JWT) を発行する。
- 成功後は予約カレンダー `/reservation/[orgId]/calendar` へ遷移する。LIFF とのログイン整合性、トークンリフレッシュ、自動セッション生成までを一連の仕組みでカバーする。

## 関連コンポーネントと役割

| レイヤ            | 場所                                                            | 役割                                                                                                                  |
| ----------------- | --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| UI                | `components/auth/OptimizedLineLoginButton.tsx`                  | LINEログインの起動、状態管理、成功後に `/api/auth/line-session` を呼び出して顧客セッションを生成する。                |
| UI (ページ)       | `app/[locale]/(reservation)/reservation/[id]/page.tsx`          | テナント/組織情報を取得し、LINE ログインボタンを表示。セッション検証やリダイレクトを担当。                            |
| UI (コールバック) | `app/[locale]/(reservation)/reservation/auth/callback/page.tsx` | LINE から戻るユーザーの UX を担い、`/api/auth/line/callback` に処理委譲。成功時に `/api/auth/line-session` を再実行。 |
| API               | `app/api/auth/line/start/route.ts`                              | Convex からチャネル情報を取り出し、PKCE state を生成。LINE 認可 URL を返す。                                          |
| API               | `app/api/auth/line/callback/route.ts`                           | 認可コード + state を検証し、トークン交換・IDトークン検証・トークン保存・リダイレクト URL 特定を行う。                |
| API               | `app/api/auth/line/refresh/route.ts`                            | トークン状態チェックと自動更新、ログアウト (token clear) を提供する。                                                 |
| API               | `app/api/auth/line-session/route.ts`                            | 暗号化済みアクセス トークンで LINE Profile を取得し、顧客レコード作成/更新・JWT セッション発行を行う。                |
| ライブラリ        | `lib/line-oauth.ts`                                             | PreAuth state 生成、PKCE、state 抽出、Cookie 設定、デバッグロガーなど OAuth 基盤機能。                                |
| ライブラリ        | `lib/auth/token-manager.ts`                                     | LINE トークンの暗号化保存、検証、リフレッシュ、破棄、アクセストークン取得を統括。                                     |
| ライブラリ        | `lib/verify-line-idtoken.ts`                                    | LINE ID トークンを HS256 / ES256 で検証し、nonce や aud をチェック。                                                  |
| 定数              | `services/line/constants.ts`                                    | `bocker_login_session` など Cookie 名や TTL を集約。                                                                  |

## シーケンス概要

1. **予約ページ表示**

   - `useQuery` で Convex から組織設定 (`tenantId`, `apiConfig`) を取得。
   - LINE Key が揃えば `OptimizedLineLoginButton` が表示される。
   - 初期マウントで `/api/auth/session?tenantId&orgId` を呼び、既存セッションがあればカレンダーへ遷移。

2. **ボタンクリック** (`OptimizedLineLoginButton`)

   - `useLineAuth.login()` を呼び出し、`/api/auth/line/start` に `tenantId`, `orgId`, `scope`, `redirectUri`, `next` を送信。
   - レスポンスの `authorizationUrl` へ `window.location.href` で遷移。
   - クリック連打防止、LIFF ログアウト検知、トークン状態監視など UI 状態も管理する。

3. **LINE 認可開始** (`/api/auth/line/start`)

   - Convex `api.organization.api_config` からチャネル ID/Secret を取得。
   - `createPreAuth` で `stateId` と PKCE code*verifier / nonce を生成し、`line_oauth*<state>` Cookie に暗号化保存。
   - `https://access.line.me/oauth2/v2.1/authorize` の URL を組み立てて返す。

4. **LINE からコールバック** (LINE → `/ja/reservation/auth/callback` → ブラウザ)

   - ブラウザは callback ページ (`LineAuthCallbackPage`) を表示。`code` / `state` / `liff.state` を収集し、`/api/auth/line/callback` に POST。

5. **認可コード交換** (`/api/auth/line/callback`)

   - `extractState` で state を取り出し、`line_oauth_<state>` Cookie を復号。TTL・再利用チェックなどを `validatePreAuthEnhanced` で実施。
   - Convex からチャネル資格情報を再取得。
   - `exchangeCodeForTokens` が LINE Token API を叩き、`access_token` / `refresh_token` / `id_token` を受信。
   - `verifyLineIdToken` で ID トークンを検証（HS256/ES256 自動判別 + nonce 検証）。
   - `storeTokens` が `line_at_enc`, `line_rt_enc`, `line_at_exp`, `line_at_iat` Cookie に暗号化保存し、`line_ctx_tid` / `line_ctx_oid` でテナント文脈も保持。
   - `safeNext(preAuth.next)` で決まる `redirect` 先へ 302 リダイレクトし、`?auth_success=true` を付与。

6. **フロントエンドで成功検知**

   - `LineAuthCallbackPage` は成功レスポンスで `success` ステータスを表示し、`/api/auth/line-session` を呼び出す。
   - `/api/auth/line-session` は `getValidAccessToken()` により有効な LINE access token を取得。必要ならトークンリフレッシュを実行。
   - LINE Profile API (`/v2/profile`) でユーザー情報を取得し、Supabase `CustomerRepository` で既存顧客を検索/作成。`uuidv4` で仮 UID を割り当て。
   - `SessionPayload` を JWT (`APP_JWT_SECRET`, TTL 30 日) に署名し、`bocker_login_session` Cookie を設定。
   - 成功後 `LineAuthCallbackPage` は 600ms 待機 → `router.push(redirectUrl)`。

7. **通常画面への復帰**

   - 予約ページに戻ると `useLineAuth` が `auth_success` クエリを検出し、トースト表示 + 状態更新。
   - 予約ページの `onSuccess` コールバックが `/reservation/[orgId]/calendar` へ遷移させる。

8. **トークン監視 & 自動再認証** (`useLineAuth` + `/api/auth/line/refresh`)
   - マウント時に `checkAuthStatus` (GET refresh) を実行し、Cookie のトークン状態を確認。
   - `needsRefresh` なら `refreshToken()` (POST refresh) が `refreshLineToken()` を実行。失敗時は `clearTokens()` でトークン削除。
   - `OptimizedLineLoginButton` も 5 秒間隔で LIFF 状態と Cookie を監視し、セッションクッキー欠落時は `/api/auth/line-session` を再実行する。

## Cookie / ストレージ一覧

| 名前                                                          | 設定者                                         | 用途                                                                                  |
| ------------------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------- |
| `line_oauth_<state>`                                          | `/api/auth/line/start`                         | PreAuth (PKCE, nonce, tenant/org) を暗号化保存。コールバック時に 1 回だけ参照し削除。 |
| `line_at_enc` / `line_rt_enc` / `line_at_exp` / `line_at_iat` | `storeTokens`                                  | LINE access / refresh token とメタデータ (暗号化済み)。                               |
| `line_ctx_tid` / `line_ctx_oid`                               | `/api/auth/line/callback`                      | トークン更新時のテナント/組織コンテキスト保持。                                       |
| `bocker_login_session`                                        | `/api/auth/line-session` & `/api/auth/session` | アプリ側ログイン用 JWT。予約画面や API が顧客を識別する。                             |

## エラーハンドリングと UI 連携

- `OptimizedLineLoginButton` は `sonner` トーストで状態を通知し、タイムアウト (10 秒) / 自動リトライ / LIFF との整合性チェックを実装。
- `LineAuthCallbackPage` は URL パラメータの不足・LINE からの `error` を判定し、ステータス別 UI・再試行ボタンを用意。サーバー側が 302 を返した場合も JSON 化して詳細を出力。
- API 側は `debugLogger` により state や LINE API 呼び出しを詳細ログ化。OAUTH_DEBUG_MODE = true のため、現在は本番でもログが多い点に注意。

## 顧客データの扱い

- LINE ユーザーは `CustomerRepository.findByTenantAndOrgAndCustomerLineId` で突合。
- 未登録なら `createCustomerWithDetailsAndPoints` で空メール、`line_user_name`、`customer_type: 'first_time'` を設定。
- 既存顧客の `line_user_name` が変わった場合は都度更新。
- JWT (`SessionPayload`) には `customerUid`, `tenantId`, `orgId`, `lineUserId`, `target_type` などを格納し、`/api/auth/session` と互換性を持たせている。

## 連携済み補助処理

- `performCompleteLogout` (`lib/auth/logout.ts`): セッション Cookie, LINE LIFF 状態, ローカルストレージを削除。
- 予約ページ `useEffect`: セッション存在時は自動リダイレクト。401 になれば `performCompleteLogout()`。

## フローディアグラム (テキスト)

```
User -> OptimizedLineLoginButton.click
  -> useLineAuth.login() -> POST /api/auth/line/start
  -> LINE authorize URL (PKCE state stored)
  -> LINE Auth -> redirect to /ja/reservation/auth/callback
  -> callback page -> POST /api/auth/line/callback
     -> validate state & exchange tokens -> storeTokens()
     -> redirect (auth_success) -> callback page success UI
     -> POST /api/auth/line-session -> LINE profile -> CustomerRepository -> JWT cookie
  -> Router push to /reservation/[orgId]/calendar
```

## 過去ロジックの確認ポイント

- 旧式ボタン (`LineLoginButton`) や `line-login` 関連ページは削除済み。現状は `OptimizedLineLoginButton` のみが提供される。
- 旧 `lineAccessToken` を `localStorage` に保存する処理は残っていないが、`performCompleteLogout` に後方互換クリア処理が残存。
- `/api/auth/line/start` のデバッグログには特定テナント/組織 ID がハードコードされているため、必要なら整備する。
- OAUTH_DEBUG_MODE は `true` 固定で大量ログを吐く。運用時に調整することが推奨される。

## 関連テスト・改善候補

1. LINE トークン再発行時 (`/api/auth/line/refresh`) の統合テスト追加。
2. `/api/auth/line-session` のセッション生成に対するユニットテストまたは e2e カバレッジ。
3. `LineAuthCallbackPage` 成功後のリダイレクト先 (`result.redirectUrl`) と予約ページ `onSuccess` のリダイレクトが二重になっていないか確認 (現状 2 秒遅延でダブル遷移する)。

##　古い処理で削除対象のファイル・関数群

- services/line/constants.ts:5〜:16 (getLineStateTTLMs,
  LINE_STATE_EXPIRY_MS): rg で参照ゼロ。LINE_STATE_SESSION_KEY は app/api/
  auth/logout/route.ts で使われているため残すが、TTL 定数は不使用でした。
- services/line/constants.ts:19〜:24 (COMPANY_LINE_CHANNEL 定
  数): どのモジュールからも import されておらず、各所が直接
  process.env.COMPANY_LINE_CHANNEL_ACCESS_TOKEN を読む実装に置き換わってい
  ます。
- lib/validations/api/line.ts 全体: ファイル自体が未 import。
  lineMessageRequestSchema など 4 つのスキーマも参照が無いことを rg で確認
  済み。
- lib/auth/logout.ts:24〜:25（localStorage / sessionStorage の
  line_access_token 削除）: 付随する setItem / getItem 呼び出しがプロジェクト
  内に存在せず、履歴用の削除コードのみ残っていました。削っても他処理へ影響し
  ません。
- app/api/auth/line/start/route.ts:88〜:105 のハードコード Debug ログ: ア
  ラート用途に限定されており、外部依存なし。削除または環境変数化しても挙動は
  変わりません。

保留／削除不可

- services/line/constants.ts:4 (LINE_STATE_SESSION_KEY): app/api/auth/
  logout/route.ts で実際に Cookie 削除に利用されているため残置してください。
- /api/auth/line-session への二重 POST: 予約トップ (app/[locale]/
  (reservation)/reservation/page.tsx:25) や顧客ログイン (app/
  [locale]/(customer)/customer/[org_id]/auth/login/page.tsx:56) など、
  OptimizedLineLoginButton が存在しないページでは callback 側の呼び出しに依存
  しています。現状では統合せず維持が安全です。
- lib/line-oauth.ts:36 の OAUTH_DEBUG_MODE: 参照箇所が多数あり、単純削除は
  不可。環境変数で切り替える方針を別途検討してください。
