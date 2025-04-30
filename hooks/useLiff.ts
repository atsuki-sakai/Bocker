import { useContext } from 'react'
import { LiffContext } from '@/components/providers/LiffProvider'

export const useLiff = () => {
  const context = useContext(LiffContext)
  if (!context) {
    throw new Error('useLiff must be used within a LiffProvider')
  }
  return context
}
