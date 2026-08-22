interface SalonReservationNotificationRequest {
  tenantId: string
  organizationId: string
  reservationId: string
}

type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

export const requestSalonReservationNotification = async (
  request: SalonReservationNotificationRequest,
  fetcher: Fetcher = fetch
): Promise<void> => {
  const response = await fetcher('/api/line/salon-notification', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })

  const responseText = await response.text()
  let responseBody: { success?: boolean; error?: string; details?: string; message?: string } = {}

  if (responseText) {
    try {
      responseBody = JSON.parse(responseText)
    } catch {
      responseBody = { details: responseText }
    }
  }

  if (!response.ok || responseBody.success !== true) {
    const message =
      responseBody.details ||
      responseBody.error ||
      responseBody.message ||
      `サロンLINE通知APIがエラーを返しました (${response.status})`
    throw new Error(message)
  }
}
