// RPC関数のテストスクリプト（マイグレーション前確認用）
import { createClient } from '@supabase/supabase-js';
import { subDays, format } from 'date-fns';

// 環境変数から設定を取得
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('環境変数が設定されていません');
  console.log('NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
  console.log('SUPABASE_SERVICE_ROLE_KEY:', !!supabaseKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// テスト用のパラメータ
const testParams = {
  tenantId: 'test_tenant',
  orgId: 'test_org',
  dateFrom: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
  dateTo: format(new Date(), 'yyyy-MM-dd'),
  staffIds: null,
  menuIds: null
};

console.log('🧪 RPC関数テスト開始');
console.log('テストパラメータ:', testParams);

// 各RPC関数をテスト
async function testRpcFunctions() {
  console.log('\n1. get_aggregated_daily_sales テスト');
  try {
    const { data, error } = await supabase.rpc('get_aggregated_daily_sales', {
      p_tenant_id: testParams.tenantId,
      p_org_id: testParams.orgId,
      p_date_from: testParams.dateFrom,
      p_date_to: testParams.dateTo
    });
    
    if (error) {
      console.error('❌ エラー:', error);
    } else {
      console.log('✅ 成功:', `${data?.length || 0}件のデータ`);
      if (data && data.length > 0) {
        console.log('サンプルデータ:', data[0]);
      }
    }
  } catch (err) {
    console.error('❌ 例外:', err.message);
  }

  console.log('\n2. get_aggregated_staff_sales テスト');
  try {
    const { data, error } = await supabase.rpc('get_aggregated_staff_sales', {
      p_tenant_id: testParams.tenantId,
      p_org_id: testParams.orgId,
      p_date_from: testParams.dateFrom,
      p_date_to: testParams.dateTo,
      p_staff_ids: testParams.staffIds
    });
    
    if (error) {
      console.error('❌ エラー:', error);
    } else {
      console.log('✅ 成功:', `${data?.length || 0}件のデータ`);
      if (data && data.length > 0) {
        console.log('サンプルデータ:', data[0]);
      }
    }
  } catch (err) {
    console.error('❌ 例外:', err.message);
  }

  console.log('\n3. get_aggregated_menu_sales テスト');
  try {
    const { data, error } = await supabase.rpc('get_aggregated_menu_sales', {
      p_tenant_id: testParams.tenantId,
      p_org_id: testParams.orgId,
      p_date_from: testParams.dateFrom,
      p_date_to: testParams.dateTo,
      p_menu_ids: testParams.menuIds
    });
    
    if (error) {
      console.error('❌ エラー:', error);
    } else {
      console.log('✅ 成功:', `${data?.length || 0}件のデータ`);
      if (data && data.length > 0) {
        console.log('サンプルデータ:', data[0]);
      }
    }
  } catch (err) {
    console.error('❌ 例外:', err.message);
  }

  console.log('\n4. get_period_comparison_data テスト');
  try {
    const { data, error } = await supabase.rpc('get_period_comparison_data', {
      p_tenant_id: testParams.tenantId,
      p_org_id: testParams.orgId,
      p_current_date_from: testParams.dateFrom,
      p_current_date_to: testParams.dateTo,
      p_previous_date_from: format(subDays(new Date(testParams.dateFrom), 30), 'yyyy-MM-dd'),
      p_previous_date_to: format(subDays(new Date(testParams.dateTo), 30), 'yyyy-MM-dd')
    });
    
    if (error) {
      console.error('❌ エラー:', error);
    } else {
      console.log('✅ 成功:', `${data?.length || 0}件のデータ`);
      if (data && data.length > 0) {
        console.log('サンプルデータ:', data[0]);
      }
    }
  } catch (err) {
    console.error('❌ 例外:', err.message);
  }

  console.log('\n5. get_period_sales_summary テスト');
  try {
    const { data, error } = await supabase.rpc('get_period_sales_summary', {
      p_tenant_id: testParams.tenantId,
      p_org_id: testParams.orgId,
      p_date_from: testParams.dateFrom,
      p_date_to: testParams.dateTo
    });
    
    if (error) {
      console.error('❌ エラー:', error);
    } else {
      console.log('✅ 成功:', `${data?.length || 0}件のデータ`);
      if (data && data.length > 0) {
        console.log('サンプルデータ:', data[0]);
      }
    }
  } catch (err) {
    console.error('❌ 例外:', err.message);
  }

  console.log('\n🧪 テスト完了');
}

// テスト実行
testRpcFunctions().catch(console.error);