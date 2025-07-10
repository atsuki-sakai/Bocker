import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'


interface FaqCardProps {
  title: string
  faqs: {
    question: string
    answer: string
  }[]
}
export default function FaqCard({ title, faqs }: FaqCardProps) {
  return (
    <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
          {
            faqs.map((faq, index) => (
              <div key={index}>
                <h4 className="font-semibold text-foreground">{faq.question}</h4>
                <p className="text-xs md:text-sm text-muted-foreground mt-1">{faq.answer}</p>
              </div>
            ))
          }
          </div>
        </CardContent>
      </Card>
  )
}
