// Supabase接続テスト（CommonJS形式）
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.development.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔗 Supabase接続テスト開始');
console.log('URL:', supabaseUrl ? 'あり' : 'なし');
console.log('SERVICE_ROLE_KEY:', supabaseKey ? 'あり' : 'なし');

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 環境変数が設定されていません');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    console.log('\n📊 基本テーブル確認');
    
    // daily_sales_summaryテーブルの存在確認
    const { data, error } = await supabase
      .from('daily_sales_summary')
      .select('*')
      .limit(1);
    
    if (error) {
      console.log('❌ daily_sales_summaryテーブルエラー:', error.message);
    } else {
      console.log('✅ daily_sales_summaryテーブル接続OK');
    }

    // 既存RPC関数の確認（もしあれば）
    console.log('\n🔧 RPC関数確認');
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_aggregated_daily_sales', {
        p_tenant_id: 'test',
        p_org_id: 'test',
        p_date_from: '2025-01-01',
        p_date_to: '2025-01-31'
      });
      
      if (rpcError) {
        console.log('⚠️  RPC関数が存在しないか、エラー:', rpcError.message);
        console.log('   → マイグレーションが必要です');
      } else {
        console.log('✅ RPC関数が既に存在します');
      }
    } catch (err) {
      console.log('⚠️  RPC関数テストエラー:', err.message);
    }

    console.log('\n✅ 接続テスト完了');
    
  } catch (err) {
    console.error('❌ 接続テスト失敗:', err);
    process.exit(1);
  }
}

testConnection();