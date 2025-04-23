"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { handleErrorToMsg } from '@/lib/error';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useZodForm } from '@/hooks/useZodForm';
import { toast } from 'sonner';
import { api } from '@/convex/_generated/api';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { fetchQuery } from 'convex/nextjs';
import { Id } from '@/convex/_generated/dataModel';

// メールアドレス入力バリデーション
const emailFormSchema = z.object({
  email: z
    .string()
    .min(1, 'メールアドレスを入力してください')
    .email('有効なメールアドレスを入力してください'),
});

// サロン選択バリデーション
const salonSelectSchema = z.object({
  selectedSalonId: z.string().min(1, 'サロンを選択してください'),
});

// PINコード入力バリデーション
const pinFormSchema = z.object({
  pin: z
    .string()
    .min(1, 'PINコードを入力してください')
    .length(4, 'PINコードは4桁で入力してください')
    .regex(/^\d{4}$/, 'PINコードは4桁の数字で入力してください'),
});

// スタッフ情報の型定義
interface StaffData {
  _id: string;
  name?: string;
  email: string;
  salonId: Id<'salon'>;
  role?: string;
}

// サロン情報の型定義
interface SalonInfo {
  salonId: string;
  salonName: string;
}


export default function StaffLoginForm() {
  const router = useRouter();
  const [step, setStep] = useState<'email' | 'salon' | 'pin'>('email');

  // ステップ切り替え関数
  const changeStep = (newStep: 'email' | 'salon' | 'pin') => {
    if (newStep === 'pin') {
      resetPinForm({ pin: '' });
    }
    setStep(newStep);
  };

  const [isLoading, setIsLoading] = useState(false);
  const [staffList, setStaffList] = useState<StaffData[]>([]);
  const [salonList, setSalonList] = useState<SalonInfo[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<StaffData | null>(null);
  const [selectedSalonId, setSelectedSalonId] = useState<string | null>(null);

  const {
    register: registerEmail,
    handleSubmit: handleEmailSubmit,
    formState: { errors: emailErrors },
  } = useZodForm(emailFormSchema, {
    mode: 'onChange',
    defaultValues: {
      email: '',
    },
  });

  // サロン選択フォーム
  const {
    handleSubmit: handleSalonSubmit,
    formState: { errors: salonErrors },
    setValue: setSalonValue,
  } = useZodForm(salonSelectSchema, {
    mode: 'onChange',
    defaultValues: {
      selectedSalonId: '',
    },
  });

  // ステップ3: PINコードフォーム
  const {
    register: registerPin,
    handleSubmit: handlePinSubmit,
    formState: { errors: pinErrors },
    reset: resetPinForm,
  } = useZodForm(pinFormSchema, {
    mode: 'onChange',
    defaultValues: {
      pin: '',
    },
  });

  // メールアドレス検証処理
  const onEmailSubmit = async (data: z.infer<typeof emailFormSchema>) => {
    setIsLoading(true);
    try {
      // メールアドレスからスタッフ情報を取得
      const staffListResult = await fetchQuery(api.staff.core.query.getStaffListByEmail, {
        email: data.email,
        paginationOpts: {
          numItems: 100,
          cursor: null,
        },
      });

      if (staffListResult.page.length === 0) {
        toast.error('このメールアドレスで登録されたスタッフが見つかりません');
        return;
      }

      // スタッフリストを保存
      setStaffList(staffListResult.page as StaffData[]);

      // サロン情報を取得
      const salonInfoList: SalonInfo[] = [];
      for (const staff of staffListResult.page as StaffData[]) {
        try {
          const salonConfig = await fetchQuery(api.salon.config.query.findBySalonId, {
            salonId: staff.salonId,
          });

          if (salonConfig) {
            salonInfoList.push({
              salonId: staff.salonId,
              // サロン名がない場合はデフォルト値を使用
              salonName: 'サロン ' + staff.salonId,
            });
          }
        } catch (error) {
          console.error('Error fetching salon info:', error);
        }
      }

      setSalonList(salonInfoList);

      // スタッフが1つのサロンにのみ所属している場合は自動選択
      if (staffListResult.page.length === 1) {
        const staff = staffListResult.page[0] as StaffData;
        setSelectedStaff(staff);
        setSelectedSalonId(staff.salonId);
        // PINステップに直接移動
        changeStep('pin');
      } else {
        // 複数サロンがある場合はサロン選択ステップへ
        changeStep('salon');
      }
    } catch (error: unknown) {
      console.error('Staff lookup error:', error);
      toast.error(handleErrorToMsg(error));
    } finally {
      setIsLoading(false);
    }
  };

  // サロン選択処理
  const onSalonSubmit = async (data: z.infer<typeof salonSelectSchema>) => {
    if (!data.selectedSalonId) {
      toast.error('サロンを選択してください');
      return;
    }

    // 選択されたサロンに対応するスタッフを特定
    const selectedStaffMember = staffList.find((staff) => staff.salonId === data.selectedSalonId);
    if (!selectedStaffMember) {
      toast.error('選択されたサロンのスタッフ情報が見つかりません');
      return;
    }

    setSelectedStaff(selectedStaffMember);
    setSelectedSalonId(data.selectedSalonId);

    // PINステップに移動
    changeStep('pin');
  };

  // PINコード検証処理
  const onPinSubmit = async (data: z.infer<typeof pinFormSchema>) => {
    if (!selectedStaff || !selectedSalonId) {
      toast.error('スタッフ情報が不足しています');
      setStep('email');
      return;
    }

    setIsLoading(true);
    try {
      // 完全なログイン情報でAPI呼び出し
      const response = await fetch('/api/staff/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: selectedStaff.email,
          pin: data.pin,
          salonId: selectedSalonId,
          staffId: selectedStaff._id,
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || 'PINコードの検証に失敗しました');
      }

      // ログイン成功
      toast.success('ログインに成功しました');

      // ダッシュボードへリダイレクト
      router.push(`/dashboard/${selectedSalonId}`);
    } catch (error: unknown) {
      console.error('PIN verification error:', error);
      console.log('error', typeof error);
      const errorMessage = handleErrorToMsg(error);
      console.log('errorMessage', errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // サロン選択のハンドラー
  const handleSalonSelect = (salonId: string) => {
    setSelectedSalonId(salonId);
    setSalonValue('selectedSalonId', salonId);
  };

  // ステップが変わったときにPINフォームをリセット
  useEffect(() => {
    if (step === 'pin') {
      resetPinForm({ pin: '' });
    }
  }, [step, resetPinForm]);

  // 選択中のサロン名を取得
  const getSelectedSalonName = () => {
    if (!selectedSalonId) return '';
    const salon = salonList.find((s) => s.salonId === selectedSalonId);
    return salon ? salon.salonName : '不明なサロン';
  };

  return (
    <Card className="w-full max-w-md shadow-lg">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl flex items-center justify-center gap-2">
          <span>スタッフ用ログインページ</span>
        </CardTitle>
        <CardDescription className="flex flex-col items-center gap-1">
          {step === 'email' && 'メールアドレスを入力してください'}
          {step === 'salon' && '所属サロンを選択してください'}
          {step === 'pin' && (
            <>
              <span className="font-medium text-blue-600">{getSelectedSalonName()}</span>
              <span>
                {selectedStaff?.name || 'スタッフ'}
                様、PINコードを入力してください
              </span>
            </>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {step === 'email' ? (
          <form onSubmit={handleEmailSubmit(onEmailSubmit)} className="space-y-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="email" className="text-sm text-gray-700">
                メールアドレス
              </label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="example@example.com"
                disabled={isLoading}
                {...registerEmail('email', {
                  required: 'メールアドレスを入力してください',
                })}
              />
              {emailErrors?.email && (
                <p className="text-red-500 text-sm">{emailErrors.email.message}</p>
              )}
            </div>

            <div className="mt-3 p-2 bg-blue-50 border border-blue-100 rounded-md">
              <p className="text-xs text-blue-700 flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                >
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M12 16v-4"></path>
                  <path d="M12 8h.01"></path>
                </svg>
                登録済みのメールアドレスを入力してください
              </p>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? '確認中...' : '次へ'}
            </Button>
          </form>
        ) : step === 'salon' ? (
          <form onSubmit={handleSalonSubmit(onSalonSubmit)} className="space-y-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="salon" className="text-sm text-gray-700">
                所属サロンを選択
              </label>
              <Select onValueChange={handleSalonSelect} value={selectedSalonId || ''}>
                <SelectTrigger id="salon">
                  <SelectValue placeholder="サロンを選択してください" />
                </SelectTrigger>
                <SelectContent>
                  {salonList.map((salon) => (
                    <SelectItem key={salon.salonId} value={salon.salonId}>
                      {salon.salonName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {salonErrors?.selectedSalonId && (
                <p className="text-red-500 text-sm">{salonErrors.selectedSalonId.message}</p>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                disabled={isLoading}
                onClick={() => changeStep('email')}
              >
                戻る
              </Button>
              <Button type="submit" className="flex-1" disabled={isLoading || !selectedSalonId}>
                次へ
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={handlePinSubmit(onPinSubmit)} className="space-y-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="pin" className="text-sm text-gray-700">
                PINコード (4桁)
              </label>
              <Input
                id="pin"
                type="text"
                maxLength={4}
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="one-time-code"
                disabled={isLoading}
                {...registerPin('pin', {
                  required: 'PINコードを入力してください',
                  setValueAs: (value) => {
                    // 数字以外の文字を取り除く
                    return value ? value.replace(/[^0-9]/g, '') : '';
                  },
                })}
              />
              {pinErrors?.pin && <p className="text-red-500 text-sm">{pinErrors.pin.message}</p>}
            </div>

            <div className="mt-3 p-2 bg-blue-50 border border-blue-100 rounded-md">
              <p className="text-xs text-blue-700 flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                >
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M12 16v-4"></path>
                  <path d="M12 8h.01"></path>
                </svg>
                4桁のPINコードを入力してください
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                disabled={isLoading}
                onClick={() => (staffList.length > 1 ? changeStep('salon') : changeStep('email'))}
              >
                戻る
              </Button>
              <Button type="submit" className="flex-1" disabled={isLoading}>
                {isLoading ? 'ログイン中...' : 'ログイン'}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
      <CardFooter className="flex justify-center flex-col gap-1">
        <p className="text-xs text-muted-foreground">スタッフ専用ログイン画面です</p>
        <Separator className="w-1/2 mx-auto my-2" />

        <Link href="/sign-in" className="text-blue-500 text-xs">
          オーナーアカウントでログイン
        </Link>
      </CardFooter>
    </Card>
  );
}
