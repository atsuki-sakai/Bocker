'use client';
import { useParams } from 'next/navigation';
import { Id } from '@/convex/_generated/dataModel';
import { api } from '@/convex/_generated/api'
import { useQuery } from 'convex/react'
import { z } from 'zod'

export default function CustomerEditForm() {
  const params = useParams();
  const customerId = params.customer_id as Id<'customer'>;

  const customer = useQuery(api.customer.core.query.getById, customerId ? { customerId } : 'skip')

  return (
    <div>
      <h1>CustomerEditForm: {customerId}</h1>
    </div>
  );
}
