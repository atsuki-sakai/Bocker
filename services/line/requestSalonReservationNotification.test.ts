import { describe, expect, it, vi } from 'vitest'
import { requestSalonReservationNotification } from './requestSalonReservationNotification'

describe('requestSalonReservationNotification', () => {
  const request = {
    tenantId: 'tenant-id',
    organizationId: 'organization-id',
    reservationId: 'reservation-id',
  }

  it('通知成功レスポンスを受け付ける', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )

    await expect(requestSalonReservationNotification(request, fetcher)).resolves.toBeUndefined()
    expect(fetcher).toHaveBeenCalledWith(
      '/api/line/salon-notification',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(request),
      })
    )
  })

  it('HTTPエラーの詳細を例外として扱う', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: 'Failed', details: 'LINE API error' }), {
        status: 500,
      })
    )

    await expect(requestSalonReservationNotification(request, fetcher)).rejects.toThrow(
      'LINE API error'
    )
  })

  it('HTTP 200でもsuccessがtrueでなければ失敗として扱う', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ success: false, error: 'Not sent' }), { status: 200 })
      )

    await expect(requestSalonReservationNotification(request, fetcher)).rejects.toThrow('Not sent')
  })
})
