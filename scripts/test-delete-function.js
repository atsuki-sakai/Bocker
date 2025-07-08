const { createClient } = require('@supabase/supabase-js');

// 環境変数を直接設定（本番環境の値）
const supabaseUrl = 'https://fxpdfqrnaifxokumgrht.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ4cGRmcXJuYWlmeG9rdW1ncmh0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzIyMjY4NiwiZXhwIjoyMDYyNzk4Njg2fQ.dB-LfcdeLYDBdFyAjOat5vXYEWtiQeDfApSrDrLkOLQ';

async function testDeleteFunction() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  console.log('=== delete_customer_and_related_data関数のテスト ===\n');
  
  try {
    // 既存のcustomerレコードを確認
    console.log('1. 既存のcustomerレコード確認...');
    const { data: customers, error: listError } = await supabase
      .from('customer')
      .select('uid, email, first_name, last_name')
      .limit(5);
    
    if (listError) {
      console.log('❌ customerレコード取得エラー:', listError.message);
      return;
    }
    
    console.log('✅ 現在のcustomerレコード数:', customers.length);
    customers.forEach((customer, index) => {
      console.log(`  ${index + 1}. ${customer.uid} - ${customer.first_name} ${customer.last_name} (${customer.email})`);
    });
    
    if (customers.length === 0) {
      console.log('削除対象のレコードがありません');
      return;
    }
    
    // テスト用の顧客UIDを取得（最初の顧客）
    const testCustomerUid = customers[0].uid;
    console.log(`\n2. テスト対象顧客: ${testCustomerUid}`);
    
    // 関連データの存在確認
    console.log('\n3. 関連データの確認...');
    
    // customer_detail
    const { data: details, error: detailError } = await supabase
      .from('customer_detail')
      .select('uid')
      .eq('customer_uid', testCustomerUid);
    
    if (!detailError) {
      console.log(`  customer_detail: ${details.length}件`);
    }
    
    // customer_points
    const { data: points, error: pointsError } = await supabase
      .from('customer_points')
      .select('uid')
      .eq('customer_uid', testCustomerUid);
    
    if (!pointsError) {
      console.log(`  customer_points: ${points.length}件`);
    }
    
    // carte (customer_idがstring型の場合)
    const { data: cartes, error: carteError } = await supabase
      .from('carte')
      .select('id')
      .eq('customer_id', testCustomerUid);
    
    if (!carteError) {
      console.log(`  carte: ${cartes.length}件`);
    }
    
    // point_transaction
    const { data: transactions, error: transError } = await supabase
      .from('point_transaction')
      .select('id')
      .eq('customer_id', testCustomerUid);
    
    if (!transError) {
      console.log(`  point_transaction: ${transactions.length}件`);
    }
    
    // 削除処理の実行
    console.log('\n4. delete_customer_and_related_data関数の実行...');
    console.log(`削除対象: ${testCustomerUid}`);
    
    const { data: deleteResult, error: deleteError } = await supabase.rpc('delete_customer_and_related_data', {
      p_customer_uid: testCustomerUid
    });
    
    if (deleteError) {
      console.log('❌ 削除処理エラー:', deleteError.message);
      console.log('エラー詳細:', deleteError);
      
      // エラーが外部キー制約に関連している場合の詳細調査
      if (deleteError.message.includes('foreign key constraint') || deleteError.message.includes('violates')) {
        console.log('\n🔍 外部キー制約エラーの詳細調査...');
        
        // どのテーブルが参照しているか確認
        const referencingTables = ['carte', 'carte_detail', 'point_transaction', 'point_task_queue', 'coupon_transaction'];
        
        for (const table of referencingTables) {
          try {
            const { data: refs, error: refError } = await supabase
              .from(table)
              .select('*')
              .eq('customer_id', testCustomerUid)
              .limit(1);
            
            if (!refError && refs.length > 0) {
              console.log(`  ⚠️  ${table}に参照レコードが存在: ${refs.length}件`);
              console.log(`    サンプル:`, refs[0]);
            }
          } catch (e) {
            // テーブルが存在しない場合はスキップ
          }
        }
      }
    } else {
      console.log('✅ 削除処理が正常に完了しました');
      
      // 削除後の確認
      console.log('\n5. 削除後の確認...');
      const { data: afterCustomer, error: afterError } = await supabase
        .from('customer')
        .select('uid')
        .eq('uid', testCustomerUid);
      
      if (afterError) {
        console.log('確認エラー:', afterError.message);
      } else if (afterCustomer.length === 0) {
        console.log('✅ 顧客レコードが正常に削除されました');
      } else {
        console.log('⚠️  顧客レコードがまだ存在しています');
      }
    }
    
  } catch (error) {
    console.error('テスト中に予期しないエラー:', error);
  }
}

testDeleteFunction().catch(console.error);