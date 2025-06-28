スタッフの設定、機能の詳細な操作説明書を@docs/guideフォルダに作成してください。活用方法や設定時の想定されるミスや間違い、認識を正しく伝えるなど、ユーザーに寄り添ったマニュアルを作成してください。

1. 機能概要
- この機能が何をするか
- 対象ユーザーと用途

2. 画面構成と導線
- 機能の画面一覧
- 各画面の役割と導入経路（メニュー → 遷移先）

3. 操作手順(機能に合わせて詳細に記述してください)
3-1. 新規作成手順
3-2. 編集・更新手順
3-3. 検索・フィルターの使い方
3-4. 削除・非表示方法

4. 典型的な利用シナリオの例
- A: 顧客が来店 → ポイント加算 → 確認 → 保存
- B: カルテの作成 → 編集 → 閲覧

5. エラー・注意事項
- よくあるエラーと対処法
- 操作時の注意点（例：保存しないと消えるなど）

6. FAQ・補足
- よくある質問
- 補足情報（例：設定変更方法、担当者連絡先）


7. スタッフ登録やログインなど様々な機能の設定の流れや機能を調査するためのファイル、フォルダは以下で深く機能を理解してください。
@convex/staff/  @app/api/clerk/staff/  @app/[locale]/(auth)/staff/  @app/[locale]/(dashboard)/dashboard/staff/  @lib/staff-invitation-utils.ts                       │
│   @app/[locale]/(dashboard)/dashboard/staff-schedule/  @app/[locale]/(dashboard)/dashboard/staff/[staff_id]/StaffDetails.tsx                                           │
│   @app/[locale]/(dashboard)/dashboard/staff/[staff_id]/edit/StaffEditForm.tsx  @hooks/useStaffRoleUpdate.ts                                                            │
│   @app/[locale]/(reservation)/reservation/[id]/calendar/_components/StaffView.tsx  @convex/menu/menu_exclusion_staff/                                                  │
│   @app/[locale]/(dashboard)/dashboard/staff/[staff_id]/   