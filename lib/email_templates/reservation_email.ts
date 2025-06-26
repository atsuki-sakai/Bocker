interface ReservationEmailProps {
  orgName: string;
  orgAddress: string;
  orgPhone: string;
  customerName: string
  staffName: string
  reservationDate: string // 例: "2024年7月30日(火)"
  reservationTime: string // 例: "10:00 〜 11:00"
  menus: string[] // メニュー名の配列
  totalPrice: number
  reservationId: string
  pinCode?: string
}

interface EmailContent {
  subject: string
  text: string
  html: string
}

import { Resend } from 'resend';
import { getEnv } from '@/lib/env-config'

const resend = new Resend(getEnv('RESEND_API_KEY'));

interface SendReservationConfirmationEmailProps {
  to: string;
  orgName: string;
  orgAddress: string;
  orgPhone: string;
  customerName: string;
  reservationDate: string;
  reservationTime: string;
  staffName: string;
  menus: Array<{ name: string; price: number; quantity: number }>;
  options: Array<{ name: string; price: number; quantity: number }>;
  totalPrice: number;
  paymentMethod: 'cash' | 'credit_card';
}

interface SendReservationCancellationEmailProps {
  to: string;
  orgName: string;
  orgAddress: string;
  orgPhone: string;
  customerName: string;
  reservationDate: string;
  reservationTime: string;
  staffName: string;    
  refundAmount?: number;
  refundMethod?: 'points' | 'credit_card';
}

export async function sendReservationCancellationEmail(props: SendReservationCancellationEmailProps) {
  const { 
    to, 
    orgName,
    customerName, 
    reservationDate, 
    reservationTime, 
    staffName, 
    refundAmount,
    refundMethod 
  } = props;

  const subject = `【${orgName}】予約キャンセルのお知らせ`;
  
  const textContent = `
${customerName} 様

以下のご予約がキャンセルされました。

--------------------------------
キャンセル内容
--------------------------------
サロン名: ${orgName}
予約日時: ${reservationDate} ${reservationTime}
担当スタッフ: ${staffName}

${refundAmount && refundMethod === 'points' 
  ? `${refundAmount}ポイントがお客様のアカウントに返還されました。` 
  : refundAmount && refundMethod === 'credit_card'
  ? `¥${refundAmount.toLocaleString()}が、ご利用のクレジットカードに返金処理されます。
※ 返金の反映にはカード会社により3-5営業日かかる場合があります。`
  : ''}

ご不明な点がございましたら、サロンまでお問い合わせください。

${orgName}
`;

  const htmlContent = `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
    .container { max-width: 600px; margin: 20px auto; padding: 20px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
    .header { background-color: #ff6b6b; color: #ffffff; padding: 20px; text-align: center; border-top-left-radius: 8px; border-top-right-radius: 8px; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { padding: 20px; }
    .section { margin-bottom: 20px; }
    .section-title { font-weight: bold; color: #8C8C8C; width: 120px; display: inline-block; vertical-align: top; }
    .section-content { display: inline-block; width: calc(100% - 130px); }
    .refund-box { background-color: #fff3cd; border-left: 4px solid #ffeeba; padding: 10px; margin-top: 15px; font-size: 14px; }
    .footer { text-align: center; padding: 15px; font-size: 12px; color: #8C8C8C; border-top: 1px solid #eeeeee; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>予約キャンセルのお知らせ</h1>
    </div>
    <div class="content">
      <p>${customerName} 様</p>
      <p>以下のご予約がキャンセルされました。</p>

      <div class="section">
        <h2 style="color: #ff6b6b; font-size: 18px;">キャンセル内容</h2>
        <p><span class="section-title">サロン名:</span><span class="section-content">${orgName}</span></p>
        <p><span class="section-title">予約日時:</span><span class="section-content">${reservationDate} ${reservationTime}</span></p>
        <p><span class="section-title">担当スタッフ:</span><span class="section-content">${staffName}</span></p>
      </div>

      ${refundAmount ? `
      <div class="refund-box">
        <strong>返金について</strong><br>
        ${refundMethod === 'points' 
          ? `${refundAmount}ポイントがお客様のアカウントに返還されました。`
          : `¥${refundAmount.toLocaleString()}が、ご利用のクレジットカードに返金処理されます。<br>
            <small>※ 返金の反映にはカード会社により3-5営業日かかる場合があります。</small>`
        }
      </div>
      ` : ''}

      <p style="margin-top: 20px;">ご不明な点がございましたら、サロンまでお問い合わせください。</p>
    </div>
    <div class="footer">
      <p>${orgName}</p>
      <p>このメールは自動送信されています。返信はできません。</p>
    </div>
  </div>
</body>
</html>
`;

  try {
    const { data, error } = await resend.emails.send({
      from: 'Bocker <noreply@bocker.jp>',
      to: [to],
      subject,
      text: textContent,
      html: htmlContent,
    });

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Failed to send reservation cancellation email:', error);
    throw error;
  }
}

export async function sendReservationConfirmationEmail(props: SendReservationConfirmationEmailProps) {
  const { 
    orgName,
    orgAddress,
    orgPhone,
    to, 
    customerName, 
    reservationDate, 
    reservationTime, 
    staffName, 
    menus,
    options,
    totalPrice
  } = props;

  const menuItems = [
    ...menus.map(m => `${m.name} x${m.quantity}`),
    ...options.map(o => `${o.name} x${o.quantity}`)
  ];

  const emailContent = generateReservationEmail({
    orgName,
    orgAddress,
    orgPhone,
    customerName,
    staffName,
    reservationDate,
    reservationTime,
    menus: menuItems,
    totalPrice,
    reservationId: new Date().getTime().toString(),
  });

  try {
    const { data, error } = await resend.emails.send({
      from: 'Bocker <noreply@bocker.jp>',
      to: [to],
      subject: emailContent.subject,
      text: emailContent.text,
      html: emailContent.html,
    });

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Failed to send reservation confirmation email:', error);
    throw error;
  }
}

export const generateReservationEmail = (props: ReservationEmailProps): EmailContent => {
  const {
    orgName,
    orgAddress,
    orgPhone,
    customerName,
    staffName,
    reservationDate,
    reservationTime,
    menus,
    totalPrice,
    reservationId
  } = props

  const subject = `【${orgName}】ご予約内容の確認`

  const textContent = `
  ${customerName} 様
  
  この度は「${orgName}」にご予約いただき、誠にありがとうございます。
  以下の内容でご予約を承りました。
  
  --------------------------------
  予約内容
  --------------------------------
  お名前: ${customerName} 様
  日時: ${reservationDate} ${reservationTime}
  メニュー:
  ${menus.map((menu) => `- ${menu}`).join('\n')}
  合計料金: ${totalPrice.toLocaleString()}円
  担当: ${staffName}
  予約番号: ${reservationId}

  --------------------------------
  店舗情報
  --------------------------------
  店舗名: ${orgName}
  住所: ${orgAddress}
  電話番号: ${orgPhone}
  
  --------------------------------
  ご予約に関する注意事項
  --------------------------------
  ・予約時間の10分前にはご来店ください。
  ・キャンセルは予約日の2日前までにご連絡ください。
  
  ご不明な点がございましたら、お電話にてお問い合わせください。
  ${orgName}
  電話: ${orgPhone}
  `

  const htmlContent = `
  <!DOCTYPE html>
  <html lang="ja">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${subject}</title>
    <style>
      body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
      .container { max-width: 600px; margin: 20px auto; padding: 20px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
      .header { background-color: #5dade2; color: #ffffff; padding: 20px; text-align: center; border-top-left-radius: 8px; border-top-right-radius: 8px; }
      .header h1 { margin: 0; font-size: 24px; }
      .header p { margin: 5px 0 0; font-size: 14px; }
      .content { padding: 20px; }
      .content h2 { color: #5dade2; font-size: 20px; border-bottom: 2px solid #5dade2; padding-bottom: 5px; margin-bottom: 15px;}
      .section { margin-bottom: 20px; }
      .section-title { font-weight: bold; color: #8C8C8C; width: 100px; display: inline-block; vertical-align: top; }
      .section-content { display: inline-block; width: calc(100% - 110px); }
      .menu-list { list-style: none; padding-left: 0; }
      .menu-list li::before { content: "- "; }
      .footer { text-align: center; padding: 15px; font-size: 12px; color: #8C8C8C; border-top: 1px solid #eeeeee; margin-top: 20px; }
      .notes { background-color: #fff3cd; border-left: 4px solid #ffeeba; padding: 10px; margin-top: 15px; font-size: 13px; }
      .notes strong { color: #856404; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>${orgName}</h1>
        <p>ご予約の確認</p>
      </div>
      <div class="content">
        <p>${customerName} 様</p>
        <p>この度は「${orgName}」にご予約いただき、誠にありがとうございます。<br>以下の内容でご予約を承りました。</p>
  
        <div class="section">
          <h2>予約内容</h2>
          <p><span class="section-title">お名前:</span><span class="section-content">${customerName} 様</span></p>
          <p><span class="section-title">日時:</span><span class="section-content">${reservationDate} ${reservationTime}</span></p>
          <p><span class="section-title">メニュー:</span><span class="section-content">
            <ul class="menu-list">
              ${menus.map((menu) => `<li>${menu}</li>`).join('')}
            </ul>
          </span></p>
          <p><span class="section-title">合計料金:</span><span class="section-content">${totalPrice.toLocaleString()}円</span></p>
          <p><span class="section-title">担当:</span><span class="section-content">${staffName}</span></p>
          <p><span class="section-title">予約番号:</span><span class="section-content">${reservationId}</span></p>
        </div>
  
        <div class="section">
          <h2>店舗情報</h2>
          <p><span class="section-title">店舗名:</span><span class="section-content">${orgName}</span></p>
          <p><span class="section-title">住所:</span><span class="section-content">${orgAddress}</span></p>
          <p><span class="section-title">電話番号:</span><span class="section-content">${orgPhone}</span></p>
        </div>
  
        <div class="notes">
          <strong>ご予約に関する注意事項</strong><br>
          ・予約時間の10分前にはご来店ください。<br>
          ・キャンセルは予約日の2日前までにご連絡ください。
        </div>
  
        <p>ご不明な点がございましたら、お電話にてお問い合わせください。</p>
      </div>
      <div class="footer">
        <p>${orgName}<br>電話: ${orgPhone}</p>
      </div>
    </div>
  </body>
  </html>
  `

  return {
    subject,
    text: textContent,
    html: htmlContent,
  }
}
