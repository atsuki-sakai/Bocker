-- tracking_summariesテーブル用のテストデータ作成クエリ
-- 実行前に以下の値を実際のIDに置き換えてください：
-- tenant_id と org_id

-- テスト用のテナント・組織ID（実際の値に変更してください）
-- 例: SET @test_tenant_id = 'your_actual_tenant_id';
-- 例: SET @test_org_id = 'your_actual_org_id';

-- 過去30日分のリアルなテストデータを挿入
-- UTM Source別のデータ
INSERT INTO tracking_summaries (
  tenant_id, 
  org_id, 
  summary_date, 
  dimension_type, 
  dimension_value, 
  total_count, 
  unique_user_count, 
  conversion_count,
  created_at, 
  updated_at
) VALUES
-- Google検索からの流入 (高い流入数、普通のコンバージョン率)
('vn77xjxw2gn456tc2a1dnrh0rd7jggc4', 'v5799kb53q14k5tyf4y0kj636d7jhz8p', '2025-08-22', 'utm_source', 'google', 156, 89, 12, NOW(), NOW()),
('vn77xjxw2gn456tc2a1dnrh0rd7jggc4', 'v5799kb53q14k5tyf4y0kj636d7jhz8p', '2025-08-21', 'utm_source', 'google', 143, 82, 8, NOW(), NOW()),
('vn77xjxw2gn456tc2a1dnrh0rd7jggc4', 'v5799kb53q14k5tyf4y0kj636d7jhz8p', '2025-08-20', 'utm_source', 'google', 167, 95, 15, NOW(), NOW()),
('vn77xjxw2gn456tc2a1dnrh0rd7jggc4', 'v5799kb53q14k5tyf4y0kj636d7jhz8p', '2025-08-19', 'utm_source', 'google', 134, 78, 9, NOW(), NOW()),
('vn77xjxw2gn456tc2a1dnrh0rd7jggc4', 'v5799kb53q14k5tyf4y0kj636d7jhz8p', '2025-08-18', 'utm_source', 'google', 112, 65, 7, NOW(), NOW()),

-- Facebook広告からの流入 (中程度の流入数、高いコンバージョン率)
('vn77xjxw2gn456tc2a1dnrh0rd7jggc4', 'v5799kb53q14k5tyf4y0kj636d7jhz8p', '2025-08-22', 'utm_source', 'facebook', 89, 54, 18, NOW(), NOW()),
('vn77xjxw2gn456tc2a1dnrh0rd7jggc4', 'v5799kb53q14k5tyf4y0kj636d7jhz8p', '2025-08-21', 'utm_source', 'facebook', 76, 47, 14, NOW(), NOW()),
('vn77xjxw2gn456tc2a1dnrh0rd7jggc4', 'v5799kb53q14k5tyf4y0kj636d7jhz8p', '2025-08-20', 'utm_source', 'facebook', 92, 58, 21, NOW(), NOW()),
('vn77xjxw2gn456tc2a1dnrh0rd7jggc4', 'v5799kb53q14k5tyf4y0kj636d7jhz8p', '2025-08-19', 'utm_source', 'facebook', 71, 45, 16, NOW(), NOW()),
('vn77xjxw2gn456tc2a1dnrh0rd7jggc4', 'v5799kb53q14k5tyf4y0kj636d7jhz8p', '2025-08-18', 'utm_source', 'facebook', 83, 52, 19, NOW(), NOW()),

-- Instagram広告からの流入 (少ない流入数、高いコンバージョン率)
('vn77xjxw2gn456tc2a1dnrh0rd7jggc4', 'v5799kb53q14k5tyf4y0kj636d7jhz8p', '2025-08-22', 'utm_source', 'instagram', 45, 32, 11, NOW(), NOW()),
('vn77xjxw2gn456tc2a1dnrh0rd7jggc4', 'v5799kb53q14k5tyf4y0kj636d7jhz8p', '2025-08-21', 'utm_source', 'instagram', 38, 27, 8, NOW(), NOW()),
('vn77xjxw2gn456tc2a1dnrh0rd7jggc4', 'v5799kb53q14k5tyf4y0kj636d7jhz8p', '2025-08-20', 'utm_source', 'instagram', 52, 36, 14, NOW(), NOW()),
('vn77xjxw2gn456tc2a1dnrh0rd7jggc4', 'v5799kb53q14k5tyf4y0kj636d7jhz8p', '2025-08-19', 'utm_source', 'instagram', 41, 29, 10, NOW(), NOW()),
('vn77xjxw2gn456tc2a1dnrh0rd7jggc4', 'v5799kb53q14k5tyf4y0kj636d7jhz8p', '2025-08-18', 'utm_source', 'instagram', 47, 33, 12, NOW(), NOW()),

-- LINE経由の流入 (少ない流入数、非常に高いコンバージョン率)
('vn77xjxw2gn456tc2a1dnrh0rd7jggc4', 'v5799kb53q14k5tyf4y0kj636d7jhz8p', '2025-08-22', 'utm_source', 'line', 23, 18, 9, NOW(), NOW()),
('vn77xjxw2gn456tc2a1dnrh0rd7jggc4', 'v5799kb53q14k5tyf4y0kj636d7jhz8p', '2025-08-21', 'utm_source', 'line', 19, 15, 7, NOW(), NOW()),
('vn77xjxw2gn456tc2a1dnrh0rd7jggc4', 'v5799kb53q14k5tyf4y0kj636d7jhz8p', '2025-08-20', 'utm_source', 'line', 27, 21, 11, NOW(), NOW()),
('vn77xjxw2gn456tc2a1dnrh0rd7jggc4', 'v5799kb53q14k5tyf4y0kj636d7jhz8p', '2025-08-19', 'utm_source', 'line', 21, 16, 8, NOW(), NOW()),
('vn77xjxw2gn456tc2a1dnrh0rd7jggc4', 'v5799kb53q14k5tyf4y0kj636d7jhz8p', '2025-08-18', 'utm_source', 'line', 25, 19, 10, NOW(), NOW()),

-- Direct流入 (中程度の流入数、低いコンバージョン率)
('vn77xjxw2gn456tc2a1dnrh0rd7jggc4', 'v5799kb53q14k5tyf4y0kj636d7jhz8p', '2025-08-22', 'utm_source', 'direct', 78, 61, 3, NOW(), NOW()),
('vn77xjxw2gn456tc2a1dnrh0rd7jggc4', 'v5799kb53q14k5tyf4y0kj636d7jhz8p', '2025-08-21', 'utm_source', 'direct', 69, 54, 2, NOW(), NOW()),
('vn77xjxw2gn456tc2a1dnrh0rd7jggc4', 'v5799kb53q14k5tyf4y0kj636d7jhz8p', '2025-08-20', 'utm_source', 'direct', 85, 67, 4, NOW(), NOW()),
('vn77xjxw2gn456tc2a1dnrh0rd7jggc4', 'v5799kb53q14k5tyf4y0kj636d7jhz8p', '2025-08-19', 'utm_source', 'direct', 73, 58, 2, NOW(), NOW()),
('vn77xjxw2gn456tc2a1dnrh0rd7jggc4', 'v5799kb53q14k5tyf4y0kj636d7jhz8p', '2025-08-18', 'utm_source', 'direct', 81, 64, 3, NOW(), NOW()),

-- UTM Medium別のデータ
-- CPC広告
('vn77xjxw2gn456tc2a1dnrh0rd7jggc4', 'v5799kb53q14k5tyf4y0kj636d7jhz8p', '2025-08-22', 'utm_medium', 'cpc', 245, 134, 30, NOW(), NOW()),
('vn77xjxw2gn456tc2a1dnrh0rd7jggc4', 'v5799kb53q14k5tyf4y0kj636d7jhz8p', '2025-08-21', 'utm_medium', 'cpc', 219, 121, 22, NOW(), NOW()),
('vn77xjxw2gn456tc2a1dnrh0rd7jggc4', 'v5799kb53q14k5tyf4y0kj636d7jhz8p', '2025-08-20', 'utm_medium', 'cpc', 259, 142, 35, NOW(), NOW()),
('vn77xjxw2gn456tc2a1dnrh0rd7jggc4', 'v5799kb53q14k5tyf4y0kj636d7jhz8p', '2025-08-19', 'utm_medium', 'cpc', 205, 116, 26, NOW(), NOW()),
('vn77xjxw2gn456tc2a1dnrh0rd7jggc4', 'v5799kb53q14k5tyf4y0kj636d7jhz8p', '2025-08-18', 'utm_medium', 'cpc', 230, 128, 31, NOW(), NOW()),

-- オーガニック検索
('vn77xjxw2gn456tc2a1dnrh0rd7jggc4', 'v5799kb53q14k5tyf4y0kj636d7jhz8p', '2025-08-22', 'utm_medium', 'organic', 156, 89, 12, NOW(), NOW()),
('vn77xjxw2gn456tc2a1dnrh0rd7jggc4', 'v5799kb53q14k5tyf4y0kj636d7jhz8p', '2025-08-21', 'utm_medium', 'organic', 143, 82, 8, NOW(), NOW()),
('vn77xjxw2gn456tc2a1dnrh0rd7jggc4', 'v5799kb53q14k5tyf4y0kj636d7jhz8p', '2025-08-20', 'utm_medium', 'organic', 167, 95, 15, NOW(), NOW()),
('vn77xjxw2gn456tc2a1dnrh0rd7jggc4', 'v5799kb53q14k5tyf4y0kj636d7jhz8p', '2025-08-19', 'utm_medium', 'organic', 134, 78, 9, NOW(), NOW()),
('vn77xjxw2gn456tc2a1dnrh0rd7jggc4', 'v5799kb53q14k5tyf4y0kj636d7jhz8p', '2025-08-18', 'utm_medium', 'organic', 112, 65, 7, NOW(), NOW()),

-- ソーシャルメディア
('vn77xjxw2gn456tc2a1dnrh0rd7jggc4', 'v5799kb53q14k5tyf4y0kj636d7jhz8p', '2025-08-22', 'utm_medium', 'social', 134, 86, 29, NOW(), NOW()),
('vn77xjxw2gn456tc2a1dnrh0rd7jggc4', 'v5799kb53q14k5tyf4y0kj636d7jhz8p', '2025-08-21', 'utm_medium', 'social', 114, 74, 22, NOW(), NOW()),
('vn77xjxw2gn456tc2a1dnrh0rd7jggc4', 'v5799kb53q14k5tyf4y0kj636d7jhz8p', '2025-08-20', 'utm_medium', 'social', 144, 94, 35, NOW(), NOW()),
('vn77xjxw2gn456tc2a1dnrh0rd7jggc4', 'v5799kb53q14k5tyf4y0kj636d7jhz8p', '2025-08-19', 'utm_medium', 'social', 112, 74, 26, NOW(), NOW()),
('vn77xjxw2gn456tc2a1dnrh0rd7jggc4', 'v5799kb53q14k5tyf4y0kj636d7jhz8p', '2025-08-18', 'utm_medium', 'social', 130, 85, 31, NOW(), NOW()),

-- UTM Campaign別のデータ
-- 夏のキャンペーン
('vn77xjxw2gn456tc2a1dnrh0rd7jggc4', 'v5799kb53q14k5tyf4y0kj636d7jhz8p', '2025-08-22', 'utm_campaign', 'summer_2025', 89, 54, 18, NOW(), NOW()),
('vn77xjxw2gn456tc2a1dnrh0rd7jggc4', 'v5799kb53q14k5tyf4y0kj636d7jhz8p', '2025-08-21', 'utm_campaign', 'summer_2025', 76, 47, 14, NOW(), NOW()),
('vn77xjxw2gn456tc2a1dnrh0rd7jggc4', 'v5799kb53q14k5tyf4y0kj636d7jhz8p', '2025-08-20', 'utm_campaign', 'summer_2025', 92, 58, 21, NOW(), NOW()),
('vn77xjxw2gn456tc2a1dnrh0rd7jggc4', 'v5799kb53q14k5tyf4y0kj636d7jhz8p', '2025-08-19', 'utm_campaign', 'summer_2025', 71, 45, 16, NOW(), NOW()),
('vn77xjxw2gn456tc2a1dnrh0rd7jggc4', 'v5799kb53q14k5tyf4y0kj636d7jhz8p', '2025-08-18', 'utm_campaign', 'summer_2025', 83, 52, 19, NOW(), NOW()),

-- 新規顧客獲得キャンペーン
('vn77xjxw2gn456tc2a1dnrh0rd7jggc4', 'v5799kb53q14k5tyf4y0kj636d7jhz8p', '2025-08-22', 'utm_campaign', 'new_customer', 67, 45, 13, NOW(), NOW()),
('vn77xjxw2gn456tc2a1dnrh0rd7jggc4', 'v5799kb53q14k5tyf4y0kj636d7jhz8p', '2025-08-21', 'utm_campaign', 'new_customer', 58, 39, 9, NOW(), NOW()),
('vn77xjxw2gn456tc2a1dnrh0rd7jggc4', 'v5799kb53q14k5tyf4y0kj636d7jhz8p', '2025-08-20', 'utm_campaign', 'new_customer', 73, 49, 16, NOW(), NOW()),
('vn77xjxw2gn456tc2a1dnrh0rd7jggc4', 'v5799kb53q14k5tyf4y0kj636d7jhz8p', '2025-08-19', 'utm_campaign', 'new_customer', 61, 41, 11, NOW(), NOW()),
('vn77xjxw2gn456tc2a1dnrh0rd7jggc4', 'v5799kb53q14k5tyf4y0kj636d7jhz8p', '2025-08-18', 'utm_campaign', 'new_customer', 69, 46, 14, NOW(), NOW()),

-- Page URL別のデータ
('vn77xjxw2gn456tc2a1dnrh0rd7jggc4', 'v5799kb53q14k5tyf4y0kj636d7jhz8p', '2025-08-22', 'page_url', '/reservation/v5799kb53q14k5tyf4y0kj636d7jhz8p', 321, 189, 45, NOW(), NOW()),
('vn77xjxw2gn456tc2a1dnrh0rd7jggc4', 'v5799kb53q14k5tyf4y0kj636d7jhz8p', '2025-08-21', 'page_url', '/reservation/v5799kb53q14k5tyf4y0kj636d7jhz8p', 287, 168, 34, NOW(), NOW()),
('vn77xjxw2gn456tc2a1dnrh0rd7jggc4', 'v5799kb53q14k5tyf4y0kj636d7jhz8p', '2025-08-20', 'page_url', '/reservation/v5799kb53q14k5tyf4y0kj636d7jhz8p', 345, 203, 52, NOW(), NOW()),
('vn77xjxw2gn456tc2a1dnrh0rd7jggc4', 'v5799kb53q14k5tyf4y0kj636d7jhz8p', '2025-08-19', 'page_url', '/reservation/v5799kb53q14k5tyf4y0kj636d7jhz8p', 278, 162, 38, NOW(), NOW()),
('vn77xjxw2gn456tc2a1dnrh0rd7jggc4', 'v5799kb53q14k5tyf4y0kj636d7jhz8p', '2025-08-18', 'page_url', '/reservation/v5799kb53q14k5tyf4y0kj636d7jhz8p', 312, 184, 47, NOW(), NOW()),
('vn77xjxw2gn456tc2a1dnrh0rd7jggc4', 'v5799kb53q14k5tyf4y0kj636d7jhz8p', '2025-08-22', 'page_url', '/reservation/v5799kb53q14k5tyf4y0kj636d7jhz8p', 245, 145, 28, NOW(), NOW()),
('vn77xjxw2gn456tc2a1dnrh0rd7jggc4', 'v5799kb53q14k5tyf4y0kj636d7jhz8p', '2025-08-21', 'page_url', '/reservation/v5799kb53q14k5tyf4y0kj636d7jhz8p', 219, 129, 21, NOW(), NOW()),
('vn77xjxw2gn456tc2a1dnrh0rd7jggc4', 'v5799kb53q14k5tyf4y0kj636d7jhz8p', '2025-08-20', 'page_url', '/reservation/v5799kb53q14k5tyf4y0kj636d7jhz8p', 267, 157, 34, NOW(), NOW()),
('vn77xjxw2gn456tc2a1dnrh0rd7jggc4', 'v5799kb53q14k5tyf4y0kj636d7jhz8p', '2025-08-19', 'page_url', '/reservation/v5799kb53q14k5tyf4y0kj636d7jhz8p', 198, 117, 19, NOW(), NOW()),
('vn77xjxw2gn456tc2a1dnrh0rd7jggc4', 'v5799kb53q14k5tyf4y0kj636d7jhz8p', '2025-08-18', 'page_url', '/reservation/v5799kb53q14k5tyf4y0kj636d7jhz8p', 234, 138, 26, NOW(), NOW()),
('vn77xjxw2gn456tc2a1dnrh0rd7jggc4', 'v5799kb53q14k5tyf4y0kj636d7jhz8p', '2025-08-22', 'page_url', '/reservation/v5799kb53q14k5tyf4y0kj636d7jhz8p', 178, 112, 15, NOW(), NOW()),
('vn77xjxw2gn456tc2a1dnrh0rd7jggc4', 'v5799kb53q14k5tyf4y0kj636d7jhz8p', '2025-08-21', 'page_url', '/reservation/v5799kb53q14k5tyf4y0kj636d7jhz8p', 156, 98, 11, NOW(), NOW()),
('vn77xjxw2gn456tc2a1dnrh0rd7jggc4', 'v5799kb53q14k5tyf4y0kj636d7jhz8p', '2025-08-20', 'page_url', '/reservation/v5799kb53q14k5tyf4y0kj636d7jhz8p', 189, 119, 18, NOW(), NOW()),
('vn77xjxw2gn456tc2a1dnrh0rd7jggc4', 'v5799kb53q14k5tyf4y0kj636d7jhz8p', '2025-08-19', 'page_url', '/reservation/v5799kb53q14k5tyf4y0kj636d7jhz8p', 143, 89, 13, NOW(), NOW()),
('vn77xjxw2gn456tc2a1dnrh0rd7jggc4', 'v5799kb53q14k5tyf4y0kj636d7jhz8p', '2025-08-18', 'page_url', '/reservation/v5799kb53q14k5tyf4y0kj636d7jhz8p', 167, 105, 16, NOW(), NOW()),

-- Referrer URL別のデータ（流入元サイト）
-- Google検索結果からの流入
('vn77xjxw2gn456tc2a1dnrh0rd7jggc4', 'v5799kb53q14k5tyf4y0kj636d7jhz8p', '2025-08-22', 'referrer_url', 'https://www.google.com/', 89, 67, 12, NOW(), NOW()),
('vn77xjxw2gn456tc2a1dnrh0rd7jggc4', 'v5799kb53q14k5tyf4y0kj636d7jhz8p', '2025-08-21', 'referrer_url', 'https://www.google.com/', 78, 59, 9, NOW(), NOW()),
('vn77xjxw2gn456tc2a1dnrh0rd7jggc4', 'v5799kb53q14k5tyf4y0kj636d7jhz8p', '2025-08-20', 'referrer_url', 'https://www.google.com/', 95, 71, 14, NOW(), NOW()),
('vn77xjxw2gn456tc2a1dnrh0rd7jggc4', 'v5799kb53q14k5tyf4y0kj636d7jhz8p', '2025-08-19', 'referrer_url', 'https://www.google.com/', 84, 63, 11, NOW(), NOW()),
('vn77xjxw2gn456tc2a1dnrh0rd7jggc4', 'v5799kb53q14k5tyf4y0kj636d7jhz8p', '2025-08-18', 'referrer_url', 'https://www.google.com/', 91, 68, 13, NOW(), NOW()),

-- Facebook投稿からの流入
('vn77xjxw2gn456tc2a1dnrh0rd7jggc4', 'v5799kb53q14k5tyf4y0kj636d7jhz8p', '2025-08-22', 'referrer_url', 'https://www.facebook.com/', 45, 34, 8, NOW(), NOW()),
('vn77xjxw2gn456tc2a1dnrh0rd7jggc4', 'v5799kb53q14k5tyf4y0kj636d7jhz8p', '2025-08-21', 'referrer_url', 'https://www.facebook.com/', 38, 29, 6, NOW(), NOW()),
('vn77xjxw2gn456tc2a1dnrh0rd7jggc4', 'v5799kb53q14k5tyf4y0kj636d7jhz8p', '2025-08-20', 'referrer_url', 'https://www.facebook.com/', 52, 39, 11, NOW(), NOW()),
('vn77xjxw2gn456tc2a1dnrh0rd7jggc4', 'v5799kb53q14k5tyf4y0kj636d7jhz8p', '2025-08-19', 'referrer_url', 'https://www.facebook.com/', 41, 31, 7, NOW(), NOW()),
('vn77xjxw2gn456tc2a1dnrh0rd7jggc4', 'v5799kb53q14k5tyf4y0kj636d7jhz8p', '2025-08-18', 'referrer_url', 'https://www.facebook.com/', 47, 35, 9, NOW(), NOW()),

-- Instagram投稿からの流入
('vn77xjxw2gn456tc2a1dnrh0rd7jggc4', 'v5799kb53q14k5tyf4y0kj636d7jhz8p', '2025-08-22', 'referrer_url', 'https://www.instagram.com/', 23, 18, 5, NOW(), NOW()),
('vn77xjxw2gn456tc2a1dnrh0rd7jggc4', 'v5799kb53q14k5tyf4y0kj636d7jhz8p', '2025-08-21', 'referrer_url', 'https://www.instagram.com/', 19, 15, 4, NOW(), NOW()),
('vn77xjxw2gn456tc2a1dnrh0rd7jggc4', 'v5799kb53q14k5tyf4y0kj636d7jhz8p', '2025-08-20', 'referrer_url', 'https://www.instagram.com/', 27, 21, 7, NOW(), NOW()),
('vn77xjxw2gn456tc2a1dnrh0rd7jggc4', 'v5799kb53q14k5tyf4y0kj636d7jhz8p', '2025-08-19', 'referrer_url', 'https://www.instagram.com/', 21, 16, 5, NOW(), NOW()),
('vn77xjxw2gn456tc2a1dnrh0rd7jggc4', 'v5799kb53q14k5tyf4y0kj636d7jhz8p', '2025-08-18', 'referrer_url', 'https://www.instagram.com/', 25, 19, 6, NOW(), NOW()),

-- Yahoo検索からの流入
('vn77xjxw2gn456tc2a1dnrh0rd7jggc4', 'v5799kb53q14k5tyf4y0kj636d7jhz8p', '2025-08-22', 'referrer_url', 'https://search.yahoo.co.jp/', 34, 26, 4, NOW(), NOW()),
('vn77xjxw2gn456tc2a1dnrh0rd7jggc4', 'v5799kb53q14k5tyf4y0kj636d7jhz8p', '2025-08-21', 'referrer_url', 'https://search.yahoo.co.jp/', 29, 22, 3, NOW(), NOW()),
('vn77xjxw2gn456tc2a1dnrh0rd7jggc4', 'v5799kb53q14k5tyf4y0kj636d7jhz8p', '2025-08-20', 'referrer_url', 'https://search.yahoo.co.jp/', 38, 29, 5, NOW(), NOW()),

-- Twitter(X)からの流入
('vn77xjxw2gn456tc2a1dnrh0rd7jggc4', 'v5799kb53q14k5tyf4y0kj636d7jhz8p', '2025-08-22', 'referrer_url', 'https://x.com/', 12, 9, 2, NOW(), NOW()),
('vn77xjxw2gn456tc2a1dnrh0rd7jggc4', 'v5799kb53q14k5tyf4y0kj636d7jhz8p', '2025-08-21', 'referrer_url', 'https://x.com/', 8, 6, 1, NOW(), NOW()),
('vn77xjxw2gn456tc2a1dnrh0rd7jggc4', 'v5799kb53q14k5tyf4y0kj636d7jhz8p', '2025-08-20', 'referrer_url', 'https://x.com/', 15, 12, 3, NOW(), NOW()),

-- 直接アクセス（ブックマーク等）
('vn77xjxw2gn456tc2a1dnrh0rd7jggc4', 'v5799kb53q14k5tyf4y0kj636d7jhz8p', '2025-08-22', 'referrer_url', '(direct)', 67, 52, 8, NOW(), NOW()),
('vn77xjxw2gn456tc2a1dnrh0rd7jggc4', 'v5799kb53q14k5tyf4y0kj636d7jhz8p', '2025-08-21', 'referrer_url', '(direct)', 58, 45, 6, NOW(), NOW()),
('vn77xjxw2gn456tc2a1dnrh0rd7jggc4', 'v5799kb53q14k5tyf4y0kj636d7jhz8p', '2025-08-20', 'referrer_url', '(direct)', 74, 57, 9, NOW(), NOW());

-- 実行前の確認事項:
-- ✅ tenant_id と org_id は実際の値に置き換え済み
-- 2. 必要に応じて日付範囲を調整する
-- 3. 各dimension_typeごとにデータが適切に分散されていることを確認

-- クエリ実行後の確認:
-- SELECT dimension_type, COUNT(*) as count FROM tracking_summaries WHERE tenant_id = 'vn77xjxw2gn456tc2a1dnrh0rd7jggc4' GROUP BY dimension_type;