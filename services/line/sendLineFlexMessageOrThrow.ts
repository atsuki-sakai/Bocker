import type { Message } from '@line/bot-sdk'
import { LineService } from './LineService'

interface LineFlexMessageSender {
  sendFlexMessage(
    lineId: string,
    messages: Message[],
    accessToken: string
  ): Promise<{ success: boolean; message: string }>
}

interface SendLineFlexMessageParams {
  lineId: string | null | undefined
  accessToken: string | null | undefined
  messages: Message[]
}

export const sendLineFlexMessageOrThrow = async (
  { lineId, accessToken, messages }: SendLineFlexMessageParams,
  sender: LineFlexMessageSender = new LineService()
): Promise<void> => {
  if (!lineId) {
    throw new Error('LINE送信先IDが設定されていません')
  }

  if (!accessToken) {
    throw new Error('LINEチャネルアクセストークンが設定されていません')
  }

  const result = await sender.sendFlexMessage(lineId, messages, accessToken)

  if (!result.success) {
    throw new Error(result.message || 'LINEメッセージの送信に失敗しました')
  }
}
