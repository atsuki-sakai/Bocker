"use client";
import Link from "next/link";
import {
  XCircle,
  Mail,
  CreditCard,
  ArrowRight,
  HelpCircle,
} from "lucide-react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { motion } from "framer-motion";
import { useTranslations } from 'next-intl';

export default function CancelSubscriptionPage() {
  const t = useTranslations('subscription')

  // アニメーション設定
  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: [0.4, 0, 0.2, 1] as const,
        staggerChildren: 0.15,
      },
    },
  }

  return (
    <div className="min-h-[calc(100vh-20vh)] flex items-center justify-center  p-4">
      <motion.div
        className="w-full max-w-3xl"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <Card className="border-0 overflow-hidden ">
          <div className="h-2 bg-destructive"></div>
          <CardContent className="pt-10 pb-6 px-8">
            <motion.div className="text-center space-y-4" variants={containerVariants}>
              <motion.div className="inline-flex p-4 rounded-full ">
                <XCircle className="w-16 h-16 text-destructive" />
              </motion.div>

              <motion.div>
                <h2 className="text-2xl font-bold tracking-tight text-primary">
                  {t('cancel.title')}
                </h2>
              </motion.div>

              <Separator className="my-6" />

              <motion.div className="space-y-4">
                <div className="bg-background p-6 rounded-lg">
                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row items-center gap-3 text-left">
                      <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-info-foreground text-info">
                        <CreditCard className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-primary">{t('cancel.retryPurchase')}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {t('cancel.retryDescription')}
                        </p>
                        <Button
                          asChild
                          variant="link"
                          className="p-0 h-auto mt-1 text-link  font-medium"
                        >
                          <Link href={`/dashboard/subscription`}>
                            <span className="flex items-center">
                              {t('cancel.goToSubscription')}
                              <ArrowRight className="w-4 h-4 ml-1" />
                            </span>
                          </Link>
                        </Button>
                      </div>
                    </div>

                    <Separator />

                    <div className="flex flex-col sm:flex-row items-center gap-3 text-left">
                      <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
                        <HelpCircle className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-primary">{t('cancel.contactSupport')}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {t('cancel.supportDescription')}
                        </p>
                        <Button
                          asChild
                          variant="link"
                          className="p-0 h-auto mt-1 text-link font-medium"
                        >
                          <a href="mailto:bocker.help@gmail.com" className="flex items-center">
                            <Mail className="w-4 h-4 mr-1" />
                            bocker.help@gmail.com
                          </a>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </CardContent>

          <CardFooter className="flex justify-center pb-8">
            <Button asChild variant="default" className="mt-4 bg-primary hover:bg-primary/90">
              <Link href={`/dashboard`}>{t('cancel.backToDashboard')}</Link>
            </Button>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  )
}