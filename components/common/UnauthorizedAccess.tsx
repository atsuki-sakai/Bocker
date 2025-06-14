'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ShieldX, Home } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'

interface UnauthorizedAccessProps {
  title?: string
  description?: string
  showHomeButton?: boolean
}

/**
 * アクセス権限がない場合に表示するエラーコンポーネント
 */
export function UnauthorizedAccess({
  title,
  description,
  showHomeButton = true,
}: UnauthorizedAccessProps) {
  const router = useRouter()
  const t = useTranslations('common.unauthorized')
  
  const displayTitle = title || t('title')
  const displayDescription = description || t('description')

  const handleGoToDashboard = () => {
    router.push('/dashboard')
  }

  return (
    <div className="h-full bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto my-12 bg-background border-destructive">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-destructive rounded-full flex items-center justify-center">
            <ShieldX className="w-8 h-8 text-background" />
          </div>
          <CardTitle className="text-xl font-semibold text-destructive">{displayTitle}</CardTitle>
          <CardDescription className="text-destructive mt-2">{displayDescription}</CardDescription>
        </CardHeader>

        {showHomeButton && (
          <CardContent className="text-center">
            <Button onClick={handleGoToDashboard} className="w-full" variant="default">
              <Home className="w-4 h-4 mr-2" />
              {t('backToDashboard')}
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  )
}
