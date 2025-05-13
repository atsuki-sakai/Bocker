export const STRIPE_API_VERSION = '2025-02-24.acacia';

export const SALON_SCHEDULE_HOURS = [
  '00:00',
  '01:00',
  '02:00',
  '03:00',
  '04:00',
  '05:00',
  '06:00',
  '07:00',
  '08:00',
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '15:00',
  '16:00',
  '17:00',
  '18:00',
  '19:00',
  '20:00',
  '21:00',
  '22:00',
  '23:00',
];
export const SALON_RESERVATION_CANCEL_LIMIT_DAYS = [
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
  '11',
  '12',
  '13',
  '14',
  '15',
  '16',
  '17',
  '18',
  '19',
  '20',
  '21',
  '22',
  '23',
  '24',
  '25',
  '26',
  '27',
  '28',
  '29',
  '30',
];
export const SALON_RESERVATION_LIMIT_DAYS = [
  '30',
  '60',
  '90',
  '120',
  '150',
  '180',
  '210',
  '240',
  '270',
  '300',
  '330',
  '360',
];


// Monthly and Yearly prices extracted or inferred from the HTML content
// HTMLには月額料金のみ記載があるため、YEARLY_PRICESはnullとしています。
export const MONTHLY_PRICES = {
  LITE: 5980,
  PRO: 9980,
  // ENTERPRISE: Not available in the provided HTML
};

export const YEARLY_PRICES = {
  LITE: null, // 年額料金はHTMLに記載なし
  PRO: null, // 年額料金はHTMLに記載なし
  // ENTERPRISE: Not available in the provided HTML
}

// Stripe Subscription Plans based on the provided HTML content
export const SUBSCRIPTION_PLANS = {
  LITE: {
    id: 'lite',
    name: 'Lite', // HTMLの表示は'LITE'ですが、例の形式に合わせて'Lite'とします
    features: [
      '予約カレンダー基本機能',
      '最大3名までのスタッフ管理',
      '基本的なお客様情報管理',
      '予約管理 (予約カレンダー, スタッフスケジュール設定, 予約確認・変更・キャンセル, 24/365オンライン予約)',
      '顧客管理（基本情報, 予約・購入履歴）',
      'スタッフ管理 (アカウント作成, 基本的な予約・シフト管理)',
      'メニュー設定 (サービス登録, 料金・所要時間設定)',
      '自動リマインド・通知 (メール・SMS)',
      'スタッフ数(3名)、メニュー数(15件)、予約数(100件/月)が無制限', // HTMLの記述通りに含めます
    ],
    monthly: {
      priceId: process.env.NEXT_PUBLIC_LITE_MONTHLY_PRC_ID!,
      price: MONTHLY_PRICES.LITE,
    },
    yearly: {
      priceId: process.env.NEXT_PUBLIC_LITE_YEARLY_PRC_ID!,
      price: YEARLY_PRICES.LITE, // HTMLに年額料金の記載がないためnull
      savingPercent: null, // HTMLに割引率の記載がないためnull (例では17でしたが、根拠がないためnullとします)
    },
  },
  PRO: {
    id: 'pro',
    name: 'Pro', // HTMLの表示は'PRO'ですが、例の形式に合わせて'Pro'とします
    features: [
      'LITEプランの全機能',
      'カルテ管理 (施術内容の詳細記録, 画像添付機能, 薬剤使用履歴管理, カルテテンプレート機能, 施術者引継ぎ機能)',
      'ポイント・クーポン機能 (カスタマイズ可能なポイント付与システム, クーポン管理)',
      'スタッフ数、メニュー数、予約数が無制限',
    ],
    monthly: {
      priceId: process.env.NEXT_PUBLIC_PRO_MONTHLY_PRC_ID!,
      price: MONTHLY_PRICES.PRO,
    },
    yearly: {
      priceId: process.env.NEXT_PUBLIC_PRO_YEARLY_PRC_ID!,
      price: YEARLY_PRICES.PRO, // HTMLに年額料金の記載がないためnull
      savingPercent: null, // HTMLに割引率の記載がないためnull (例では17でしたが、根拠がないためnullとします)
    },
  },
  // ENTERPRISEプランに関する情報は提供されたHTML内には見当たらなかったため、ここでは含めていません。
  // もしENTERPRISEプランの情報もHTMLに別途記載がある場合は、同様の形式で追加できます。
}

// Staff Auth
// Cookieの名前
export const STAFF_TOKEN_COOKIE = 'bcker_staff_token';
// Cookieの有効期限（日数）
export const COOKIE_EXPIRES_DAYS = 7;
// クライアントサイドでのローカルストレージのキー
export const STAFF_TOKEN_STORAGE_KEY = 'bcker_staff_auth_token';

// UI
export const POINT_EXPIRATION_DAYS = [
  { value: 365, label: '1年' },
  { value: 730, label: '2年' },
  { value: 1095, label: '3年' },
  { value: 1460, label: '4年' },
  { value: 1825, label: '5年' },
];
