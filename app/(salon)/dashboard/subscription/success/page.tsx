"use client";

import Link from "next/link";
import { CheckCircle, Home } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Separator } from "@/components/ui/separator";

export default function SuccessSubscriptionPage() {

  // フェードインアニメーションの設定
  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut",
        staggerChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 },
  };

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
            <motion.div
              className="text-center space-y-6"
              variants={containerVariants}
            >
              <motion.div
                variants={itemVariants}
                className="inline-flex p-4 rounded-full bg-green-100 dark:bg-green-900/30"
              >
                <CheckCircle className="w-16 h-16 text-green-500 dark:text-green-400" />
              </motion.div>

              <motion.div variants={itemVariants}>
                <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100 sm:text-4xl bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                  サブスクリプションの購入が完了しました
                </h2>
              </motion.div>

              <Separator className="my-6" />

              <motion.p
                variants={itemVariants}
                className="text-base font-medium text-pretty text-gray-600 dark:text-gray-300"
              >
                おめでとうございます！サブスクリプションが正常に処理されました。
                <br />
                これですべての機能をご利用いただけます。
              </motion.p>

              <motion.div
                variants={itemVariants}
                className="mt-8 flex flex-col sm:flex-row justify-center gap-4"
              >
                <Button
                  asChild
                  className="bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-600 hover:to-emerald-700 text-white"
                >
                  <Link href={`/dashboard`}>
                    <span className="flex items-center">
                      <Home className="w-4 h-4 mr-2" />
                      ダッシュボードに戻る
                    </span>
                  </Link>
                </Button>
              </motion.div>

              <motion.div
                variants={itemVariants}
                className="mt-8 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg"
              >
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  契約の更新やお支払い情報の変更は
                  <Link
                    className="text-blue-500 hover:text-blue-600 underline mx-1 font-medium"
                    href={`/dashboard/subscription`}
                  >
                    サブスクリプションページ
                  </Link>
                  から行えます。
                </p>
              </motion.div>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}