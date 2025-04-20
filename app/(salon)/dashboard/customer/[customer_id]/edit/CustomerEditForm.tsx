'use client';
import { useParams } from 'next/navigation';
import { Id } from '@/convex/_generated/dataModel';

export default function CustomerEditForm() {
  const params = useParams();
  const customerId = params.customer_id as Id<'customer'>;

  return (
    <div>
      <h1>CustomerEditForm: {customerId}</h1>
    </div>
  );
}
