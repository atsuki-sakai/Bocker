/**
 * LINEメッセージのエンティティ
 */
export interface LineMessage {
  /**
   * 送信先のLINEユーザーID
   */
  lineId: string

  /**
   * 送信するメッセージ内容
   */
  message: string
}

/**
 * LINEメッセージ送信時の設定
 */
export interface LineMessageOptions {
  /**
   * LINEチャネルアクセストークン
   */
  accessToken: string
}
