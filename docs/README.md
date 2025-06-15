# Bocker ドキュメント

このディレクトリには、Bockerプロジェクトの技術文書、仕様書、運用ガイドなどが含まれています。

## 📚 ドキュメント一覧

### 🔧 技術仕様

#### **[API_ENDPOINTS.md](./API_ENDPOINTS.md)**
- APIエンドポイントの完全なリファレンス
- 認証、決済、メール送信などの実装詳細
- リクエスト/レスポンスの例
- **最終更新**: 2025-06-15（bcryptjs対応）

#### **[CDN_IMPLEMENTATION.md](./CDN_IMPLEMENTATION.md)**
- GCP Cloud CDN実装ガイド（統合版）
- 画像配信の最適化とキャッシュ戦略
- OptimizedImageコンポーネントの使用方法
- **最終更新**: 2025-06-15（CDN_IMPLEMENTATION.mdとGCP-CDN.md統合）

#### **[I18N_IMPLEMENTATION.md](./I18N_IMPLEMENTATION.md)** 🆕
- 多言語対応（国際化）実装ガイド
- next-intlの設定と使用方法
- 実装進捗と今後の計画
- **作成日**: 2025-06-15

#### **[DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md)**
- デザインシステムとUIガイドライン
- カラーパレット、タイポグラフィ、スペーシング
- コンポーネントパターン

#### **[LINE_AUTH_FLOW_SPEC.md](./LINE_AUTH_FLOW_SPEC.md)**
- LINE認証フローの詳細仕様
- LIFFアプリケーションの実装
- セキュリティ考慮事項

#### **[MIGRATION.md](./MIGRATION.md)**
- ConvexからSupabaseへのデータ移行ガイド
- バッチ処理の実装方法
- **注意**: 本番環境では現在停止中

### 💼 ビジネス文書

#### **[PRODUCT.md](./PRODUCT.md)**
- 製品概要とビジネスモデル
- 料金プラン（Lite: ¥6,000/月、Pro: ¥10,000/月）
- 機能一覧と差別化ポイント
- **最終更新**: 2025-06-15（価格情報統一）

#### **[DOCUMENTS.md](./DOCUMENTS.md)**
- エンドユーザー向け操作マニュアル
- サロンオーナー・スタッフ向けガイド
- よくある質問（FAQ）
- **最終更新**: 2025-06-15（価格情報統一）

#### **[# Bcker 美容サロン向けSaaS市場調査分析レポート.ini](./# Bcker 美容サロン向けSaaS市場調査分析レポート.ini)**
- 市場分析と競合調査
- 成長戦略と収益予測
- ターゲット市場の詳細分析

### 📊 分析・コスト

#### **[FEAT.md](./FEAT.md)**
- スケーリング分析（3,000-30,000店舗）
- ボトルネック分析と対策
- インフラ拡張計画

#### **[PRODUCT_COST.md](./PRODUCT_COST.md)**
- 詳細な運用コスト分析
- 3,000店舗規模での実測データ
- コスト最適化戦略

### 🔧 実装計画

#### **[STAFF_INVITATION_METADATA_FIX.md](./STAFF_INVITATION_METADATA_FIX.md)**
- スタッフ招待システムの改善計画
- メタデータ不整合の修正方法
- **ステータス**: 未実装（計画段階）

## 🗂️ ドキュメント管理ガイドライン

### 更新ルール
1. **技術変更時**: 関連するすべてのドキュメントを更新
2. **価格変更時**: PRODUCT.md、DOCUMENTS.md、市場調査を同時更新
3. **新機能追加時**: 該当する技術文書とユーザーマニュアルを更新

### 命名規則
- **技術文書**: `{機能}_IMPLEMENTATION.md`、`{機能}_SPEC.md`
- **ビジネス文書**: 大文字で簡潔な名前
- **分析文書**: `{分析対象}_COST.md`、`{分析対象}.md`

### バージョン管理
- 各ドキュメントに「最終更新日」を記載
- 大きな変更時は「ドキュメントバージョン」を更新
- 統合時は元のドキュメント名を記載

## 📝 最近の更新

### 2025-06-15
- ✅ パスワードハッシュ方式をbcryptjsに統一（API_ENDPOINTS.md）
- ✅ 価格情報を統一（PRODUCT.md、DOCUMENTS.md）
- ✅ CDN関連ドキュメントを統合（CDN_IMPLEMENTATION.md）
- ✅ i18n実装ガイドを新規作成（I18N_IMPLEMENTATION.md）
- ✅ 本READMEを作成

### 今後の更新予定
- [ ] MIGRATION.mdの本番環境対応版作成
- [ ] STAFF_INVITATION_METADATA_FIX.mdの実装後更新
- [ ] API_ENDPOINTS.mdへのWebhook詳細追加

## 🔗 関連リソース

- **メインREADME**: [/README.md](../README.md)
- **CLAUDE.md**: [/CLAUDE.md](../CLAUDE.md) - AI開発ガイド
- **言語ファイル**: [/languages/](../languages/) - 翻訳リソース

---

*このドキュメントは定期的に更新されます。最新情報はGitコミット履歴を参照してください。*