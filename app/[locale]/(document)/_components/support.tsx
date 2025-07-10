import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

export default function Support() {
  return (
    <Card className="bg-link border-border">
      <CardHeader>
        <CardTitle className="text-link-foreground font-semibold">サポート情報</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-semibold text-link-foreground">技術サポート</h4>
            <Link
              href="mailto:support@bocker.jp"
              className="underline text-xs md:text-sm text-link-foreground"
            >
              support@bocker.jp
            </Link>
            <p className="text-xs md:text-sm text-link-foreground mt-1">
              営業時間: 平日 10:00-18:00
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-link-foreground">ヘルプセンター</h4>
            <Link
              href="https://help.bocker.jp/ja/contact"
              className="underline text-xs md:text-sm text-link-foreground"
            >
              https://help.bocker.jp/ja/contact
            </Link>
            <p className="text-xs md:text-sm text-link-foreground mt-1">よくある質問も掲載</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}