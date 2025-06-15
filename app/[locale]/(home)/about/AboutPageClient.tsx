'use client'

import { Link } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { motion } from 'framer-motion'
import { ChevronRight, Target, Users, Heart, Zap } from 'lucide-react'
import Image from 'next/image'

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
      staggerChildren: 0.2,
    },
  },
}

const scaleIn = {
  hidden: { scale: 0.9, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: { duration: 0.5 },
  },
}

const valueIcons = {
  0: Target,
  1: Heart,
  2: Zap,
}

type TranslationType = {
  title: string
  subtitle: string
  mission: {
    title: string
    description: string
    values: Array<{
      title: string
      description: string
    }>
  }
  team: {
    title: string
    description: string
  }
  achievements: {
    title: string
    items: Array<{
      value: string
      label: string
    }>
  }
  story: {
    title: string
    content: string[]
  }
  cta: {
    title: string
    subtitle: string
    button: string
  }
}

export function AboutPageClient({ translations }: { translations: TranslationType }) {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <section className="py-20 border-b">
        <div className="container mx-auto px-4 md:px-6">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeIn}
            className="text-center space-y-4 max-w-3xl mx-auto"
          >
            <div className="flex flex-col items-center justify-center gap-4">
              <Image src="/assets/images/logo.png" alt="Bocker" width={100} height={100} />
              <h1 className="text-2xl md:text-3xl font-bold">{translations.title}</h1>
              <p className="text-base md:text-lg text-muted-foreground">{translations.subtitle}</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Mission & Values */}
      <section className="py-20">
        <div className="w-full">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeIn}
            className="text-center space-y-4 mb-16"
          >
            <h2 className="text-2xl md:text-3xl font-bold">{translations.mission.title}</h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              {translations.mission.description}
            </p>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto"
          >
            {translations.mission.values.map((value, index) => {
              const Icon = valueIcons[index as keyof typeof valueIcons]
              return (
                <motion.div key={index} variants={scaleIn}>
                  <Card className="text-center h-full hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="mx-auto mb-4 p-3 rounded-full bg-primary/10 w-fit">
                        <Icon className="h-8 w-8 text-primary" />
                      </div>
                      <CardTitle className="text-lg">{value.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">{value.description}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </motion.div>
        </div>
      </section>

      {/* Achievements */}
      <section className="py-20 bg-muted/30">
        <div className="w-full mx-auto px-4 md:px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeIn}
            className="text-center space-y-4 mb-16"
          >
            <h2 className="text-2xl md:text-3xl font-bold">{translations.achievements.title}</h2>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto"
          >
            {translations.achievements.items.map((item, index) => (
              <motion.div key={index} variants={scaleIn} className="text-center space-y-2">
                <div className="text-3xl md:text-4xl font-bold text-primary">{item.value}</div>
                <p className="text-muted-foreground">{item.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Our Story */}
      <section className="py-20">
        <div className="w-full mx-auto px-4 md:px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeIn}
            className="max-w-4xl mx-auto"
          >
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
              {translations.story.title}
            </h2>
            <div className="space-y-6">
              {translations.story.content.map((paragraph, index) => (
                <motion.p
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * index }}
                  viewport={{ once: true }}
                  className="text-lg text-muted-foreground leading-relaxed"
                >
                  {paragraph}
                </motion.p>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-20 bg-muted/30">
        <div className="w-full mx-auto px-4 md:px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeIn}
            className="text-center space-y-4 max-w-3xl mx-auto"
          >
            <div className="inline-flex items-center justify-center p-4 rounded-full bg-primary/10 mb-4">
              <Users className="h-12 w-12 text-primary" />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold">{translations.team.title}</h2>
            <p className="text-lg text-muted-foreground">{translations.team.description}</p>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="w-full mx-auto px-4 md:px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeIn}
            className="text-center space-y-6 max-w-4xl mx-auto"
          >
            <h2 className="text-2xl md:text-3xl font-bold">{translations.cta.title}</h2>
            <p className="text-lg text-muted-foreground">{translations.cta.subtitle}</p>
            <Link href="/sign-up">
              <Button size="lg" className="min-w-[250px] mt-4">
                {translations.cta.button}
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
