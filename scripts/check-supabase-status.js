const { createClient } = require('@supabase/supabase-js');

// 環境変数を直接設定（開発環境の値）
const supabaseUrl = 'https://fxpdfqrnaifxokumgrht.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ4cGRmcXJuYWlmeG9rdW1ncmh0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzIyMjY4NiwiZXhwIjoyMDYyNzk4Njg2fQ.dB-LfcdeLYDBdFyAjOat5vXYEWtiQeDfApSrDrLkOLQ';

async function checkSupabaseStatus() {
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase environment variables');
    return;
  }
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  console.log('=== Supabase現在の状況調査 ===');
  console.log(`環境: ${supabaseUrl.includes('fxpdfqrnaifxokumgrht') ? '本番' : '開発'}`);
  console.log('');
  
  try {
    // 1. delete_customer_and_related_data関数の存在確認
    console.log('1. delete_customer_and_related_data関数の確認...');
    const { data: functionExists, error: funcError } = await supabase.rpc('delete_customer_and_related_data', {
      p_customer_uid: '00000000-0000-0000-0000-000000000000' // ダミーUUID
    });
    
    if (funcError) {
      if (funcError.message.includes('function') && funcError.message.includes('does not exist')) {
        console.log('❌ delete_customer_and_related_data関数が存在しません');
      } else if (funcError.message.includes('violates foreign key constraint') || funcError.message.includes('does not exist')) {
        console.log('✅ delete_customer_and_related_data関数は存在しています（ダミーUUIDエラーは正常）');
      } else {
        console.log('⚠️  関数実行エラー:', funcError.message);
      }
    } else {
      console.log('✅ delete_customer_and_related_data関数は存在しています');
    }
    
    // 2. テーブル構造の確認
    console.log('\n2. 関連テーブルの構造確認...');
    
    // customer テーブルの確認
    const { data: customerColumns, error: customerError } = await supabase
      .rpc('sql', {
        query: `
          SELECT column_name, data_type, is_nullable 
          FROM information_schema.columns 
          WHERE table_schema = 'public' AND table_name = 'customer'
          ORDER BY ordinal_position
        `
      });
    
    if (customerError) {
      console.log('❌ customer テーブル情報取得エラー:', customerError.message);
    } else {
      console.log('✅ customer テーブル構造:');
      customerColumns.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'NULL可' : 'NOT NULL'})`);
      });
    }
    
    // reservation テーブルの確認
    console.log('\n  reservation テーブルの確認...');
    const { data: reservationColumns, error: resError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_schema', 'public')
      .eq('table_name', 'reservation')
      .order('ordinal_position');
    
    if (resError) {
      console.log('❌ reservation テーブルが存在しないか、エラー:', resError.message);
    } else {
      console.log('✅ reservation テーブル構造:');
      reservationColumns.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'NULL可' : 'NOT NULL'})`);
      });
    }
    
    // 3. 外部キー制約の確認
    console.log('\n3. 外部キー制約の確認...');
    const { data: constraints, error: constraintError } = await supabase
      .from('information_schema.table_constraints')
      .select('constraint_name, table_name, constraint_type')
      .eq('table_schema', 'public')
      .eq('constraint_type', 'FOREIGN KEY')
      .in('table_name', ['carte', 'carte_detail', 'coupon_transaction', 'point_transaction', 'point_task_queue']);
    
    if (constraintError) {
      console.log('❌ 外部キー制約情報取得エラー:', constraintError.message);
    } else {
      console.log('✅ 外部キー制約:');
      constraints.forEach(constraint => {
        console.log(`  - ${constraint.table_name}.${constraint.constraint_name}`);
      });
    }
    
    // 4. customer_idフィールドの型確認
    console.log('\n4. customer_idフィールドのデータ型確認...');
    const tables = ['carte', 'carte_detail', 'point_transaction', 'point_task_queue'];
    
    for (const table of tables) {
      const { data: columnInfo, error: colError } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type')
        .eq('table_schema', 'public')
        .eq('table_name', table)
        .like('column_name', '%customer%');
      
      if (colError) {
        console.log(`❌ ${table} テーブル情報取得エラー:`, colError.message);
      } else if (columnInfo.length > 0) {
        console.log(`✅ ${table} テーブル:`, columnInfo.map(col => `${col.column_name}(${col.data_type})`).join(', '));
      } else {
        console.log(`⚠️  ${table} テーブルにcustomer関連フィールドが見つかりません`);
      }
    }
    
  } catch (error) {
    console.error('調査中にエラーが発生しました:', error);
  }
}

checkSupabaseStatus().catch(console.error);