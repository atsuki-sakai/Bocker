import Link from 'next/link'
import { Button } from '@/components/ui/button'
import Image from 'next/image'
export default function MaintenancePage() {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-background px-4">
      <Image src="/assets/images/logo-darkgreen.png" alt="maintenance" width={150} height={150} />
      <h1 className="text-2xl md:text-3xl font-bold text-center">現在メンテナンス中です。</h1>
      <p className="text-center my-3 text-sm font-bold leading-4">
        <span className="block text-active text-lg md:text-2xl py-">
          {new Date().toLocaleDateString('ja-JP', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
          })}
          の午前1時から午前5時
        </span>
        <p className="text-center my-3 text-sm font-bold leading-4">
          迄の間にシステムのメンテナンスを実施させていただいております。
        </p>
      </p>
      <p className="text-sm text-muted-foreground text-center">
        ご迷惑をお掛けしておりますが、しばらく経ってから再度お試しください。
      </p>
      <div className="mt-12">
        <Link href="/">
          <Button>トップページに戻る</Button>
        </Link>
      </div>
    </div>
  )
}
