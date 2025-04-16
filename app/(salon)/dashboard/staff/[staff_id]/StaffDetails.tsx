'use client';

import Image from 'next/image';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useSalon } from '@/hooks/useSalon';
import { Loading } from '@/components/common';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { Dialog } from '@/components/common';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
// Shadcn UI コンポーネント
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { handleError } from '@/lib/error';

// アイコン
import {
  User,
  Clock,
  DollarSign,
  Trash,
  Star,
  Shield,
  Tag,
  Mail,
  Clipboard,
  Calendar,
  Info,
  FileEdit,
  LucideIcon,
} from 'lucide-react';
import { MAX_PRIORITY } from '@/services/convex/constants';

// アニメーション設定
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 100,
    },
  },
};

// サブコンポーネント: 情報フィールド
const InfoField = ({
  icon: Icon,
  label,
  value,
  tooltip,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  tooltip?: string;
}) => (
  <div className="flex items-center space-x-3 py-2 group transition-all duration-200 hover:bg-muted/20 rounded-md px-2">
    <div className="">
      <Icon className="h-5 w-5 text-primary" />
    </div>
    <div className="flex-1">
      <div className="flex items-center">
        <p className="text-sm text-muted-foreground">{label}</p>
        {tooltip && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 ml-1 text-gray-400 cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs max-w-xs">{tooltip}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      <p className="font-medium">{value}</p>
    </div>
  </div>
);

// セクションヘッダーコンポーネント
const SectionHeader = ({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
}) => (
  <div className="flex items-center mb-4">
    <Icon className="h-5 w-5 mr-2 text-primary" />
    <div>
      <h3 className="font-semibold text-lg">{title}</h3>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
    </div>
  </div>
);

export default function StaffDetails() {
  const { staff_id } = useParams();
  const { salon } = useSalon();
  const { user } = useUser();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('basic');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  // 削除処理中かどうかを示すフラグ
  const [isDeleting, setIsDeleting] = useState(false);

  // メモ化されたクエリを使用してパフォーマンス向上
  const staffAllData = useQuery(
    api.staff.core.query.getRelatedTables,
    salon?._id && staff_id && !isDeleting
      ? { salonId: salon?._id, staffId: staff_id as Id<'staff'> }
      : 'skip'
  );

  const exclusionMenus = useQuery(
    api.menu.menu_exclusion_staff.query.listBySalonAndStaffId,
    salon?._id
      ? {
          salonId: salon?._id,
          staffId: staff_id as Id<'staff'>,
        }
      : 'skip'
  );

  const staffKill = useMutation(api.staff.core.mutation.killRelatedTables);
  const deleteImage = useAction(api.storage.action.kill);
  // const deleteMember = useAction(api.staff.auth.action.deleteClerkMemberAndUser);

  if (!staffAllData && !isDeleting) return <Loading />;

  // アバターの頭文字を取得
  const getInitials = (name: string) => {
    return name ? name.substring(0, 2).toUpperCase() : 'ST';
  };

  // 性別を日本語で表示
  const getGenderText = (gender: string) => {
    return gender === 'male' ? '男性' : gender === 'female' ? '女性' : '未選択';
  };

  // roleをわかりやすい表示に変換
  const getRoleDisplay = (role: string) => {
    switch (role) {
      case 'staff':
        return 'スタッフ権限';
      case 'manager':
        return 'マネージャー権限';
      case 'owner':
        return 'オーナー権限';
      default:
        return role;
    }
  };

  const handleShowDeleteDialog = () => {
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteStaff = async () => {
    try {
      // 削除処理中フラグを立てて、クエリの実行を停止
      setIsDeleting(true);

      if (staffAllData?.imgPath) {
        await deleteImage({
          imgUrl: staffAllData.imgPath,
        });
      }
      if (staffAllData) {
        await staffKill({
          staffId: staff_id as Id<'staff'>,
          staffConfigId: staffAllData.staffConfigId,
          staffAuthId: staffAllData.staffAuthId,
        });

        // if (user) {
        //   await deleteMember({
        //     organizationId: staffAllData.organizationId as string,
        //     clerkId: user.id,
        //   });
        // }
      }
      toast.success('スタッフを削除しました');
      router.push('/dashboard/staff');
    } catch (error) {
      // エラーが発生した場合は削除処理中フラグを元に戻す
      setIsDeleting(false);
      const errorDetails = handleError(error);
      toast.error(errorDetails.message);
    }
  };

  console.log('user', user);

  if (!staffAllData) return <Loading />;

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants}>
      {/* スタッフヘッダーカード */}

      <Card className="mb-6 overflow-hidden border">
        <CardContent className="p-0">
          <div className="flex flex-col md:flex-row">
            {/* サムネイル部分 */}
            <div className="relative bg-gradient-to-br from-primary/20 to-primary/5 p-6 flex items-center justify-center md:w-1/3">
              <div className="h-full w-full">
                {staffAllData.imgPath ? (
                  <Image
                    src={staffAllData.imgPath}
                    alt={staffAllData.name || ''}
                    width={192}
                    height={192}
                    className="object-cover"
                  />
                ) : (
                  <div className="text-2xl flex items-center justify-center h-full w-full">
                    {getInitials(staffAllData.name || '')}
                  </div>
                )}
              </div>
            </div>

            {/* 情報部分 */}
            <div className="p-6 md:w-2/3">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h2 className="text-2xl font-bold">{staffAllData.name}</h2>
                  <div className="flex items-center text-muted-foreground text-xs mt-4 gap-2">
                    <div>
                      <span className="text-sm">性別</span>
                      <p className="text-sm">{getGenderText(staffAllData.gender || '未選択')}</p>
                    </div>
                    <div>
                      <span className="text-sm">年齢</span>
                      <p className="text-sm">
                        {staffAllData.age ? `${staffAllData.age}歳` : '未選択'}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Badge
                    variant={staffAllData.isActive ? 'outline' : 'destructive'}
                    className={` transition-all duration-300 ${
                      staffAllData.isActive
                        ? 'border-green-500 text-green-600 hover:border-green-700'
                        : 'border-red-500 text-red-600 hover:border-red-700'
                    }`}
                  >
                    {staffAllData.isActive ? 'アクティブ' : '非アクティブ'}
                  </Badge>
                  <Badge variant="outline" className="border-primary/50 text-primary">
                    {getRoleDisplay(staffAllData.role || '')}
                  </Badge>
                </div>
              </div>
              <p className="mt-2 text-gray-600">{staffAllData.description || '説明がありません'}</p>

              <div className="grid grid-cols-3 gap-4 mt-4">
                <div className="flex flex-col justify-between bg-gradient-to-br from-purple-50 to-purple-100/50 p-3 rounded-lg">
                  <div className="flex flex-col items-start gap-2 text-purple-600 mb-1">
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4" />
                      <p className="text-xs font-medium">指名料金</p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      指名料金は予約時のサービス料金に影響します。
                    </span>
                  </div>
                  <p className="font-bold text-lg">¥{staffAllData.extraCharge || 0}</p>
                </div>

                <div className="flex flex-col justify-between bg-gradient-to-br from-amber-50 to-amber-100/50 p-3 rounded-lg">
                  <div className="flex flex-col items-start gap-2 text-amber-600 mb-1">
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4" />
                      <p className="text-xs font-medium">優先度</p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      数値が大きいほど予約画面などで上位に表示されます。
                    </span>
                  </div>
                  <p className="font-bold text-lg">
                    {staffAllData.priority || 0}
                    <span className="text-xs text-muted-foreground">/{MAX_PRIORITY}</span>
                  </p>
                </div>
              </div>
              <div>
                {exclusionMenus && exclusionMenus.length > 0 && (
                  <div className="mt-4">
                    <h3 className="text-lg font-semibold mb-2">対応外メニュー</h3>
                    <ul className="flex flex-wrap gap-2">
                      {exclusionMenus.map(
                        (menu: { menuId: Id<'menu'>; name: string | undefined }) => (
                          <li
                            key={menu.menuId.slice(0, 12)}
                            className="bg-orange-50 border border-orange-300 p-1 text-sm text-orange-700 rounded-md"
                          >
                            {menu.name}
                          </li>
                        )
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="bg-muted/30 px-6 py-3 flex justify-end">
          <div className="flex gap-2">
            <Button
              variant="destructive"
              size="sm"
              className="gap-1"
              onClick={handleShowDeleteDialog}
            >
              <Trash className="h-4 w-4" />
              削除
            </Button>
            <Link href={`/dashboard/staff/${staff_id}/edit`}>
              <Button variant="default" size="sm" className="gap-1">
                <FileEdit className="h-4 w-4" />
                編集
              </Button>
            </Link>
          </div>
        </CardFooter>
      </Card>

      {/* 詳細タブ */}
      <motion.div variants={itemVariants}>
        <Tabs
          defaultValue="basic"
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full"
        >
          <TabsList className="grid grid-cols-3 mb-6">
            <TabsTrigger value="basic" className="flex items-center gap-1">
              <User className="h-4 w-4" />
              基本情報
            </TabsTrigger>
            <TabsTrigger value="work" className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              勤務情報
            </TabsTrigger>
            <TabsTrigger value="auth" className="flex items-center gap-1">
              <Shield className="h-4 w-4" />
              認証情報
            </TabsTrigger>
          </TabsList>

          {/* 基本情報タブ */}
          <TabsContent value="basic" className="space-y-4">
            <Card className="border-none shadow-md hover:shadow-lg transition-all duration-300">
              <CardHeader className="pb-2">
                <SectionHeader
                  icon={User}
                  title="基本情報"
                  description="スタッフの基本的なプロフィール情報"
                />
              </CardHeader>
              <CardContent>
                <motion.div
                  className="space-y-1"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                >
                  <InfoField
                    icon={User}
                    label="名前"
                    value={staffAllData.name || ''}
                    tooltip="システム内およびお客様に表示される名前です"
                  />
                  <Separator />
                  <InfoField
                    icon={User}
                    label="性別"
                    value={getGenderText(staffAllData.gender || '')}
                  />
                  <Separator />
                  <InfoField
                    icon={Calendar}
                    label="年齢"
                    value={`${staffAllData.age ? `${staffAllData.age}歳` : '未設定'}`}
                  />
                  <Separator />

                  <InfoField
                    icon={Clipboard}
                    label="説明"
                    value={staffAllData.description || '説明なし'}
                    tooltip="お客様にも表示されるスタッフの説明文です"
                  />
                </motion.div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 勤務情報タブ */}
          <TabsContent value="work" className="space-y-4">
            <Card className="border-none shadow-md hover:shadow-lg transition-all duration-300">
              <CardHeader className="pb-2">
                <SectionHeader icon={Clock} title="勤務情報" description="給与と勤務に関する設定" />
              </CardHeader>
              <CardContent>
                <motion.div
                  className="space-y-1"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                >
                  <InfoField
                    icon={DollarSign}
                    label="指名料金"
                    value={`¥${staffAllData.extraCharge || 0}`}
                    tooltip="お客様がこのスタッフを指名した場合の追加料金です。"
                  />
                  <Separator />
                  <InfoField
                    icon={Star}
                    label="優先度"
                    value={staffAllData.priority || 0}
                    tooltip="数値が大きいほど予約画面などで上位に表示されます。"
                  />
                  <Separator />
                  <InfoField
                    icon={Shield}
                    label="ステータス"
                    value={staffAllData.isActive ? 'アクティブ' : '非アクティブ'}
                    tooltip="非アクティブの場合、予約画面に表示されなくなります。"
                  />
                  <Separator />
                  <InfoField
                    icon={Tag}
                    label="役割"
                    value={getRoleDisplay(staffAllData.role || '')}
                    tooltip="システム内での権限レベルを示します。"
                  />
                </motion.div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 認証情報タブ */}
          <TabsContent value="auth" className="space-y-4">
            <Card className="border-none shadow-md hover:shadow-lg transition-all duration-300">
              <CardHeader className="pb-2">
                <SectionHeader
                  icon={Shield}
                  title="認証情報"
                  description="スタッフの認証に必要な情報です。スタッフのログイン時にはこちらを使用します。"
                />
              </CardHeader>
              <CardContent>
                <motion.div
                  className="space-y-1"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                >
                  <InfoField
                    icon={Mail}
                    label="メールアドレス"
                    value={staffAllData.email || '未設定'}
                    tooltip="通知や連絡に使用されます"
                  />
                  <Separator />
                </motion.div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
      <Dialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="スタッフを削除しますか？"
        description="この操作は元に戻すことができません。"
        onConfirmAction={handleDeleteStaff}
      />
    </motion.div>
  );
}
