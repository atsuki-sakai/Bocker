# 指名フリー予約 実装フロー図

## 顧客側予約フロー

```mermaid
graph TD
    A[予約開始] --> B[StaffView: スタッフ選択画面]
    B --> C{選択タイプ}
    C -->|特定スタッフ選択| D[通常フロー]
    C -->|指名フリー選択| E[selectedStaff = 'free']
    
    E --> F[DateView: 日時選択画面]
    F --> G[calculateIntegratedAvailableTimes呼び出し]
    G --> H[全スタッフの空き時間を統合]
    H --> I[時間帯ごとの利用可能スタッフリスト表示]
    
    I --> J[顧客が日時選択]
    J --> K[ConfirmView: 確認画面]
    K --> L[指名料: 0円表示]
    L --> M[予約確定]
    
    M --> N[createReservation実行]
    N --> O[is_free_nomination: true で予約作成]
    O --> P[assignStaffForFreeNomination実行]
    P --> Q[優先度順にスタッフソート]
    Q --> R[最適スタッフを自動割り当て]
    R --> S[予約完了]
```

## 管理画面フロー

```mermaid
graph TD
    A[予約詳細画面] --> B{is_free_nomination?}
    B -->|true| C[指名フリー表示]
    B -->|false| D[通常予約表示]
    
    C --> E[割り当てスタッフ表示]
    E --> F[スタッフ変更ボタン表示]
    
    F --> G{ステータス確認}
    G -->|完了/キャンセル/返金| H[ボタン無効化]
    G -->|その他| I[ボタン有効]
    
    I --> J[スタッフ変更モーダル]
    J --> K[利用可能スタッフ一覧]
    K --> L[新スタッフ選択]
    L --> M[changeStaffForFreeNomination実行]
    M --> N[空き状況確認]
    N --> O{空きあり?}
    O -->|はい| P[スタッフ変更実行]
    O -->|いいえ| Q[エラー表示]
    
    P --> R[変更履歴記録]
    R --> S[画面更新]
```

## データフロー

```mermaid
graph LR
    subgraph "顧客側UI"
        A1[StaffView]
        A2[DateView]
        A3[ConfirmView]
    end
    
    subgraph "状態管理"
        B1[selectedStaff: 'free']
        B2[availableTimeSlots]
        B3[extra_charge: 0]
    end
    
    subgraph "Convex関数"
        C1[calculateIntegratedAvailableTimes]
        C2[createReservation]
        C3[assignStaffForFreeNomination]
        C4[changeStaffForFreeNomination]
    end
    
    subgraph "データベース"
        D1[reservation table]
        D2[staff table]
        D3[staff_config table]
    end
    
    A1 --> B1
    B1 --> A2
    A2 --> C1
    C1 --> D2
    C1 --> D3
    C1 --> B2
    B2 --> A3
    A3 --> C2
    C2 --> D1
    C2 --> C3
    C3 --> D2
    C3 --> D1
```

## スタッフ自動割り当てアルゴリズム

```
1. 入力：予約時間帯（start_time, end_time）
2. 処理：
   a. 該当時間帯で利用可能なスタッフを取得
   b. メニュー除外スタッフを除外
   c. 既存予約との重複チェック
   d. 利用可能スタッフを優先度（priority）でソート
   e. 最も優先度の高いスタッフを選択
3. 出力：割り当てスタッフ情報
```

## エラーハンドリング

```mermaid
graph TD
    A[エラー発生] --> B{エラータイプ}
    B -->|利用可能スタッフなし| C[NO_AVAILABLE_STAFF]
    B -->|時間帯重複| D[DOUBLE_BOOKING]
    B -->|権限なし| E[UNAUTHORIZED]
    B -->|データ不整合| F[DATA_INCONSISTENCY]
    
    C --> G[顧客へエラー表示]
    D --> H[OCCによる自動再試行]
    E --> I[アクセス拒否]
    F --> J[管理者へ通知]
```

## パフォーマンス最適化のポイント

1. **並列処理**
   - メニュー・オプション情報の並列取得
   - スタッフ設定の一括取得

2. **キャッシュ活用**
   - スタッフ基本情報のキャッシュ
   - 営業時間設定のキャッシュ

3. **インデックス最適化**
   - by_tenant_org_staff_date_status_archive
   - by_tenant_org_date_status_archive

4. **Map構造の活用**
   - O(n²) → O(n)への計算量削減