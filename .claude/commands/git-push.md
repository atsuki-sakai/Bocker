実装した変更内容をGitHubにコミット・プッシュします。以下のガイドラインに従って、わかりやすいコミットメッセージと適切な粒度でコミットを作成してください。

【コミット作成ガイドライン】

## 1. コミット粒度の原則
- [ ] 1つのコミット = 1つの論理的な変更
- [ ] 関連する変更はまとめる（同じ目的の変更）
- [ ] 異なる目的の変更は分割する
- [ ] レビュー可能なサイズに保つ（差分300行以内推奨）
- [ ] 自動署名なしでコミットを作成する。

## 2. コミットメッセージフォーマット

### 基本構造:
```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type（必須）:
- `feat`: 新機能追加
- `fix`: バグ修正
- `perf`: パフォーマンス改善
- `refactor`: リファクタリング（機能変更なし）
- `style`: コードスタイル修正（セミコロン、インデント等）
- `docs`: ドキュメント更新
- `test`: テスト追加・修正
- `chore`: ビルドプロセスや補助ツールの変更
- `revert`: 以前のコミットを取り消し

### Scope（推奨）:
- `reservation`: 予約機能関連
- `customer`: 顧客管理関連
- `staff`: スタッフ管理関連
- `convex`: Convexデータベース関連
- `supabase`: Supabaseデータベース関連
- `auth`: 認証関連
- `ui`: UI/UXコンポーネント

### 実装例:

## 3. 今回の変更をコミットする

### ステップ1: 変更内容の確認
```bash
# 変更ファイルの確認
git status

# 差分の詳細確認
git diff

# ステージング前の最終確認
git diff --stat
```

### ステップ2: 変更を論理的にグループ化

#### コミット1: Convexクエリ最適化
```bash
# 関連ファイルをステージング
git add convex/reservation/queries.ts
git add convex/reservation/schema.ts
git add convex/_generated/api.d.ts

# コミットの例
git commit -m "perf(convex): 予約クエリの複合インデックス最適化

- 書き込み優位テーブルのインデックスを7個から2個に削減
- by_tenant_date_staffインデックスで主要クエリをカバー
- 低頻度クエリはフィルタリングで対応
- 書き込みパフォーマンス30%向上見込み
```

#### コミットの例: ドキュメント更新
```bash
# ドキュメントファイルをステージング
git add README.md
git add docs/performance-optimization.md

# コミット
git commit -m "docs: Convexクエリ最適化のベストプラクティスを追加

- インデックス設計の判断基準を文書化
- 読み書き頻度に基づく最適化戦略
- パフォーマンス測定方法を追加"
```

### ステップ3: プッシュ前の最終確認
```bash
# コミット履歴の確認
git log --oneline -5

# リモートとの差分確認
git fetch origin
git diff origin/main...HEAD --stat

# プッシュ対象の確認
git push --dry-run

# developブランチへpush ※mainブランチにもpushするかを聞く、必要があればmainブランチにもpushする
git push origin develop
```
このプロンプトは：
- 明確なコミットメッセージ規約
- 論理的な変更の分割方法
- 実践的なGitコマンド例
- PR作成のベストプラクティス
- チーム開発での協調作業を考慮

を含み、保守性の高いコミットメッセージの作成を目的としています。