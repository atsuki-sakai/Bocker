import { LineMessage, LineMessageOptions } from '../types'
import type { Message } from '@line/bot-sdk'
/**
 * LINEメッセージリポジトリのインターフェース
 * 外部のLINE APIとのやり取りを抽象化する
 */
export interface MessageRepository {
  /**
   * LINEメッセージを送信する
   * @param message 送信するメッセージエンティティ
   * @param options メッセージ送信時のオプション
   * @returns 送信結果
   */
  sendMessage(message: LineMessage, options: LineMessageOptions): Promise<boolean>
  sendFlexMessage(
    lineId: string,
    messages: Message[],
    options: LineMessageOptions
  ): Promise<boolean>
}
