// /components/menu/MenuDetailContent.tsx
'use client';

import Image from 'next/image';
import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Archive,
  CreditCard,
  Clock,
  Tag,
  Users,
  Repeat,
  Edit,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Doc } from '@/convex/_generated/dataModel';
import Link from 'next/link';
import { Trash } from 'lucide-react';
import { Dialog } from '@/components/common';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { handleError } from '@/lib/errors';

// アニメーション用の設定
const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

interface MenuDetailContentProps {
  menu: Doc<'menu'> | null;
}

export function MenuDetailContent({ menu }: MenuDetailContentProps) {
  const router = useRouter();
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const deleteMenu = useMutation(api.menu.core.kill);

  // 金額をフォーマットするヘルパー関数
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
    }).format(price);
  };

  // 各種ラベル取得用のヘルパー関数
  const getGenderLabel = (gender: string) => {
    const labels: Record<string, string> = {
      all: '全ての性別',
      male: '男性向け',
      female: '女性向け',
    };
    return labels[gender] || gender;
  };

  const getTargetTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      repeat: 'リピーター向け',
      new: '新規顧客向け',
      all: '全ての顧客向け',
    };
    return labels[type] || type;
  };

  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      credit_card: 'オンライン決済',
      cash: '店舗決済',
      all: '店舗決済・オンライン決済',
    };
    return labels[method] || method;
  };

  const handleDeleteMenu = async () => {
    if (menu) {
      try {
        await deleteMenu({ menuId: menu._id });
        router.push('/dashboard/menu');
        toast.success('メニューを削除しました');
      } catch (error) {
        const errorDetails = handleError(error);
        toast.error(errorDetails.message);
      }
    } else {
      toast.error('メニューが見つかりません');
    }
  };

  // 説明文が長い場合は省略表示するための関数
  const toggleDescription = () => {
    setShowFullDescription(!showFullDescription);
  };

  // 説明文の短縮
  const shortenDescription = (text: string | undefined, maxLength = 150) => {
    if (!text || text.length <= maxLength) return text || '';
    return showFullDescription ? text : `${text.substring(0, maxLength)}...`;
  };

  if (!menu) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <p className="text-center text-gray-500">メニューが見つかりませんでした</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end gap-2">
        <Link href={`/dashboard/menu/${menu._id}/edit`}>
          <Button variant="default" size="sm">
            <Edit className="w-4 h-4 mr-2" /> 編集
          </Button>
        </Link>
        <Button variant="destructive" size="sm" onClick={() => setIsDeleteDialogOpen(true)}>
          <Trash className="w-4 h-4 mr-2" /> 削除
        </Button>
      </div>
      {/* ヘッダー情報 */}
      <motion.div
        variants={fadeIn}
        initial="hidden"
        animate="visible"
        className="flex flex-col md:flex-row gap-6 items-start"
      >
        <div className="w-full md:w-1/3">
          <Card className="overflow-hidden h-full">
            <div className="relative pb-2/3 h-64">
              {menu.imgPath ? (
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  transition={{ duration: 0.3 }}
                  className="h-full"
                >
                  <Image
                    src={menu.imgPath}
                    alt={menu.name || 'メニュー画像'}
                    className="w-full h-full object-cover rounded-t-lg"
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                </motion.div>
              ) : (
                <div className="flex items-center justify-center h-full bg-gray-100 text-gray-400">
                  画像がありません
                </div>
              )}
            </div>
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <Badge variant={menu.isActive ? 'default' : 'secondary'} className="mb-2  ">
                  {menu.isActive ? '公開中' : '非公開'}
                </Badge>
                {menu.isArchive && (
                  <Badge variant="destructive" className="mb-2">
                    <Archive className="w-4 h-4 mr-1" /> アーカイブ済み
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="w-full md:w-2/3">
          <CardHeader>
            <div className="flex justify-between items-start">
              <CardTitle className="text-2xl font-bold">{menu.name}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center">
                  <CreditCard className="w-5 h-5 mr-2 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">料金</p>
                    <div className="flex items-baseline">
                      {menu.salePrice || menu.salePrice !== 0 ? (
                        <p className="ml-2 text-sm text-gray-400">
                          <span className="text-black text-base font-bold">
                            {formatPrice(menu.salePrice || 0)}
                          </span>{' '}
                          / <span className="line-through">{formatPrice(menu.price || 0)}</span>
                        </p>
                      ) : (
                        <p className="ml-2 text-base  text-black">{formatPrice(menu.price || 0)}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center">
                  <Clock className="w-5 h-5 mr-2 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">所要時間</p>
                    <p>{menu.timeToMin || 0}分</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center">
                  <Users className="w-5 h-5 mr-2 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">対象</p>
                    <p>{getGenderLabel(menu.targetGender || '')}</p>
                  </div>
                </div>

                <div className="flex items-center">
                  <Repeat className="w-5 h-5 mr-2 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">ターゲット</p>
                    <p>
                      {getTargetTypeLabel(
                        menu.targetType == 'first'
                          ? '新規顧客向け'
                          : menu.targetType == 'repeat'
                            ? 'リピーター向け'
                            : '全ての顧客向け'
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center">
                  <CreditCard className="w-5 h-5 mr-2 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">支払い方法</p>
                    <p>{getPaymentMethodLabel(menu.paymentMethod || '')}</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* 詳細情報 */}
      <motion.div variants={fadeIn} initial="hidden" animate="visible" transition={{ delay: 0.2 }}>
        <Card>
          <CardHeader>
            <CardTitle>詳細情報</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 説明文 */}
            <div>
              <h3 className="text-lg font-medium mb-2">説明</h3>
              <div className="bg-gray-50 p-4 rounded-md">
                <p className="text-gray-700">{shortenDescription(menu.description)}</p>
                {menu.description && menu.description.length > 150 && (
                  <Button variant="ghost" size="sm" className="mt-2" onClick={toggleDescription}>
                    {showFullDescription ? (
                      <>
                        <ChevronUp className="w-4 h-4 mr-1" /> 省略表示
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4 mr-1" /> もっと見る
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>

            {/* タグ */}
            <div>
              <h3 className="text-lg font-medium mb-2">タグ</h3>
              <div className="flex flex-wrap gap-2">
                {menu.tags && menu.tags.length > 0 ? (
                  menu.tags.map((tag, index) => (
                    <Badge key={index} variant="outline" className="bg-gray-50">
                      <Tag className="w-3 h-3 mr-1" /> {tag}
                    </Badge>
                  ))
                ) : (
                  <p className="text-gray-500">タグはありません</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* システム情報 */}
      <motion.div variants={fadeIn} initial="hidden" animate="visible" transition={{ delay: 0.4 }}>
        <Card>
          <CardHeader>
            <CardTitle>システム情報</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">作成日時</p>
                <p>{new Date(menu._creationTime).toLocaleString('ja-JP')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
      <Dialog
        title="メニューの削除"
        description="このメニューを削除してもよろしいですか？この操作は元に戻せません。"
        confirmTitle="削除する"
        cancelTitle="キャンセル"
        onConfirmAction={handleDeleteMenu}
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      />
    </div>
  );
}
