import { useContext } from 'react'
import { LiffContext } from '@/components/providers/LiffProvider'

export const useLiff = () => {
  const context = useContext(LiffContext)
  if (!context) {
    // LINE APIが設定されていない場合のデフォルト値を返す
    return {
      liff: null,
      isLoggedIn: false,
      isLoading: false,
      isInitialized: false,
      isError: false,
      errorMessage: null,
      profile: null,
    }
  }
  return context
}
