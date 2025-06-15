'use client'

import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6 },
  },
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

type TranslationType = {
  title: string
  lastUpdated: string
  sections: Array<{
    title: string
    content: string
  }>
}

export function PrivacyPageClient({ translations }: { translations: TranslationType }) {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <section className="py-12 md:py-20 border-b">
        <div className="  container w-full mx-auto px-4 md:px8 ">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeIn}
            className="text-center space-y-4 max-w-3xl mx-auto"
          >
            <h1 className="text-2xl md:text-3xl font-bold">{translations.title}</h1>
          </motion.div>
        </div>
      </section>

      {/* Content */}
      <section className="py-12 md:py-20">
        <div className=" container w-full mx-auto px-4">
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="max-w-4xl mx-auto"
          >
            <Card>
              <CardContent className="p-8 md:p-12">
                {translations.sections.map((section, index) => (
                  <motion.div key={index} variants={fadeIn} className="mb-8">
                    <h2 className="text-2xl font-bold mb-4">{section.title}</h2>
                    <div className="prose prose-gray dark:prose-invert max-w-none">
                      <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                        {section.content}
                      </p>
                    </div>
                    {index < translations.sections.length - 1 && <Separator className="mt-8" />}
                  </motion.div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
