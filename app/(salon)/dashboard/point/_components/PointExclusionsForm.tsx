import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Plus } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Save } from 'lucide-react';
// アニメーション設定
const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4 },
  },
};

export const PointExclusionsForm = () => {
  return (
    <form>
      <motion.div variants={cardVariants}>
        <Card className="shadow-md hover:shadow-lg transition-shadow duration-300">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-white dark:from-slate-800 dark:to-slate-700">
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              ポイントの適用をしないメニューを選択する
            </CardTitle>
            <CardDescription>ポイント付与から除外するメニューを選択します</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-6">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                このポイント設定が適用されるメニューを選択してください
              </p>

              {/* メニュー選択UIの拡張部分 */}
              <div className="space-y-4">
                <Input placeholder="メニューを検索" className="max-w-md" type="search" />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border rounded-md p-4 flex items-center gap-3">
                    <Switch id="menu-1" />
                    <Label htmlFor="menu-1" className="flex-1 cursor-pointer">
                      カット
                    </Label>
                    <span className="text-sm font-medium">¥5,500</span>
                  </div>
                  <div className="border rounded-md p-4 flex items-center gap-3">
                    <Switch id="menu-2" />
                    <Label htmlFor="menu-2" className="flex-1 cursor-pointer">
                      カラー
                    </Label>
                    <span className="text-sm font-medium">¥8,800</span>
                  </div>
                  <div className="border rounded-md p-4 flex items-center gap-3">
                    <Switch id="menu-3" />
                    <Label htmlFor="menu-3" className="flex-1 cursor-pointer">
                      パーマ
                    </Label>
                    <span className="text-sm font-medium">¥12,000</span>
                  </div>
                  <div className="border rounded-md p-4 flex items-center gap-3">
                    <Switch id="menu-4" />
                    <Label htmlFor="menu-4" className="flex-1 cursor-pointer">
                      ヘッドスパ
                    </Label>
                    <span className="text-sm font-medium">¥6,600</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <motion.div
          className="flex justify-end mt-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Button type="submit" className="px-8 gap-2">
            <Save className="h-4 w-4" />
            メニューを除外
          </Button>
        </motion.div>
      </motion.div>
    </form>
  );
};
