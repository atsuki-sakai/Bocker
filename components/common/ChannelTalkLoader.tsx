// components/common/ChannelTalkLoader.tsx
'use client'

import Script from 'next/script'
import { useEffect } from 'react'

// グローバルな型定義が global.d.ts にあることを想定
// もし global.d.ts がまだない場合は作成してください。
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ChannelIO?: (command: string, options?: any) => void
    ChannelIOInitialized?: boolean
  }
}

export function ChannelTalkLoader() {
  const bootChannelTalk = () => {
    const pluginKey = process.env.NEXT_PUBLIC_CHANNEL_TALK_PLUGIN_KEY
    console.log('Attempting to boot Channel Talk with pluginKey:', pluginKey) // デバッグログ追加
    if (window.ChannelIO && pluginKey) {
      // pluginKeyの存在も確認
      window.ChannelIO('boot', {
        pluginKey: pluginKey,
      })
      console.log('Channel Talk boot command called.') // デバッグログ追加
    } else {
      if (!window.ChannelIO) {
        console.error('ChannelIO global object not found.')
      }
      if (!pluginKey) {
        console.error('NEXT_PUBLIC_CHANNEL_TALK_PLUGIN_KEY is not set or undefined.')
      }
    }
  }

  useEffect(() => {
    if (window.ChannelIOInitialized) {
      console.log('Channel Talk already initialized, attempting to boot again just in case.') // デバッグログ追加
      bootChannelTalk()
    }
  }, [])

  return (
    <Script
      id="channelTalk"
      src="https://cdn.channel.io/plugin/ch-plugin-web.js"
      strategy="afterInteractive"
      onLoad={() => {
        console.log('Channel Talk script successfully loaded via <Script onLoad>.')
        const interval = setInterval(() => {
          if (window.ChannelIO) {
            bootChannelTalk()
            window.ChannelIOInitialized = true
            clearInterval(interval)
          }
        }, 500)
      }}
      onError={(e) => {
        console.error('Failed to load Channel Talk script via <Script onError>:', e)
      }}
    />
  )
}
