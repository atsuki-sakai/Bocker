Next.js 15.3.3 (App Router) + TypeScript + Convex/Supabaseのハイブリッド構成で構築された、3,000店舗規模の美容サロンSaaS予約管理システムのコードパフォーマンスを分析し、以下の観点から具体的な最適化提案を3つ提示してください。まず修正のプランを説明して合意を得てから修正に移ってください。：

【基本の調査項目】
使用技術のベストプラクティスに従って実装されているかの調査、確認。

【分析対象のページ】
 #

 ※インポートなどコードベース内の関連コードを特定し理解する。

【システムコンテキスト】
- マルチテナント型SaaS（3,000店舗・日次32.5件/店の予約処理）
- リアルタイムデータ: Convex（アクティブ予約・スタッフ・メニュー）
- アーカイブデータ: Supabase PostgreSQL（履歴・分析・顧客マスタ）
- 認証: Clerk（組織管理）、決済: Stripe Connect
- 画像ストレージ: GCS（年間24-38TB規模）

【重点分析項目】

クエリを1本にまとめる（いわゆる「Backend for Frontend」パターン）メリットは、主に以下の点に集約されます。

1. **必要なデータだけを効率的に取得できる**  
   クライアントが必要とする状態をピンポイントで返すクエリを作成できるため、余計なデータ取得や複数回のリクエストを避けられます。これにより、通信回数やデータ転送量が減り、パフォーマンスが向上します。  
   >「サーバー側で派生状態（derived state）を提供でき、クライアントが必要とする状態をターゲットにしたクエリを書ける」  
   [Why Convex Queries are the Ultimate Form of Derived State](https://stack.convex.dev/why-convex-queries-are-the-ultimate-form-of-derived-state#state-in-a-convex-world)

2. **クライアント側のロジックがシンプルになる**  
   クライアントで複雑な状態管理やデータの結合処理を行う必要がなくなり、実装や保守が容易になります。

3. **一貫性のあるデータ取得**  
   サーバー側でまとめてデータを取得・整形することで、クライアントごとに異なるデータ取得ロジックによる不整合を防げます。

4. **パフォーマンスの予測がしやすい**  
   Convexではクエリごとにどのインデックスを使うか明示的に指定できるため、SQLのようにクエリプランナーの気まぐれでパフォーマンスが大きく変動することがありません。  
   >「Convexクエリは指定したインデックスを必ず使うため、パフォーマンスが予測しやすい」  
   [Translate SQL into Convex Queries](https://stack.convex.dev/translate-sql-into-convex-queries)

5. **リアクティブなUIとの親和性**  
   Convexのクエリは自動的にリアクティブに保たれるため、クライアントはサーバーの状態を「単一のソース・オブ・トゥルース」として扱えます。  
   >「サーバー状態を単一の“source of truth”として扱える」  
   [Why Convex Queries are the Ultimate Form of Derived State](https://stack.convex.dev/why-convex-queries-are-the-ultimate-form-of-derived-state#state-in-a-convex-world)

このように、クエリを1本にまとめることで、効率・一貫性・保守性・パフォーマンスの面で多くのメリットがあります。ただ過度な最適化は煩雑性を高め拡張性が高まるので必要に応じて判断を仰いでください。

1. **リアルタイム処理の最適化**
   - Convex関数の実行時間短縮（10秒制限対策）
   - WebSocketサブスクリプションの効率化
   - OCC（楽観的同時実行制御）によるレースコンディション対策
   - useQuery/useMutationフックの適切なキャッシュ戦略

2. **ハイブリッドDB間のデータフロー最適化**
   - Convex→Supabase日次バッチ移行の効率化（500件/チャンク）
   - 検索処理の最適化（pg_trgm + Generated Column活用）
   - 複合インデックス設計（tenant_id優先）
   - 論理削除（is_archive）のクエリパフォーマンス

3. **フロントエンドパフォーマンス**
   - 大量予約データのタイムライン表示最適化
   - Dynamic Imports活用によるバンドルサイズ削減
   - React Virtual/TanStack Virtual導入機会
   - shadcn/uiコンポーネントの遅延ロード

4. **画像処理・ストレージ最適化**
   - カルテ画像（4枚×175KB/予約）のアップロード効率化
   - WebP/AVIF自動変換・サムネイル生成
   - Cloud CDN活用によるキャッシュ戦略
   - GCS Lifecycleルール（Standard→Coldline→Archive）

5. **マルチテナント特有の課題**
   - テナント間のリソース分離・公平性確保
   - 同時実行制御（スタッフ別・席数制限）
   - プラン別制限（LITE: 200件/月、PRO: 500件/月）の効率的実装
   - 組織切り替え時のキャッシュ無効化戦略

【提案フォーマット】
各最適化提案について以下を含めてください：

- **問題の説明**と影響度（Critical/High/Medium/Low）
- **パフォーマンス指標**（現状→目標値）
- **具体的な実装例**（Before/After）
  ```typescript
    　Before
    　  問題のあるコード
    After
        最適化されたコード