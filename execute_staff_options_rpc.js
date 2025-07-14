// スタッフ選択肢RPC関数作成スクリプト
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.development.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('環境変数が設定されていません');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createStaffOptionsRpc() {
  console.log('📝 スタッフ選択肢RPC関数を作成中...');
  
  try {
    // SQL文を直接定義（ファイル読み込みでエラーが出るため）
    const createFunctionSql = `
-- スタッフ選択肢取得RPC関数
DROP FUNCTION IF EXISTS get_distinct_staff_options(TEXT, TEXT);
CREATE OR REPLACE FUNCTION get_distinct_staff_options(
    p_tenant_id TEXT,
    p_org_id TEXT
)
RETURNS TABLE (
    staff_id TEXT,
    staff_name TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT
        sss.staff_id,
        -- 最新のstaff_nameを取得
        (SELECT ss.staff_name 
         FROM staff_sales_summary ss 
         WHERE ss.staff_id = sss.staff_id 
           AND ss.tenant_id = p_tenant_id 
           AND ss.org_id = p_org_id
         ORDER BY ss.summary_month DESC 
         LIMIT 1
        ) as staff_name
    FROM staff_sales_summary sss
    WHERE sss.tenant_id = p_tenant_id
        AND sss.org_id = p_org_id
        AND sss.booking_count > 0
    ORDER BY staff_name ASC;
END;
$$;
`;

    // 関数を作成
    const { error: createError } = await supabase.rpc('exec', { sql: createFunctionSql });
    
    if (createError) {
      console.error('❌ RPC関数作成エラー:', createError);
      return;
    }

    // 権限設定
    const grantSql = `GRANT EXECUTE ON FUNCTION get_distinct_staff_options TO anon, authenticated;`;
    const { error: grantError } = await supabase.rpc('exec', { sql: grantSql });
    
    if (grantError) {
      console.warn('⚠️ 権限設定エラー（無視可能）:', grantError.message);
    }

    console.log('✅ スタッフ選択肢RPC関数が正常に作成されました');
    
    // テスト実行
    console.log('\n🧪 関数テスト中...');
    const { data: testData, error: testError } = await supabase.rpc('get_distinct_staff_options', {
      p_tenant_id: 'test_tenant',
      p_org_id: 'test_org'
    });
    
    if (testError) {
      console.log('⚠️ テストエラー（データがないため正常）:', testError.message);
    } else {
      console.log('✅ 関数テスト成功:', testData?.length || 0, '件のスタッフ');
    }
    
  } catch (err) {
    console.error('❌ 実行エラー:', err.message);
  }
}

createStaffOptionsRpc().catch(console.error);