interface ReservationEmailProps {
  customerName: string
  salonName: string
  staffName: string
  reservationDate: string // 例: "2024年7月30日(火)"
  reservationTime: string // 例: "10:00 〜 11:00"
  menus: string[] // メニュー名の配列
  totalPrice: number
  reservationId: string
  pinCode?: string
  salonAddress: string
  salonPhone: string
}

interface EmailContent {
  subject: string
  text: string
  html: string
}

export const generateReservationEmail = (props: ReservationEmailProps): EmailContent => {
  const {
    customerName,
    salonName,
    staffName,
    reservationDate,
    reservationTime,
    menus,
    totalPrice,
    reservationId,
    pinCode,
    salonAddress,
    salonPhone,
  } = props

  const subject = `【${salonName}】ご予約内容の確認`

  const textContent = `
  ${customerName} 様
  
  この度は「${salonName}」にご予約いただき、誠にありがとうございます。
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
  ${pinCode ? `ポイント利用PINコード: ${pinCode}` : ''}
  
  --------------------------------
  店舗情報
  --------------------------------
  店舗名: ${salonName}
  住所: ${salonAddress}
  電話番号: ${salonPhone}
  
  --------------------------------
  ご予約に関する注意事項
  --------------------------------
  ・予約時間の10分前にはご来店ください。
  ・キャンセルは予約日の2日前までにご連絡ください。
  
  ご不明な点がございましたら、お電話にてお問い合わせください。
  ${salonName}
  電話: ${salonPhone}
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
        <h1>${salonName}</h1>
        <p>ご予約の確認</p>
      </div>
      <div class="content">
        <p>${customerName} 様</p>
        <p>この度は「${salonName}」にご予約いただき、誠にありがとうございます。<br>以下の内容でご予約を承りました。</p>
  
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
          ${pinCode ? `<p><span class="section-title">PINコード:</span><span class="section-content">${pinCode}</span></p>` : ''}
        </div>
  
        <div class="section">
          <h2>店舗情報</h2>
          <p><span class="section-title">店舗名:</span><span class="section-content">${salonName}</span></p>
          <p><span class="section-title">住所:</span><span class="section-content">${salonAddress}</span></p>
          <p><span class="section-title">電話番号:</span><span class="section-content">${salonPhone}</span></p>
        </div>
  
        <div class="notes">
          <strong>ご予約に関する注意事項</strong><br>
          ・予約時間の10分前にはご来店ください。<br>
          ・キャンセルは予約日の2日前までにご連絡ください。
        </div>
  
        <p>ご不明な点がございましたら、お電話にてお問い合わせください。</p>
      </div>
      <div class="footer">
        <p>${salonName}<br>電話: ${salonPhone}</p>
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
