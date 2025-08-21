"use client";

import Link from "next/link";
import { CheckCircle, Home } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Separator } from "@/components/ui/separator";
import { useTranslations } from 'next-intl';

export default function SuccessSubscriptionPage() {
  const t = useTranslations('subscription')

  // フェードインアニメーションの設定
  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: [0.4, 0, 0.2, 1] as const,
        staggerChildren: 0.2,
      },
    },
  }

  return (
    <div className="min-h-[calc(100vh-20vh)] flex items-center justify-center ">
      <motion.div
        className="w-full max-w-3xl"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <Card className="border-0 shadow-lg overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-green-400 to-emerald-500"></div>
          <CardContent className="pt-10 pb-8 px-8">
            <motion.div className="text-center space-y-6" variants={containerVariants}>
              <motion.div className="inline-flex p-4 rounded-full bg-success-foreground">
                <CheckCircle className="w-16 h-16 text-success" />
              </motion.div>

              <motion.div>
                <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl bg-gradient-to-r from-success to-accent-2 bg-clip-text text-transparent">
                  {t('success.title')}
                </h2>
              </motion.div>

              <Separator className="my-6" />

              <motion.p className="text-base font-medium text-pretty text-muted-foreground">
                {t('success.congratulations')}
                <br />
                {t('success.allFeaturesAvailable')}
              </motion.p>

              <motion.div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
                <Button
                  asChild
                  className="bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-600 hover:to-emerald-700 text-white"
                >
                  <Link href={`/dashboard`}>
                    <span className="flex items-center">
                      <Home className="w-4 h-4 mr-2" />
                      {t('success.backToDashboard')}
                    </span>
                  </Link>
                </Button>
              </motion.div>

              <motion.div className="mt-8 bg-muted p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  {t('success.billingInfo')}
                  <Link
                    className="text-link-foreground hover:text-primary underline mx-1 font-medium"
                    href={`/dashboard/subscription`}
                  >
                    {t('success.subscriptionPageLink')}
                  </Link>
                  {t('success.canBeDone')}
                </p>
              </motion.div>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}