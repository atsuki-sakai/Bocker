'use client'

import { CreditCard, Banknote } from 'lucide-react'
import { Doc } from '@/convex/_generated/dataModel'
type PaymentViewProps = {
  selectedMenus: Doc<'menu'>[]
  selectedPaymentMethod: 'credit' | 'cash' | 'line_pay' | 'paypay' | null
  onChangePaymentMethodAction: (method: 'credit' | 'cash' | 'line_pay' | 'paypay') => void
}

export const PaymentView = ({
  selectedMenus,
  selectedPaymentMethod,
  onChangePaymentMethodAction,
}: PaymentViewProps) => {
  const methods = new Set(
    selectedMenus.map((m) =>
      m.paymentMethod === 'credit_card' ? 'credit' : (m.paymentMethod as 'cash' | 'all')
    )
  )

  let displayMode: 'cash' | 'credit' | 'all' = 'all'
  if (methods.has('cash')) {
    displayMode = 'cash'
  } else if (methods.has('credit')) {
    displayMode = 'credit'
  }

  return (
    <div>
      <h2 className="text-xl">お支払い方法を選択</h2>
      <p className="text-muted-foreground mb-4">ご希望のお支払い方法を選択してください。</p>

      <div className="space-y-3">
        {(displayMode === 'cash' || displayMode === 'all') && (
          <div
            className={`flex items-center justify-between border rounded-lg p-4 cursor-pointer ${selectedPaymentMethod === 'cash' ? 'border-neon-foreground bg-neon' : ''}`}
            onClick={() => onChangePaymentMethodAction('cash')}
          >
            <div className="flex items-center gap-3">
              <Banknote className="h-6 w-6 text-muted-foreground" />
              <div>
                <p className="font-medium">現金</p>
                <p className="text-sm text-muted-foreground">店舗でのお支払い</p>
              </div>
            </div>
            <div className="w-6 h-6 rounded-full border border-border flex items-center justify-center">
              {selectedPaymentMethod === 'cash' && (
                <div className="w-4 h-4 rounded-full bg-active"></div>
              )}
            </div>
          </div>
        )}

        {(displayMode === 'credit' || displayMode === 'all') && (
          <div
            className={`flex items-center justify-between border rounded-lg p-4 cursor-pointer ${selectedPaymentMethod === 'credit' ? 'border-neon bg-neon-foreground' : ''}`}
            onClick={() => onChangePaymentMethodAction('credit')}
          >
            <div className="flex items-center gap-3">
              <CreditCard className="h-6 w-6 text-muted-foreground" />
              <div>
                <p className="font-medium">クレジットカード</p>
                <p className="text-sm text-muted-foreground">VISA, Mastercard, JCB, AMEX</p>
              </div>
            </div>
            <div className="w-6 h-6 rounded-full border border-border flex items-center justify-center">
              {selectedPaymentMethod === 'credit' && (
                <div className="w-4 h-4 rounded-full bg-active"></div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}