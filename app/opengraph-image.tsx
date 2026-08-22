import { createBockerOgImage } from '@/lib/bockerOgImage'

export const runtime = 'edge'
export const alt = 'Bocker - 美容サロン向け次世代予約管理システム'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return createBockerOgImage('ja')
}
