import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ScenarioCardProps {
    scenarioItems: {
        title: string
        description: string
        helpText: string
    }[]
}
export default function ScenarioCard({ scenarioItems }: ScenarioCardProps) {
    return (
        <Card>
        <CardHeader>
          <CardTitle>典型的な利用シナリオ</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
           {
            scenarioItems.map((item, index) => (
                <div key={index} className="p-4 bg-muted rounded-lg">
                <h4 className="font-semibold text-foreground mb-2">{item.title}</h4>
                <p className="text-xs md:text-sm text-muted-foreground mb-3">
                  {item.description}
                </p>
                <div className="bg-link p-2 rounded-lg text-xs text-link-foreground">
                  {item.helpText}
                </div>
              </div>
            ))
           }
          </div>
        </CardContent>
      </Card>
    )
}