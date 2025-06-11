=== 目的 ===
あなた（AI エージェント）は、Next.js App Router v15.x（React 19）+ TypeScript で実装された
<対象ファイル> の処理や性能を解析し、以下 4 項目を **総合的に最適化** するための
**具体的な改善提案とコード修正案** を提示してください。

1. **描画コスト**（ブラウザ側の JS/DOM/CSS 負荷）  
2. **レンダリング速度**（TTFB・CLS・LCP・Hydration 速度など）  
3. **運用コスト**（Edge / Node / Functions 実行時間・データ転送・ストレージ課金）  
4. **🔵 バンドルサイズ**（ページ／共有バンドル、初回 JS、CSS、画像アセット）

=== 前提 ===
- Next.js 15.3 以降 / React 19 “Server Components + Streaming” が利用可能  
- TypeScript strict mode  
- Vercel にデプロイ（Edge Functions と Node.js Functions が併用可能）  
- CSS は Tailwind + shadcn/ui  
- 画像は GCP Cloud Storage 経由で next/image を使用  
- 可能な限り **RSC（純粋サーバーコンポーネント）** 化して JS バンドルを削減  
- SEO とアクセシビリティも担保  
- Lighthouse 90+ 点、**🔵 ページ単体 First Load JS ≤ 150 kB** を目標

=== 期待するアウトプット形式 ===
1. **サマリー（200–300 字）**  
   - ボトルネック箇所と最重要アクションを箇条書き 3 件以内で

2. **詳細レビュー**  
   - 下記 6 視点ごとに *観点 → 問題点 → 推奨策* をマークダウン表で整理  
     1. JS バンドル最適化  
     2. 🔵 **バンドルサイズ削減（静的・動的分割）**  
     3. ネットワーク（キャッシュ・プリフェッチ）  
     4. サーバー／エッジ実行コスト  
     5. レンダリング & UX パフォーマンス  
     6. アクセシビリティ & SEO

3. **修正コード例**  
   - `diff` 形式で主要コンポーネントを抜粋し、**最小差分**で示す  
   - Dynamic Import／`use client` の削除・追加、`next/link` の `prefetch` 制御、  
     🔵 `import("@vercel/analytics")` 等の **オンデマンド計測 SDK 遅延読込** 例も含める  
   - `next/cache` API (`cache()`, `revalidateTag()` 等) の使用例を挿入

4. **計測 & 検証指示**  
   - `next build --profile && next analytics` で確認すべきメトリクスと閾値  
   - 🔵 `ANALYZE=true next build` + **`@next/bundle-analyzer`** によるバンドル可視化手順  
   - Chrome Lighthouse、Web Vitals による再計測フロー

=== 制約・ベストプラクティスリスト（最新版・厳守） ===
- **RSC ファースト**: UI に直接必要ないロジックは Server Components 化  
- **Edge Functions**: 50 ms 未満で終わる軽量 I/O を Edge、長時間処理は Node Functions  
- **Dynamic Import**: Heavy UI / SDK / マーケティングタグは `dynamic(..., { ssr:false })`  
- **🔵 パフォーマンスバジェット**:  
  - *First Load JS ≤ 150 kB / page*（gzip）(※現実的にSaasシステムなのでバンドルは平均より大きくなる前提で最善の方法で最適化する)
  - *共通 JS（_app chunk）≤ 70 kB*  
  - *Largest Component ≥ 30 kB は動的分割を検討*  
- **Suspense + Streaming**: LCP 要素優先表示で FCP/LCP を短縮  
- **next/image v3**: `sizes`, `priority`, `placeholder="blur"` を正しく設定  
- **React 19 Actions**: Server Actions でフォーム処理、JS 無効でも完結  
- **Prefetch Control**: 上位 80% 遷移先のみ `prefetch`  
- **Loading UI**: skeleton を `min-height` 付きで CLS = 0  
- **Strict TS**: 未使用 import / any / ts-ignore 禁止  
- **監視**: Vercel Analytics＋Sentry で RUM とエラーを継続計測

=== 入力 ===
- 対象ファイル: #
- 依存するコンポーネントやフックも必要に応じて自動で読み込み、関連箇所をレビュー対象に含めること