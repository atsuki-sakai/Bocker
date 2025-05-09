import { messagingApi } from '@line/bot-sdk'
import { LineMessage, LineMessageOptions } from '../types'
import { MessageRepository } from './MessageRepository'
import type { Message } from '@line/bot-sdk'

const { MessagingApiClient } = messagingApi
// messagingApi.modelからMessageをインポート

/**
 * LINE APIを使用したメッセージリポジトリの実装
 */
export class LineMessageRepository implements MessageRepository {
  /**
   * LINEメッセージを送信する
   * @param message 送信するメッセージエンティティ
   * @param options メッセージ送信時のオプション
   * @returns 送信結果
   */
  async sendMessage(message: LineMessage, options: LineMessageOptions): Promise<boolean> {
    try {
      // LINE Messaging APIクライアントの初期化
      const client = new MessagingApiClient({
        channelAccessToken: options.accessToken,
      })

      // メッセージの送信
      console.log('Sending pushMessage to:', message.lineId, 'with message:', message.message)
      const response = await client.pushMessage({
        to: message.lineId,
        messages: [
          {
            type: 'text',
            text: message.message,
          },
        ],
      })
      console.log('pushMessage response:', response)

      return true
    } catch (error) {
      console.error('Error in LineMessageRepository.sendMessage:', error)
      throw error
    }
  }

  async sendFlexMessage(
    lineId: string,
    messages: Message[],
    options: LineMessageOptions
  ): Promise<boolean> {
    try {
      // LINE Messaging APIクライアントの初期化
      const client = new MessagingApiClient({
        channelAccessToken: options.accessToken,
      })

      const response = await client.pushMessage({
        to: lineId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        messages: messages as any,
      })
      console.log('pushMessage response:', response)

      return true
    } catch (error) {
      console.error('Error in LineMessageRepository.sendMessage:', error)
      throw error
    }
  }
}
