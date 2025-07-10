import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle } from 'lucide-react'

interface ErrorWarningInfoCardProps {
    mainTitle?: string
    errorItems: {
        title: string
        description: string
    }[],
    warningItems: {
        title: string
    }[]
}
export default function ErrorWarningInfoCard({ mainTitle = "エラー・注意事項" , errorItems, warningItems }: ErrorWarningInfoCardProps) {
    return (
        <Card>
        <CardHeader>
          <CardTitle>{mainTitle}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            {
                errorItems.length > 0 && (
                    <div>
                        <h4 className="font-semibold mb-3">よくあるエラーと対処法</h4>
                        <div className="space-y-3">
                            {
                                errorItems.map((item, index) => (
                                    <div key={index} className="p-3 bg-destructive-foreground rounded-lg">
                                        <p className="font-semibold text-destructive text-xs md:text-sm">{item.title}</p>
                                        <p className="text-destructive text-xs md:text-sm mt-1">
                                        {item.description}
                                        </p>
                                    </div>
                                ))
                            }
                        </div>
                    </div>
                )
            }
            {
                warningItems.length > 0 && (
                    <div>
                        <h4 className="font-semibold mb-3">操作時の注意点</h4>
                        <div className="space-y-3">
                            {
                                warningItems.map((item, index) => (
                                    <div key={index} className="flex items-start space-x-2">
                                        <CheckCircle className="h-4 w-4 text-success flex-shrink-0" />
                                        <p className="text-xs md:text-sm text-muted-foreground">{item.title}</p>
                                    </div>
                                ))
                            }
                        </div>
                    </div>
                )
            }
           
          </div>
        </CardContent>
      </Card>
    )
}