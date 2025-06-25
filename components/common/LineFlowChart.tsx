export default function LineFlowChart() {
  return (
    <svg viewBox="0 0 1200 1400" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#06C755', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: '#00B04F', stopOpacity: 1 }} />
        </linearGradient>
        <linearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#FF6B6B', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: '#EE5A52', stopOpacity: 1 }} />
        </linearGradient>
        <linearGradient id="grad3" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#4ECDC4', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: '#44A08D', stopOpacity: 1 }} />
        </linearGradient>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="3" dy="3" stdDeviation="3" floodOpacity="0.3" />
        </filter>
      </defs>

      <text
        x="600"
        y="40"
        textAnchor="middle"
        fontFamily="Arial, sans-serif"
        fontSize="28"
        fontWeight="bold"
        fill="#333"
      >
        LINEログイン統合設定フロー
      </text>

      <rect
        x="50"
        y="80"
        width="300"
        height="120"
        rx="10"
        fill="url(#grad1)"
        filter="url(#shadow)"
      />
      <text
        x="200"
        y="110"
        textAnchor="middle"
        fontFamily="Arial, sans-serif"
        fontSize="16"
        fontWeight="bold"
        fill="white"
      >
        Step 1: LINE公式アカウント作成
      </text>
      <text
        x="200"
        y="130"
        textAnchor="middle"
        fontFamily="Arial, sans-serif"
        fontSize="12"
        fill="white"
      >
        LINE公式アカウントマネージャー
      </text>
      <text
        x="200"
        y="145"
        textAnchor="middle"
        fontFamily="Arial, sans-serif"
        fontSize="12"
        fill="white"
      >
        https://manager.line.biz/
      </text>
      <text
        x="200"
        y="165"
        textAnchor="middle"
        fontFamily="Arial, sans-serif"
        fontSize="11"
        fill="white"
      >
        アカウント名、業種を設定
      </text>
      <text
        x="200"
        y="180"
        textAnchor="middle"
        fontFamily="Arial, sans-serif"
        fontSize="11"
        fill="white"
      >
        Messaging APIを有効化
      </text>

      <path d="M 200 200 L 200 230" stroke="#333" strokeWidth="3" markerEnd="url(#arrowhead)" />

      <rect
        x="50"
        y="240"
        width="300"
        height="140"
        rx="10"
        fill="url(#grad2)"
        filter="url(#shadow)"
      />
      <text
        x="200"
        y="270"
        textAnchor="middle"
        fontFamily="Arial, sans-serif"
        fontSize="16"
        fontWeight="bold"
        fill="white"
      >
        Step 2: Messaging API
      </text>
      <text
        x="200"
        y="285"
        textAnchor="middle"
        fontFamily="Arial, sans-serif"
        fontSize="16"
        fontWeight="bold"
        fill="white"
      >
        チャンネル作成
      </text>
      <text
        x="200"
        y="305"
        textAnchor="middle"
        fontFamily="Arial, sans-serif"
        fontSize="12"
        fill="white"
      >
        LINE Developers Console
      </text>
      <text
        x="200"
        y="320"
        textAnchor="middle"
        fontFamily="Arial, sans-serif"
        fontSize="12"
        fill="white"
      >
        https://developers.line.biz/
      </text>
      <text
        x="200"
        y="340"
        textAnchor="middle"
        fontFamily="Arial, sans-serif"
        fontSize="11"
        fill="white"
      >
        プロバイダー → チャンネル作成
      </text>
      <text
        x="200"
        y="355"
        textAnchor="middle"
        fontFamily="Arial, sans-serif"
        fontSize="11"
        fill="white"
      >
        「Messaging API」を選択
      </text>

      <path d="M 200 380 L 200 410" stroke="#333" strokeWidth="3" markerEnd="url(#arrowhead)" />

      <rect
        x="50"
        y="420"
        width="300"
        height="140"
        rx="10"
        fill="url(#grad3)"
        filter="url(#shadow)"
      />
      <text
        x="200"
        y="450"
        textAnchor="middle"
        fontFamily="Arial, sans-serif"
        fontSize="16"
        fontWeight="bold"
        fill="white"
      >
        Step 3: LINEログイン
      </text>
      <text
        x="200"
        y="465"
        textAnchor="middle"
        fontFamily="Arial, sans-serif"
        fontSize="16"
        fontWeight="bold"
        fill="white"
      >
        チャンネル作成
      </text>
      <text
        x="200"
        y="485"
        textAnchor="middle"
        fontFamily="Arial, sans-serif"
        fontSize="12"
        fill="white"
      >
        同じプロバイダー内で作成
      </text>
      <text
        x="200"
        y="505"
        textAnchor="middle"
        fontFamily="Arial, sans-serif"
        fontSize="11"
        fill="white"
      >
        チャンネル作成 → LINEログイン
      </text>
      <text
        x="200"
        y="520"
        textAnchor="middle"
        fontFamily="Arial, sans-serif"
        fontSize="11"
        fill="white"
      >
        アプリタイプ: ウェブアプリ
      </text>
      <text
        x="200"
        y="535"
        textAnchor="middle"
        fontFamily="Arial, sans-serif"
        fontSize="11"
        fill="white"
      >
        コールバックURL設定
      </text>

      <path d="M 200 560 L 200 590" stroke="#333" strokeWidth="3" markerEnd="url(#arrowhead)" />

      <rect x="50" y="600" width="300" height="120" rx="10" fill="#9B59B6" filter="url(#shadow)" />
      <text
        x="200"
        y="630"
        textAnchor="middle"
        fontFamily="Arial, sans-serif"
        fontSize="16"
        fontWeight="bold"
        fill="white"
      >
        Step 4: LIFFアプリ作成
      </text>
      <text
        x="200"
        y="650"
        textAnchor="middle"
        fontFamily="Arial, sans-serif"
        fontSize="12"
        fill="white"
      >
        LINEログインチャンネル内
      </text>
      <text
        x="200"
        y="670"
        textAnchor="middle"
        fontFamily="Arial, sans-serif"
        fontSize="11"
        fill="white"
      >
        サイズ: Full推奨
      </text>
      <text
        x="200"
        y="685"
        textAnchor="middle"
        fontFamily="Arial, sans-serif"
        fontSize="11"
        fill="white"
      >
        エンドポイントURL設定
      </text>
      <text
        x="200"
        y="700"
        textAnchor="middle"
        fontFamily="Arial, sans-serif"
        fontSize="11"
        fill="white"
      >
        スコープ: profile, openid
      </text>

      <text
        x="600"
        y="120"
        textAnchor="middle"
        fontFamily="Arial, sans-serif"
        fontSize="20"
        fontWeight="bold"
        fill="#333"
      >
        必要な設定値
      </text>

      <rect
        x="450"
        y="160"
        width="300"
        height="180"
        rx="10"
        fill="#FFE5E5"
        stroke="#FF6B6B"
        strokeWidth="2"
        filter="url(#shadow)"
      />
      <text
        x="600"
        y="185"
        textAnchor="middle"
        fontFamily="Arial, sans-serif"
        fontSize="16"
        fontWeight="bold"
        fill="#333"
      >
        Messaging APIチャンネルから
      </text>

      <rect x="470" y="200" width="260" height="35" rx="5" fill="#FF6B6B" />
      <text
        x="600"
        y="215"
        textAnchor="middle"
        fontFamily="Arial, sans-serif"
        fontSize="12"
        fontWeight="bold"
        fill="white"
      >
        LINE アクセストークン
      </text>
      <text
        x="600"
        y="228"
        textAnchor="middle"
        fontFamily="Arial, sans-serif"
        fontSize="10"
        fill="white"
      >
        Messaging API → チャンネルアクセストークン
      </text>

      <rect x="470" y="245" width="260" height="35" rx="5" fill="#FF6B6B" />
      <text
        x="600"
        y="260"
        textAnchor="middle"
        fontFamily="Arial, sans-serif"
        fontSize="12"
        fontWeight="bold"
        fill="white"
      >
        LINE チャンネルシークレット
      </text>
      <text
        x="600"
        y="273"
        textAnchor="middle"
        fontFamily="Arial, sans-serif"
        fontSize="10"
        fill="white"
      >
        基本設定 → チャンネルシークレット
      </text>

      <text
        x="600"
        y="310"
        textAnchor="middle"
        fontFamily="Arial, sans-serif"
        fontSize="11"
        fill="#666"
      >
        用途: メッセージ送信、Webhook署名検証
      </text>

      <rect
        x="450"
        y="360"
        width="300"
        height="180"
        rx="10"
        fill="#E5F9F6"
        stroke="#4ECDC4"
        strokeWidth="2"
        filter="url(#shadow)"
      />
      <text
        x="600"
        y="385"
        textAnchor="middle"
        fontFamily="Arial, sans-serif"
        fontSize="16"
        fontWeight="bold"
        fill="#333"
      >
        LINEログインチャンネルから
      </text>

      <rect x="470" y="400" width="260" height="35" rx="5" fill="#4ECDC4" />
      <text
        x="600"
        y="415"
        textAnchor="middle"
        fontFamily="Arial, sans-serif"
        fontSize="12"
        fontWeight="bold"
        fill="white"
      >
        LINE チャンネルID
      </text>
      <text
        x="600"
        y="428"
        textAnchor="middle"
        fontFamily="Arial, sans-serif"
        fontSize="10"
        fill="white"
      >
        基本設定 → チャンネルID（数字のみ）
      </text>

      <rect x="470" y="445" width="260" height="35" rx="5" fill="#4ECDC4" />
      <text
        x="600"
        y="460"
        textAnchor="middle"
        fontFamily="Arial, sans-serif"
        fontSize="12"
        fontWeight="bold"
        fill="white"
      >
        LIFF ID
      </text>
      <text
        x="600"
        y="473"
        textAnchor="middle"
        fontFamily="Arial, sans-serif"
        fontSize="10"
        fill="white"
      >
        LIFF → 作成したアプリのLIFF ID
      </text>

      <text
        x="600"
        y="510"
        textAnchor="middle"
        fontFamily="Arial, sans-serif"
        fontSize="11"
        fill="#666"
      >
        用途: ユーザーログイン、LIFF画面表示
      </text>

      <text
        x="600"
        y="580"
        textAnchor="middle"
        fontFamily="Arial, sans-serif"
        fontSize="18"
        fontWeight="bold"
        fill="#333"
      >
        設定完了後の連携
      </text>

      <rect
        x="450"
        y="600"
        width="300"
        height="120"
        rx="10"
        fill="#F0F8E8"
        stroke="#06C755"
        strokeWidth="2"
        filter="url(#shadow)"
      />
      <text
        x="600"
        y="625"
        textAnchor="middle"
        fontFamily="Arial, sans-serif"
        fontSize="14"
        fontWeight="bold"
        fill="#333"
      >
        チャンネル間連携
      </text>
      <text
        x="600"
        y="645"
        textAnchor="middle"
        fontFamily="Arial, sans-serif"
        fontSize="11"
        fill="#666"
      >
        LINEログイン設定 → リンクされたボット
      </text>
      <text
        x="600"
        y="660"
        textAnchor="middle"
        fontFamily="Arial, sans-serif"
        fontSize="11"
        fill="#666"
      >
        Messaging APIチャンネルを選択
      </text>
      <text
        x="600"
        y="680"
        textAnchor="middle"
        fontFamily="Arial, sans-serif"
        fontSize="11"
        fill="#666"
      >
        ログインユーザーへのメッセージ送信が可能
      </text>
      <text
        x="600"
        y="695"
        textAnchor="middle"
        fontFamily="Arial, sans-serif"
        fontSize="11"
        fill="#666"
      >
        友だち追加オプション設定
      </text>

      <rect
        x="850"
        y="160"
        width="300"
        height="360"
        rx="10"
        fill="#FFF3CD"
        stroke="#FFC107"
        strokeWidth="2"
        filter="url(#shadow)"
      />
      <text
        x="1000"
        y="185"
        textAnchor="middle"
        fontFamily="Arial, sans-serif"
        fontSize="16"
        fontWeight="bold"
        fill="#333"
      >
        ⚠️ 重要ポイント
      </text>

      <text
        x="870"
        y="210"
        fontFamily="Arial, sans-serif"
        fontSize="12"
        fontWeight="bold"
        fill="#333"
      >
        1. 作成順序を守る
      </text>
      <text x="870" y="225" fontFamily="Arial, sans-serif" fontSize="10" fill="#666">
        公式アカウント → Messaging API → LINEログイン
      </text>

      <text
        x="870"
        y="250"
        fontFamily="Arial, sans-serif"
        fontSize="12"
        fontWeight="bold"
        fill="#333"
      >
        2. 同じLINEアカウントを使用
      </text>
      <text x="870" y="265" fontFamily="Arial, sans-serif" fontSize="10" fill="#666">
        全ての設定で同一アカウントでログイン
      </text>

      <text
        x="870"
        y="290"
        fontFamily="Arial, sans-serif"
        fontSize="12"
        fontWeight="bold"
        fill="#333"
      >
        3. プロバイダーを統一
      </text>
      <text x="870" y="305" fontFamily="Arial, sans-serif" fontSize="10" fill="#666">
        両チャンネルを同じプロバイダー内に作成
      </text>

      <text
        x="870"
        y="330"
        fontFamily="Arial, sans-serif"
        fontSize="12"
        fontWeight="bold"
        fill="#333"
      >
        4. セキュリティ設定
      </text>
      <text x="870" y="345" fontFamily="Arial, sans-serif" fontSize="10" fill="#666">
        コールバックURL、リンク設定を正確に
      </text>

      <text
        x="870"
        y="370"
        fontFamily="Arial, sans-serif"
        fontSize="12"
        fontWeight="bold"
        fill="#333"
      >
        5. 値の取得先を間違えない
      </text>
      <text x="870" y="385" fontFamily="Arial, sans-serif" fontSize="10" fill="#666">
        Messaging API ≠ LINEログイン
      </text>

      <text
        x="870"
        y="410"
        fontFamily="Arial, sans-serif"
        fontSize="12"
        fontWeight="bold"
        fill="#333"
      >
        6. 2024年9月以降の変更
      </text>
      <text x="870" y="425" fontFamily="Arial, sans-serif" fontSize="10" fill="#666">
        必ず公式アカウント作成が必要
      </text>

      <text
        x="870"
        y="450"
        fontFamily="Arial, sans-serif"
        fontSize="12"
        fontWeight="bold"
        fill="#333"
      >
        7. LINEログイン有効化
      </text>
      <text x="870" y="465" fontFamily="Arial, sans-serif" fontSize="10" fill="#666">
        開発中 → 公開に変更
      </text>

      <text
        x="870"
        y="490"
        fontFamily="Arial, sans-serif"
        fontSize="12"
        fontWeight="bold"
        fill="#333"
      >
        8. 公式アカウント紐付け
      </text>
      <text x="870" y="505" fontFamily="Arial, sans-serif" fontSize="10" fill="#666">
        基本設定でリンクされた公式アカウント設定
      </text>

      <rect
        x="50"
        y="750"
        width="1100"
        height="200"
        rx="10"
        fill="#FFE5E5"
        stroke="#DC3545"
        strokeWidth="2"
        filter="url(#shadow)"
      />
      <text
        x="600"
        y="775"
        textAnchor="middle"
        fontFamily="Arial, sans-serif"
        fontSize="16"
        fontWeight="bold"
        fill="#333"
      >
        🚨 よくある問題と解決法
      </text>

      <text
        x="70"
        y="800"
        fontFamily="Arial, sans-serif"
        fontSize="12"
        fontWeight="bold"
        fill="#DC3545"
      >
        チャンネルが見つからない
      </text>
      <text x="70" y="815" fontFamily="Arial, sans-serif" fontSize="10" fill="#666">
        → 公式アカウントマネージャーと同じLINEアカウントでログイン確認
      </text>

      <text
        x="400"
        y="800"
        fontFamily="Arial, sans-serif"
        fontSize="12"
        fontWeight="bold"
        fill="#DC3545"
      >
        Messaging APIが有効化できない
      </text>
      <text x="400" y="815" fontFamily="Arial, sans-serif" fontSize="10" fill="#666">
        → 公式アカウントで業種・事業者情報が正しく入力されているか確認
      </text>

      <text
        x="750"
        y="800"
        fontFamily="Arial, sans-serif"
        fontSize="12"
        fontWeight="bold"
        fill="#DC3545"
      >
        Token verification failed
      </text>
      <text x="750" y="815" fontFamily="Arial, sans-serif" fontSize="10" fill="#666">
        → LINEログインチャンネルのChannel IDを正しく設定しているか確認
      </text>

      <text
        x="70"
        y="840"
        fontFamily="Arial, sans-serif"
        fontSize="12"
        fontWeight="bold"
        fill="#DC3545"
      >
        プロバイダーが作成できない
      </text>
      <text x="70" y="855" fontFamily="Arial, sans-serif" fontSize="10" fill="#666">
        → LINEアカウントの本人確認が完了しているか確認
      </text>

      <text
        x="400"
        y="840"
        fontFamily="Arial, sans-serif"
        fontSize="12"
        fontWeight="bold"
        fill="#DC3545"
      >
        ログインエラーが発生
      </text>
      <text x="400" y="855" fontFamily="Arial, sans-serif" fontSize="10" fill="#666">
        → Messaging APIのChannel IDを間違って設定していないか確認
      </text>

      <text
        x="750"
        y="840"
        fontFamily="Arial, sans-serif"
        fontSize="12"
        fontWeight="bold"
        fill="#DC3545"
      >
        メッセージが送信できない
      </text>
      <text x="750" y="855" fontFamily="Arial, sans-serif" fontSize="10" fill="#666">
        → Webhook URLが正しく設定されているか確認
      </text>

      <text
        x="70"
        y="880"
        fontFamily="Arial, sans-serif"
        fontSize="12"
        fontWeight="bold"
        fill="#DC3545"
      >
        LIFFアプリが表示されない
      </text>
      <text x="70" y="895" fontFamily="Arial, sans-serif" fontSize="10" fill="#666">
        → エンドポイントURL、スコープ設定を確認
      </text>

      <text
        x="400"
        y="880"
        fontFamily="Arial, sans-serif"
        fontSize="12"
        fontWeight="bold"
        fill="#DC3545"
      >
        友だち追加されない
      </text>
      <text x="400" y="895" fontFamily="Arial, sans-serif" fontSize="10" fill="#666">
        → 友だち追加オプション設定とチャンネル連携を確認
      </text>

      <text
        x="750"
        y="880"
        fontFamily="Arial, sans-serif"
        fontSize="12"
        fontWeight="bold"
        fill="#DC3545"
      >
        設定値の混同
      </text>
      <text x="750" y="895" fontFamily="Arial, sans-serif" fontSize="10" fill="#666">
        → Messaging API用とLINEログイン用の値を正しく区別
      </text>

      <rect
        x="50"
        y="980"
        width="1100"
        height="160"
        rx="10"
        fill="#E8F5E8"
        stroke="#28A745"
        strokeWidth="2"
        filter="url(#shadow)"
      />
      <text
        x="600"
        y="1005"
        textAnchor="middle"
        fontFamily="Arial, sans-serif"
        fontSize="16"
        fontWeight="bold"
        fill="#333"
      >
        ✅ 設定完了チェックリスト
      </text>

      <text x="70" y="1030" fontFamily="Arial, sans-serif" fontSize="12" fill="#333">
        □ LINE公式アカウントマネージャーで公式アカウント作成済み
      </text>
      <text x="70" y="1050" fontFamily="Arial, sans-serif" fontSize="12" fill="#333">
        □ Messaging APIチャンネル作成済み
      </text>
      <text x="70" y="1070" fontFamily="Arial, sans-serif" fontSize="12" fill="#333">
        □ LINEログインチャンネル作成済み
      </text>
      <text x="70" y="1090" fontFamily="Arial, sans-serif" fontSize="12" fill="#333">
        □ LIFFアプリ作成済み
      </text>

      <text x="450" y="1030" fontFamily="Arial, sans-serif" fontSize="12" fill="#333">
        □ コールバックURL設定済み
      </text>
      <text x="450" y="1050" fontFamily="Arial, sans-serif" fontSize="12" fill="#333">
        □ チャンネル間のリンク設定済み
      </text>
      <text x="450" y="1070" fontFamily="Arial, sans-serif" fontSize="12" fill="#333">
        □ LINEログイン有効化済み
      </text>
      <text x="450" y="1090" fontFamily="Arial, sans-serif" fontSize="12" fill="#333">
        □ 公式アカウント紐付け済み
      </text>

      <text x="750" y="1030" fontFamily="Arial, sans-serif" fontSize="12" fill="#333">
        □ 4つの設定値を正しく取得済み
      </text>
      <text x="750" y="1050" fontFamily="Arial, sans-serif" fontSize="12" fill="#333">
        □ アクセストークン（Messaging API）
      </text>
      <text x="750" y="1070" fontFamily="Arial, sans-serif" fontSize="12" fill="#333">
        □ チャンネルシークレット（Messaging API）
      </text>
      <text x="750" y="1090" fontFamily="Arial, sans-serif" fontSize="12" fill="#333">
        □ チャンネルID・LIFF ID（LINEログイン）
      </text>

      <rect
        x="350"
        y="1180"
        width="500"
        height="80"
        rx="10"
        fill="url(#grad1)"
        filter="url(#shadow)"
      />
      <text
        x="600"
        y="1205"
        textAnchor="middle"
        fontFamily="Arial, sans-serif"
        fontSize="16"
        fontWeight="bold"
        fill="white"
      >
        🎯 次のステップ
      </text>
      <text
        x="600"
        y="1225"
        textAnchor="middle"
        fontFamily="Arial, sans-serif"
        fontSize="12"
        fill="white"
      >
        取得した4つの設定値をBockerの設定フォームに入力
      </text>
      <text
        x="600"
        y="1240"
        textAnchor="middle"
        fontFamily="Arial, sans-serif"
        fontSize="12"
        fill="white"
      >
        → LINE統合による予約システムの利用開始
      </text>

      <defs>
        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="#333" />
        </marker>
      </defs>

      <path
        d="M 350 280 L 450 280"
        stroke="#FF6B6B"
        strokeWidth="2"
        strokeDasharray="5,5"
        markerEnd="url(#arrowhead)"
      />
      <path
        d="M 350 480 L 450 450"
        stroke="#4ECDC4"
        strokeWidth="2"
        strokeDasharray="5,5"
        markerEnd="url(#arrowhead)"
      />
    </svg>
  )
}
