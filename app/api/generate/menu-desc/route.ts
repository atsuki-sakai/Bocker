import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// 美容サロンメニュー情報の型定義
interface MenuRequest {
  product_name: string; // 商品名（施術名）
  duration: string; // 施術時間
  price: string; // 価格
  features: string; // 主な特徴・サービス内容
  effects: string; // 期待できる効果
  recommended_for: string; // おすすめの人・シーン
}

// レスポンスの型定義
interface MenuResponse {
  success: boolean;
  description?: string;
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<MenuResponse>> {
  try {
    // リクエストボディの取得とバリデーション
    const body: MenuRequest = await request.json();
    
    // 必須フィールドの検証
    const requiredFields: (keyof MenuRequest)[] = [
      'product_name',
      'duration', 
      'price',
      'features',
      'effects',
      'recommended_for'
    ];

    for (const field of requiredFields) {
      if (!body[field] || typeof body[field] !== 'string' || body[field].trim() === '') {
        return NextResponse.json(
          { 
            success: false, 
            error: `必須フィールド「${field}」が入力されていません。` 
          },
          { status: 400 }
        );
      }
    }

    // Gemini API キーの確認
    const apiKey = process.env.GCP_AI_STUDIO_API_KEY;
    if (!apiKey) {
      console.error('GCP_AI_STUDIO_API_KEY environment variable is not set');
      return NextResponse.json(
        { 
          success: false, 
          error: 'サーバー設定エラーが発生しました。' 
        },
        { status: 500 }
      );
    }

    // Google GenerativeAI の初期化
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // モデルの設定
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash',
      generationConfig: {
        responseMimeType: 'text/plain',
        maxOutputTokens: 1024, // 出力制限
        temperature: 0.7, // 創造性のバランス
      }
    });

    // プロンプトに入力情報を埋め込む
    const inputText = `以下の情報から美容サロンの施術メニュー紹介文（300文字以内、です・ます調）を作成してください。

商品名: ${body.product_name}
施術時間: ${body.duration}
価格: ${body.price}
特徴: ${body.features}
効果: ${body.effects}
おすすめの人: ${body.recommended_for}

すべての要素を自然な日本語で盛り込み、最後に予約を促す一言を入れてください。`;

    // 会話履歴の構築
    const contents = [
      {
        role: 'user',
        parts: [
          {
            text: `あなたは美容サロンのプロフェッショナルなコピーライターです。
以下の情報をもとに、**お客様が思わず予約したくなるような魅力的な施術メニュー説明文（200～300文字程度）**を日本語で作成してください。

【入力情報例】

商品名（施術名）: {{product_name}}

施術時間: {{duration}}

価格: {{price}}

主な特徴・サービス内容: {{features}}

期待できる効果: {{effects}}

おすすめの人・シーン: {{recommended_for}}

【出力ルール】

すべての情報を自然な流れで織り交ぜてください。

施術のメリットやサロンならではの特徴を強調してください。

予約や体験を後押しする一言で締めくくってください。

「～です・ます」調で統一し、丁寧かつ温かみのあるトーンにしてください。

【プロンプト例】

「以下の情報をもとに、美容サロンの施術メニュー紹介文を300文字以内で作成してください。

商品名（施術名）: {{product_name}}

施術時間: {{duration}}

価格: {{price}}

特徴: {{features}}

効果: {{effects}}

おすすめの人: {{recommended_for}}

上記すべての要素を含めて、お客様が魅力を感じるようにわかりやすく、日本語で説明してください。最後に『ぜひ一度お試しください』など予約を促す一文を入れてください。」

【具体例（プロンプトの実用例）】
「以下の情報から美容サロンの施術メニュー紹介文（300文字以内、です・ます調）を作成してください。

商品名: 『極上ヘッドスパ』

施術時間: 60分

価格: 6,600円

特徴: 頭皮のコリを丁寧にほぐし、リラクゼーション効果抜群

効果: 髪や頭皮が健康になり、ストレス解消にも最適

おすすめの人: 日々の疲れが溜まっている方、リフレッシュしたい方

すべての要素を自然な日本語で盛り込み、最後に予約を促す一言を入れてください。」

`,
          },
        ],
      },
      {
        role: 'model',
        parts: [
          {
            text: `商品名（施術名）:  エイジングケア集中トリートメント「リバイタライズ」

施術時間: 90分

価格: 12,000円

主な特徴・サービス内容:  厳選されたオーガニック成分配合の薬剤を使用し、頭皮から毛先まで丁寧にケアする贅沢なトリートメントです。ダメージを修復し、ハリ・コシのある美しい髪へと導きます。施術には、頭皮の血行促進を促すヘッドマッサージも含まれており、心身のリラックス効果も期待できます。

期待できる効果:  乾燥やダメージによるパサつき、枝毛、切れ毛の改善。ハリ・コシ、ツヤのある健康的な髪へ。頭皮環境の改善による、抜け毛や薄毛の予防。リラックス効果によるストレス軽減。

おすすめの人・シーン:  年齢と共に髪のパサつきやハリ不足を感じている方、特別な日に美しい髪でいたい方、日頃の疲れを癒したい方におすすめです。大切なイベントの前や、ご褒美としてのご利用にも最適です。


年齢を重ねるごとに気になる髪の悩み…。「リバイタライズ」は、そんなお悩みに寄り添い、本来の美しさを引き出すためのエイジングケア集中トリートメントです。90分の贅沢な時間の中で、頭皮と髪への深い潤いと、至福のリラックスをご堪能ください。12,000円という価格以上の価値を感じていただける自信があります。  ぜひ、この機会に「リバイタライズ」で、輝く髪と心を取り戻してみませんか？ご予約をお待ちしております。
`,
          },
        ],
      },
      {
        role: 'user',
        parts: [
          {
            text: inputText,
          },
        ],
      },
    ];

    // Gemini AIへのリクエスト実行
    const result = await model.generateContent({
      contents,
    });

    // レスポンスの取得と検証
    const response = result.response;
    const description = response.text();

    if (!description) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'メニュー説明文の生成に失敗しました。' 
        },
        { status: 500 }
      );
    }

    // 成功レスポンスを返す
    return NextResponse.json(
      { 
        success: true, 
        description: description.trim() 
      },
      { status: 200 }
    );

  } catch (error) {
    // エラーログの出力（本番環境では適切なログシステムを使用）
    console.error('Menu description generation error:', error);
    
    // エラーレスポンスを返す
    return NextResponse.json(
      { 
        success: false, 
        error: 'サーバーエラーが発生しました。しばらく時間をおいて再度お試しください。' 
      },
      { status: 500 }
    );
  }
}

// OPTIONSメソッドの対応（CORS対応）
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}