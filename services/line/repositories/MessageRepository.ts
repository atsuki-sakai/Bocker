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
  /**
   * LINEメッセージを送信する
   * @param line_id 送信先のLINEユーザーID
   * @param messages 送信するメッセージ内容
   * @param options メッセージ送信時のオプション
   * @returns 送信結果
   */
  sendFlexMessage(
    line_id: string,
    messages: Message[],
    options: LineMessageOptions
  ): Promise<boolean>
}
