'use client';

import { useState } from 'react';
import { DashboardSection } from '@/components/common';
import { motion, AnimatePresence } from 'framer-motion';
import { Coins, Gift } from 'lucide-react';
import { PointConfigForm } from './_components/PointConfigForm';
import { PointExclusionsForm } from './_components/PointExclusionsForm';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const staggerChildren = {
  visible: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

export default function PointForm() {
  const [activeTab, setActiveTab] = useState('basic');

  return (
    <motion.div initial="hidden" animate="visible" variants={staggerChildren}>
      <DashboardSection
        title="ポイント設定"
        backLink="/dashboard"
        backLinkTitle="ダッシュボードに戻る"
      >
        <Tabs defaultValue="basic" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="basic" className="flex items-center gap-2">
              <Coins className="h-4 w-4" />
              基本設定
            </TabsTrigger>
            <TabsTrigger value="exclusions" className="flex items-center gap-2">
              <Gift className="h-4 w-4" />
              除外メニュー
            </TabsTrigger>
          </TabsList>

          <AnimatePresence mode="wait">
            <TabsContent value="basic" key="basic-tab">
              <PointConfigForm />
            </TabsContent>

            <TabsContent value="exclusions" key="exclusions-tab">
              <PointExclusionsForm />
            </TabsContent>
          </AnimatePresence>
        </Tabs>
      </DashboardSection>
    </motion.div>
  );
}