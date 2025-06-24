# Bocker ドキュメント

このディレクトリには、Bockerプロジェクトの技術文書、仕様書、運用ガイドが論理的に整理されています。

## 📚 ドキュメント構成

### 💼 [Business](./business/) - ビジネス文書
- **[Product Overview](./business/product-overview.md)** - 製品概要、料金プラン、機能一覧
- **[User Manual](./business/user-manual.md)** - エンドユーザー向け操作マニュアル、FAQ
- **[Market Analysis](./business/market-analysis.md)** - 市場分析と競合調査レポート

### 🏗️ [Architecture](./architecture/) - アーキテクチャ設計
- **[Design System](./architecture/design-system.md)** - UIデザインシステム、カラーパレット、コンポーネント
- **[Database Design](./architecture/database-design.md)** - ハイブリッドDB設計とスキーマ構造
- **[Scaling Analysis](./architecture/scaling-analysis.md)** - 3,000-30,000店舗スケーリング分析

### 🔧 [Technical](./technical/) - 技術実装

#### [API](./technical/api/) - API仕様
- **[Endpoints](./technical/api/endpoints.md)** - 全APIエンドポイント仕様
- **[LINE Auth Flow](./technical/api/line-auth-flow.md)** - LINE認証フロー詳細

#### [Implementation](./technical/implementation/) - 実装ガイド
- **[CDN](./technical/implementation/cdn.md)** - GCP Cloud CDN実装・画像配信最適化
- **[I18N](./technical/implementation/i18n.md)** - 多言語対応実装ガイド
- **[Inventory Management](./technical/implementation/inventory-management.md)** - 在庫管理システム
- **[Performance Optimizations](./technical/implementation/performance-optimizations.md)** - Convex最適化実績

#### [Database](./technical/database/) - データベース
- **[Supabase](./technical/database/supabase.md)** - PostgreSQL設定と運用
- **[Migration](./technical/database/migration/)** - ConvexからSupabaseへの移行
  - [Overview](./technical/database/migration/overview.md) - 移行概要とシステム構成
  - [Implementation Plan](./technical/database/migration/implementation-plan.md) - 詳細実装計画
  - [Execution Guide](./technical/database/migration/execution-guide.md) - 実行手順書
  - [Test Plan](./technical/database/migration/test-plan.md) - テスト計画書

### ⚙️ [Operations](./operations/) - 運用管理

#### [Setup](./operations/setup/) - 環境構築
- **[Environment](./operations/setup/environment.md)** - 開発環境セットアップ
- **[System](./operations/setup/system.md)** - システム全体構築ガイド
- **[Vercel](./operations/setup/vercel.md)** - Vercel環境変数設定
- **[Webhooks](./operations/setup/webhooks.md)** - Webhook設定ガイド

#### 運用・監視
- **[Cost Analysis](./operations/cost-analysis.md)** - 詳細運用コスト分析（3,000店舗実測）
- **[Monitoring](./operations/monitoring.md)** - 監視・アラート設定

### 📖 [Guides](./guides/) - 機能ガイド
- **[Reservation Flows](./guides/reservation-flows.md)** - 予約作成・決済フロー
- **[Point System](./guides/point-system.md)** - ポイントシステム実装

## 🗂️ ドキュメント管理ガイドライン

### 更新ルール
1. **技術変更時**: 関連するすべてのドキュメントを更新
2. **価格変更時**: business/product-overview.mdを更新、他は参照リンクで統一
3. **新機能追加時**: 該当する技術文書とユーザーマニュアルを更新
4. **移行・重複解消**: 2025年6月実施（この再編成）

### 命名規則
- **ディレクトリ**: 小文字、ハイフン区切り (business, technical)
- **ファイル**: 小文字、ハイフン区切り (product-overview.md)
- **内部リンク**: 相対パスを使用

### バージョン管理
- 各ドキュメントに「最終更新日」を記載
- 大きな変更時は「ドキュメントバージョン」を更新
- 統合時は元のドキュメント名を更新履歴に記載

## 📝 最近の更新（2025年6月）

### ✅ 完了した改善
- **📁 ドキュメント再編成**: 論理的な階層構造への整理
- **🔄 重複情報統合**: マイグレーション関連4ファイル → migration/配下に整理
- **💰 価格情報統一**: product-overview.mdに集約、他は参照リンク
- **⚡ 実装ガイド集約**: technical/implementation/配下に統一
- **🔧 セットアップ統合**: operations/setup/配下に整理

### 🎯 品質向上
- **実装との整合性**: 全ドキュメントの内容を最新実装と照合
- **情報の鮮度**: 古い情報を削除、最新状況を反映
- **ナビゲーション**: 階層構造による直感的なアクセス
- **検索性**: 論理的分類による情報発見の向上

## 🔗 関連リソース

- **メインREADME**: [/README.md](../README.md) - プロジェクト全体概要
- **CLAUDE.md**: [/CLAUDE.md](../CLAUDE.md) - AI開発ガイド
- **言語ファイル**: [/languages/](../languages/) - 翻訳リソース

## 📊 ドキュメント統計

- **総ドキュメント数**: 25ファイル
- **技術文書**: 15ファイル
- **ビジネス文書**: 3ファイル
- **運用ガイド**: 7ファイル
- **最終更新**: 2025年6月（全体再編成）

---

*このドキュメント構造は継続的に改善されます。新しい機能や変更に応じて適切にアップデートを行います。*