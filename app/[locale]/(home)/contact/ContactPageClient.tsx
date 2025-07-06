'use client'

import { useState } from 'react'
import { Link } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { motion } from 'framer-motion'
import { Mail, Clock, MessageCircle, Send, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useErrorHandler } from '@/hooks/useErrorHandler'

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
  subtitle: string
  form: {
    title: string
    fields: {
      name: string
      email: string
      company: string
      phone: string
      subject: string
      message: string
    }
    placeholders: {
      name: string
      email: string
      company: string
      phone: string
      subject: string
      message: string
    }
    submit: string
    submitting: string
    success: string
    error: string
  }
  info: {
    title: string
    items: {
      email: {
        label: string
        value: string
      }
      hours: {
        label: string
        value: string
      }
      response: {
        label: string
        value: string
      }
    }
  }
  faq: {
    title: string
    cta: string
  }
}

export function ContactPageClient({ translations }: { translations: TranslationType }) {
  const { showErrorToast } = useErrorHandler()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    phone: '',
    subject: '',
    message: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      await fetch('/api/resend/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: 'bocker.help@gmail.com',
          subject: 'HPからのお問い合わせ',
          templateProps: {
            name: formData.name,
            email: formData.email,
            company: formData.company,
            phone: formData.phone,
            subject: formData.subject,
            message: formData.message,
          }, // HTMLの代わりにtemplatePropsを渡す
        }),
      })
      // Reset form
      setFormData({
        name: '',
        email: '',
        company: '',
        phone: '',
        subject: '',
        message: '',
      })
      toast.success(translations.form.success, {
        icon: <CheckCircle className="h-5 w-5" />,
      })
    } catch (error) {
      showErrorToast(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  const infoItems = [
    {
      icon: Mail,
      label: translations.info.items.email.label,
      value: translations.info.items.email.value,
    },
    {
      icon: Clock,
      label: translations.info.items.hours.label,
      value: translations.info.items.hours.value,
    },
    {
      icon: MessageCircle,
      label: translations.info.items.response.label,
      value: translations.info.items.response.value,
    },
  ]

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
            <h1 className="text-2xl md:text-3xl font-bold">{translations.title}</h1>
            <p className="text-base md:text-lg text-muted-foreground">{translations.subtitle}</p>
          </motion.div>
        </div>
      </section>

      {/* Contact Form & Info */}
      <section className="py-20">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
            {/* Contact Form */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeIn}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="text-2xl">{translations.form.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">{translations.form.fields.name}</Label>
                        <Input
                          id="name"
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          placeholder={translations.form.placeholders.name}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">{translations.form.fields.email}</Label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          value={formData.email}
                          onChange={handleChange}
                          placeholder={translations.form.placeholders.email}
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="company">{translations.form.fields.company}</Label>
                        <Input
                          id="company"
                          name="company"
                          value={formData.company}
                          onChange={handleChange}
                          placeholder={translations.form.placeholders.company}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">{translations.form.fields.phone}</Label>
                        <Input
                          id="phone"
                          name="phone"
                          type="tel"
                          value={formData.phone}
                          onChange={handleChange}
                          placeholder={translations.form.placeholders.phone}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="subject">{translations.form.fields.subject}</Label>
                      <Input
                        id="subject"
                        name="subject"
                        value={formData.subject}
                        onChange={handleChange}
                        placeholder={translations.form.placeholders.subject}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="message">{translations.form.fields.message}</Label>
                      <Textarea
                        id="message"
                        name="message"
                        value={formData.message}
                        onChange={handleChange}
                        placeholder={translations.form.placeholders.message}
                        rows={6}
                        required
                      />
                    </div>

                    <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                          {translations.form.submitting}
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          {translations.form.submit}
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </motion.div>

            {/* Contact Information */}
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="space-y-8"
            >
              <motion.div variants={fadeIn}>
                <h2 className="text-2xl font-bold mb-6">{translations.info.title}</h2>
                <div className="space-y-6">
                  {infoItems.map((item, index) => (
                    <motion.div key={index} variants={fadeIn} className="flex items-start gap-4">
                      <div className="p-3 rounded-lg bg-primary/10">
                        <item.icon className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{item.label}</p>
                        <p className="text-muted-foreground">{item.value}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              {/* FAQ CTA */}
              <motion.div variants={fadeIn}>
                <Card className="bg-muted/50">
                  <CardHeader>
                    <CardTitle className="text-xl">{translations.faq.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="mb-4">{translations.faq.cta}</CardDescription>
                    <Link href="/faq">
                      <Button variant="outline">FAQ</Button>
                    </Link>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  )
}
