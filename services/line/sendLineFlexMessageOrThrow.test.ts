import type { Message } from '@line/bot-sdk'
import { describe, expect, it, vi } from 'vitest'
import { sendLineFlexMessageOrThrow } from './sendLineFlexMessageOrThrow'

describe('sendLineFlexMessageOrThrow', () => {
  const messages: Message[] = [{ type: 'text', text: '予約通知' }]

  it('指定された送信先とテナントアクセストークンを利用する', async () => {
    const sender = {
      sendFlexMessage: vi.fn().mockResolvedValue({ success: true, message: 'ok' }),
    }

    await sendLineFlexMessageOrThrow(
      {
        lineId: 'tenant-line-user-id',
        accessToken: 'tenant-channel-access-token',
        messages,
      },
      sender
    )

    expect(sender.sendFlexMessage).toHaveBeenCalledWith(
      'tenant-line-user-id',
      messages,
      'tenant-channel-access-token'
    )
  })

  it('LINE APIの失敗結果を例外として扱う', async () => {
    const sender = {
      sendFlexMessage: vi.fn().mockResolvedValue({
        success: false,
        message: 'LINE API rejected the request',
      }),
    }

    await expect(
      sendLineFlexMessageOrThrow(
        {
          lineId: 'tenant-line-user-id',
          accessToken: 'tenant-channel-access-token',
          messages,
        },
        sender
      )
    ).rejects.toThrow('LINE API rejected the request')
  })

  it('テナントアクセストークンがない場合は送信しない', async () => {
    const sender = {
      sendFlexMessage: vi.fn().mockResolvedValue({ success: true, message: 'ok' }),
    }

    await expect(
      sendLineFlexMessageOrThrow(
        {
          lineId: 'tenant-line-user-id',
          accessToken: undefined,
          messages,
        },
        sender
      )
    ).rejects.toThrow('LINEチャネルアクセストークンが設定されていません')
    expect(sender.sendFlexMessage).not.toHaveBeenCalled()
  })
})
