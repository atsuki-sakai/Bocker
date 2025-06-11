import { useParams } from 'next/navigation'

export default function HistoryPage() {
  const { customer_id } = useParams()

  console.log(customer_id)

  return <div>HistoryPage: {customer_id}</div>
}
