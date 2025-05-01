'use client'

import { CreditCard, Banknote, Smartphone } from 'lucide-react'

type PaymentViewProps = {
  selectedPaymentMethod: 'credit' | 'cash' | 'line_pay' | 'paypay' | null
  onChangePaymentMethodAction: (method: 'credit' | 'cash' | 'line_pay' | 'paypay') => void
}

export const PaymentView = ({ selectedPaymentMethod, onChangePaymentMethodAction }: PaymentViewProps) => {
  return (
    <div>
      <h2 className="text-xl">お支払い方法を選択</h2>
      <p className="text-gray-600 mb-4">
        ご希望のお支払い方法を選択してください。
      </p>
      
      <div className="space-y-3">
        <div 
          className={`flex items-center justify-between border rounded-lg p-4 cursor-pointer ${selectedPaymentMethod === 'credit' ? 'border-blue-500 bg-blue-50' : ''}`}
          onClick={() => onChangePaymentMethodAction('credit')}
        >
          <div className="flex items-center gap-3">
            <CreditCard className="h-6 w-6 text-blue-600" />
            <div>
              <p className="font-medium">クレジットカード</p>
              <p className="text-sm text-gray-500">VISA, Mastercard, JCB, AMEX</p>
            </div>
          </div>
          <div className="w-6 h-6 rounded-full border border-gray-300 flex items-center justify-center">
            {selectedPaymentMethod === 'credit' && <div className="w-4 h-4 rounded-full bg-blue-600"></div>}
          </div>
        </div>
        
        <div 
          className={`flex items-center justify-between border rounded-lg p-4 cursor-pointer ${selectedPaymentMethod === 'cash' ? 'border-blue-500 bg-blue-50' : ''}`}
          onClick={() => onChangePaymentMethodAction('cash')}
        >
          <div className="flex items-center gap-3">
            <Banknote className="h-6 w-6 text-green-600" />
            <div>
              <p className="font-medium">現金</p>
              <p className="text-sm text-gray-500">店舗でのお支払い</p>
            </div>
          </div>
          <div className="w-6 h-6 rounded-full border border-gray-300 flex items-center justify-center">
            {selectedPaymentMethod === 'cash' && <div className="w-4 h-4 rounded-full bg-blue-600"></div>}
          </div>
        </div>
        
        <div 
          className={`flex items-center justify-between border rounded-lg p-4 cursor-pointer ${selectedPaymentMethod === 'line_pay' ? 'border-blue-500 bg-blue-50' : ''}`}
          onClick={() => onChangePaymentMethodAction('line_pay')}
        >
          <div className="flex items-center gap-3">
            <Smartphone className="h-6 w-6 text-green-600" />
            <div>
              <p className="font-medium">LINE Pay</p>
              <p className="text-sm text-gray-500">LINEアプリでのお支払い</p>
            </div>
          </div>
          <div className="w-6 h-6 rounded-full border border-gray-300 flex items-center justify-center">
            {selectedPaymentMethod === 'line_pay' && <div className="w-4 h-4 rounded-full bg-blue-600"></div>}
          </div>
        </div>
      </div>
    </div>
  )
}