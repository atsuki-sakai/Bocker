import SignUpForm from "./SignUpForm";
import { Suspense } from 'react'
import { Loading } from '@/components/common'

export default function SignUpPage() {
  return (
    <Suspense fallback={<Loading />}>
      <SignUpForm />
    </Suspense>
  )
}
