'use client'

import { useParams } from 'next/navigation'

export default function ReservationPage() {
  const { customer_id, reservation_id } = useParams()

  console.log(customer_id, reservation_id)

  return (
    <div>
      ReservationPage: {customer_id} {reservation_id}
    </div>
  )
}
