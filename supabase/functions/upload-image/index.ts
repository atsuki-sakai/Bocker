/// <reference types="jsr:@supabase/functions-js/edge-runtime.d.ts" />
// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '');

Deno.serve(async (req: Request)=>{
  const formData = await req.formData();
  const file = formData.get('file') as File;

  if (!file) {
    return new Response(JSON.stringify({ error: 'File not provided' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // TODO: update your-bucket to the bucket you want to write files
  const filePath = `${file.name}-${new Date().getTime()}`;
  
  const { data, error } = await supabase.storage.from('your-bucket').upload(filePath, file, {
    contentType: file.type,
    cacheControl: '3600', // オプション: キャッシュ設定
    upsert: false // オプション: 同名ファイルが存在する場合の挙動
  });

  if (error) {
    console.error('Storage error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({
    data 
  }), {
    headers: {
      'Content-Type': 'application/json'
    }
  });
});
