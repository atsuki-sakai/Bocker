const { createClient } = require('@supabase/supabase-js');

// 環境変数を直接設定（本番環境の値）
const supabaseUrl = 'https://fxpdfqrnaifxokumgrht.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ4cGRmcXJuYWlmeG9rdW1ncmh0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzIyMjY4NiwiZXhwIjoyMDYyNzk4Njg2fQ.dB-LfcdeLYDBdFyAjOat5vXYEWtiQeDfApSrDrLkOLQ';

async function checkSupabaseSimple() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  console.log('=== Supabase 本番環境調査 ===\n');
  
  try {
    // 1. delete_customer_and_related_data関数のテスト
    console.log('1. delete_customer_and_related_data関数の確認...');
    const { data: funcTest, error: funcError } = await supabase.rpc('delete_customer_and_related_data', {
      p_customer_uid: '00000000-0000-0000-0000-000000000000' // ダミーUUID
    });
    
    if (funcError) {
      if (funcError.message.includes('does not exist')) {
        console.log('❌ 関数が存在しません');
      } else {
        console.log('✅ 関数は存在します（テストエラー:', funcError.message.substring(0, 50), '...）');
      }
    } else {
      console.log('✅ 関数は正常に実行されました');
    }
    
    // 2. customerテーブルの基本確認
    console.log('\n2. customerテーブルのサンプルデータ確認...');
    const { data: customers, error: custError } = await supabase
      .from('customer')
      .select('uid, email, first_name, last_name')
      .limit(1);
    
    if (custError) {
      console.log('❌ customerテーブルエラー:', custError.message);
    } else {
      console.log('✅ customerテーブル接続成功。レコード数:', customers.length);
      if (customers.length > 0) {
        console.log('  サンプル:', customers[0]);
      }
    }
    
    // 3. reservationテーブルの確認
    console.log('\n3. reservationテーブルの確認...');
    const { data: reservations, error: resError } = await supabase
      .from('reservation')
      .select('uid, customer_id, date')
      .limit(1);
    
    if (resError) {
      console.log('❌ reservationテーブルエラー:', resError.message);
    } else {
      console.log('✅ reservationテーブル接続成功。レコード数:', reservations.length);
      if (reservations.length > 0) {
        console.log('  サンプル:', reservations[0]);
        console.log('  customer_idの型:', typeof reservations[0].customer_id);
      }
    }
    
    // 4. carteテーブルの確認
    console.log('\n4. carteテーブルの確認...');
    const { data: cartes, error: carteError } = await supabase
      .from('carte')
      .select('id, customer_id')
      .limit(1);
    
    if (carteError) {
      console.log('❌ carteテーブルエラー:', carteError.message);
    } else {
      console.log('✅ carteテーブル接続成功。レコード数:', cartes.length);
      if (cartes.length > 0) {
        console.log('  サンプル:', cartes[0]);
        console.log('  customer_idの型:', typeof cartes[0].customer_id);
      }
    }
    
    // 5. point_transactionテーブルの確認
    console.log('\n5. point_transactionテーブルの確認...');
    const { data: points, error: pointError } = await supabase
      .from('point_transaction')
      .select('id, customer_id, reservation_id')
      .limit(1);
    
    if (pointError) {
      console.log('❌ point_transactionテーブルエラー:', pointError.message);
    } else {
      console.log('✅ point_transactionテーブル接続成功。レコード数:', points.length);
      if (points.length > 0) {
        console.log('  サンプル:', points[0]);
        console.log('  customer_idの型:', typeof points[0].customer_id);
        console.log('  reservation_idの型:', typeof points[0].reservation_id);
      }
    }
    
    // 6. 関数パラメータの確認（存在する場合）
    console.log('\n6. delete_customer_and_related_data関数の詳細...');
    try {
      const { data: funcDetails, error: detailError } = await supabase.rpc('get_function_details', {
        function_name: 'delete_customer_and_related_data'
      });
      if (detailError) {
        console.log('関数詳細取得不可:', detailError.message);
      } else {
        console.log('関数詳細:', funcDetails);
      }
    } catch (e) {
      console.log('関数詳細取得機能は利用できません');
    }
    
  } catch (error) {
    console.error('調査中に予期しないエラー:', error);
  }
}

checkSupabaseSimple().catch(console.error);