import { NextResponse } from 'next/server'
import { TrackingEventRepository } from '@/services/supabase/repositories/tracking/TrackingEventRepository'
import { z } from 'zod'
import { getOrganizationAuth } from '@/lib/auth/getOrganizationAuth'

const eventSchema = z.object({
  session_id: z.string(),
  event_type: z.enum(['page_view', 'conversion', 'click']),
  page_url: z.string(),
  page_title: z.string().optional(),
  target_element: z.string().optional(),
  conversion_type: z.string().optional(),
  utm_source: z.string().optional(),
  utm_medium: z.string().optional(),
  utm_campaign: z.string().optional(),
  utm_term: z.string().optional(),
  utm_content: z.string().optional(),
  custom_data_json: z.any().optional(),
})

export async function POST(request: Request) {
  try {
    const { tenantId, orgId } = await getOrganizationAuth()
    if (!orgId) {
      return NextResponse.json({ error: 'Organization ID is missing.' }, { status: 400 })
    }

    const body = await request.json()
    const validation = eventSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.formErrors },
        { status: 400 }
      )
    }

    const eventData = validation.data
    const eventRepo = new TrackingEventRepository()

    await eventRepo.createEvent({
      tenant_id: tenantId,
      org_id: orgId,
      session_id: eventData.session_id,
      event_timestamp_unix: Math.floor(Date.now() / 1000),
      event_type: eventData.event_type,
      event_source: 'web',
      page_url: eventData.page_url,
      page_title: eventData.page_title || null,
      target_element: eventData.target_element || null,
      utm_source: eventData.utm_source || null,
      utm_medium: eventData.utm_medium || null,
      utm_campaign: eventData.utm_campaign || null,
      utm_term: eventData.utm_term || null,
      utm_content: eventData.utm_content || null,
      custom_data_json: eventData.custom_data_json || null,
    })

    return NextResponse.json({ success: true }, { status: 202 })
  } catch (error) {
    console.error('Error tracking event:', error)
    // Consider more specific error handling based on the error type
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 })
  }
}
