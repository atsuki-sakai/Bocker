import { useParams } from 'next/navigation'

export default function ProfilePage() {
  const { customer_id } = useParams()

  console.log(customer_id)

  return <div>ProfilePage: {customer_id}</div>
}
