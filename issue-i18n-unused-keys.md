タイトル: languages/ja.json・en.json の未使用翻訳キーの洗い出しと削除

概要
- 翻訳ファイル（languages/ja.json・languages/en.json）に未使用のキーが蓄積している可能性があります。メンテナンス性とバンドル/配信サイズの観点から未使用キーを洗い出し、削除します。

目的
- 未使用翻訳キーの検出と削除。
- 言語間（ja/en）のキー整合性の担保（不足/余剰の是正）。
- 次回以降のドリフトを抑制する検出手段の雛形を残す。

対象
- 翻訳: `languages/ja.json`, `languages/en.json`
- 検索対象コード: `app/`, `components/`, `lib/`, `hooks/`, `services/`, `convex/`, `i18n/`
- 想定ライブラリ: next-intl（`useTranslations`, `getTranslations` 経由の `t('...')` 呼び出し）

対応方針
1) 検出（最小実装）
   - 翻訳キー（ドット表記）一覧を作成（JSON を再帰走査）。
   - コード中の使用箇所を検索。
     - 直接参照: `t('auth.signIn.email')` などのリテラルキー。
     - 名前空間 + 相対キー: `const t = useTranslations('auth.signIn'); t('email')` → `auth.signIn.email`。
   - 動的キー（例: `t(`${prefix}.${name}`)`）は除外リスト/手動確認に回す。
2) 整合性チェック
   - ja/en でキー差分を比較し、未使用でない差分は補完、未使用は削除候補に含める。
3) 削除
   - 未使用キーを削除し、フォーマットを整える（Prettier）。
4) 検証
   - `pnpm build` / `pnpm test:coverage` で型/テスト確認。

想定手順（例）
1. キー抽出ユーティリティを作成（例: `scripts/i18n/list-keys.mts`）
   - 再帰的に JSON を走査し、`a.b.c` 形式のキーを列挙。
2. 使用検出（簡易版）
   - 直接参照: 正規表現 `t\(["'`](?<key>[^"'`]+)["'`]\)` を対象ディレクトリで検索。
   - 名前空間: `useTranslations\(["'`](?<ns>[^"'`]+)["'`]\)` と同ファイル内の `t\(["'`](?<rel>[^"'`]+)["'`]\)` を突き合わせ、`ns.rel` に展開。
   - いずれにも該当しないキーは「候補」。
3. 動的キーの扱い
   - 文字列連結/テンプレートリテラルで組み立てている箇所は検出困難のため、`ALLOWLIST`（例: `scripts/i18n/allowlist.txt`）にパターンを記載して保護。
4. レビュー/削除
   - 候補リストをレビュー → 未使用確定のみ削除。
5. 検証
   - `pnpm build` で型/ビルド確認、`pnpm test:coverage` でユニットテスト確認。

受け入れ条件
- 未使用キーが `languages/ja.json` および `languages/en.json` から削除されている。
- 削除後、`pnpm build` が成功し、ユニットテストがグリーンである。
- ja/en のキー整合性に欠落がない（必要キーが両言語に存在）。
- 動的参照があるキーは誤削除されていない（ALLOWLIST で保護）。

調査のヒント
- よくある使用パターン
  - `const t = useTranslations('namespace.sub'); t('key')` → 実キーは `namespace.sub.key`。
  - `getTranslations({ locale, namespace: 'ns' })` も同様に相対キー。
- 検出強化（任意）
  - AST 解析（@babel/parser など）で、`useTranslations` の戻り値識別子と `t('..')` を同一スコープで突き合わせると精度が上がる。

影響範囲
- 翻訳表示全般（特に `auth/*`, 予約フロー、ヘッダー/フッターなど）。
- ビルド/テストに影響が出る可能性があるため、段階的削除（PR 分割）を推奨。

ラベル案
- `i18n`, `cleanup`, `tech-debt`, `good-first-issue`

実施後
- 変更点を CHANGELOG/PR 説明に記載。
- 今後の検出自動化（CI での簡易チェック）を別 Issue として検討。
