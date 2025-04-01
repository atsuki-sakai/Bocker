import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import Stripe from 'stripe';
import { BillingPeriod } from '@/lib/types';
import imageCompression from 'browser-image-compression';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// 指数バックオフで再試行を行う関数
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 500
): Promise<T> {
  let retries = 0;

  while (true) {
    try {
      return await operation();
    } catch (error) {
      retries++;
      if (retries > maxRetries) {
        console.error(`最大${maxRetries}回の再試行後、処理に失敗しました:`, error);
        throw error;
      }
      // 指数バックオフ + ランダム要素（ジッター）を適用
      const exponentialDelay = Math.min(5000, Math.pow(2, retries - 1) * baseDelay);
      // ジッター適用後に最小1秒、最大5秒の範囲に収める
      const jitter = Math.random();
      // 1000ms〜exponentialDelayの範囲になるよう調整
      const delay = Math.max(1000, Math.floor(exponentialDelay * jitter));

      console.log(`処理を ${delay}ms 後に再試行します (試行回数: ${retries}/${maxRetries})`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

export function timestampToJSTISO(timestamp: number) {
  const date = new Date(timestamp);
  const parts = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const year = parts.find((p) => p.type === 'year')?.value;
  const month = parts.find((p) => p.type === 'month')?.value;
  const day = parts.find((p) => p.type === 'day')?.value;
  const hour = parts.find((p) => p.type === 'hour')?.value;
  const minute = parts.find((p) => p.type === 'minute')?.value;
  const second = parts.find((p) => p.type === 'second')?.value;

  return `${year}-${month}-${day}T${hour}:${minute}:${second}+09:00`;
}

// Stripeのサブスクリプションステータスを正規化する関数
export function normalizeSubscriptionStatus(subscription: Stripe.Subscription): string {
  const { status } = subscription;

  // Status handling for business logic
  switch (status) {
    // Treat as active: make sure these are considered valid subscriptions
    case 'incomplete':
    case 'trialing':
      return 'active';

    // Handle payment issues
    case 'past_due': // 支払い期限切れ
    case 'unpaid': // 未払い
      console.log(`支払い問題を検出: サブスクリプション ${subscription.id} は ${status} 状態です`);
      // ここでは "payment_issue" として返すことも可能
      return status;

    // Other standard states
    case 'active':
    case 'canceled':
    case 'incomplete_expired':
      return status;

    // Fallback for unknown/future states
    default:
      console.warn(`未知のサブスクリプションステータス: ${status}, ID: ${subscription.id}`);
      return status;
  }
}

// Stripeの課金期間をConvexの課金期間に変換
export function priceIdToPlanInfo(priceId: string) {
  switch (priceId) {
    case process.env.NEXT_PUBLIC_LITE_MONTHLY_PRC_ID:
      return {
        name: 'Lite',
        price: 6000,
      };
    case process.env.NEXT_PUBLIC_LITE_YEARLY_PRC_ID:
      return {
        name: 'Lite',
        price: 50000,
      };
    case process.env.NEXT_PUBLIC_PRO_MONTHLY_PRC_ID:
      return {
        name: 'Pro',
        price: 10000,
      };
    case process.env.NEXT_PUBLIC_PRO_YEARLY_PRC_ID:
      return {
        name: 'Pro',
        price: 100000,
      };
    case process.env.NEXT_PUBLIC_ENTRPIS_MONTHLY_PRC_ID:
      return {
        name: 'Enterprise',
        price: 16000,
      };
    case process.env.NEXT_PUBLIC_ENTRPIS_YEARLY_PRC_ID:
      return {
        name: 'Enterprise',
        price: 153600,
      };
    default:
      return new Error('Invalid priceId');
  }
}

// プランと課金期間から価格IDを取得する関数
export function getPriceStrFromPlanAndPeriod(planStr: string, period: BillingPeriod): string {
  planStr = planStr.toLowerCase();
  if (period === 'monthly') {
    switch (planStr) {
      case 'lite':
        return process.env.NEXT_PUBLIC_LITE_MONTHLY_PRC_ID!;
      case 'pro':
        return process.env.NEXT_PUBLIC_PRO_MONTHLY_PRC_ID!;
      case 'enterprise':
        return process.env.NEXT_PUBLIC_ENTRPIS_MONTHLY_PRC_ID!;
      default:
        throw new Error('Invalid plan ID');
    }
  } else {
    switch (planStr) {
      case 'lite':
        return process.env.NEXT_PUBLIC_LITE_YEARLY_PRC_ID!;
      case 'pro':
        return process.env.NEXT_PUBLIC_PRO_YEARLY_PRC_ID!;
      case 'enterprise':
        return process.env.NEXT_PUBLIC_ENTRPIS_YEARLY_PRC_ID!;
      default:
        throw new Error('Invalid plan ID');
    }
  }
}

// ファイルをBase64に変換する関数
export async function fileToBase64(file: File): Promise<string> {
  const base64Promise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // data:image/jpeg;base64,の部分を除去
      const base64Data = base64String.split(',')[1];
      resolve(base64Data);
    };
    reader.readAsDataURL(file);
  });

  return base64Promise;
}

// 画像圧縮とWebP変換の関数を追加
export async function compressAndConvertToWebP(
  file: File,
  options?: {
    maxSizeMB?: number;
    maxWidthOrHeight?: number;
    webpQuality?: number;
    useWebWorker?: boolean;
  }
): Promise<File> {
  try {
    // 画像を圧縮（デフォルト値を改善）
    const compressionOptions = {
      maxSizeMB: options?.maxSizeMB ?? 0.5, // 最大サイズを0.5MBに引き上げ（デフォルト）
      maxWidthOrHeight: options?.maxWidthOrHeight ?? 1024, // 最大幅/高さを1024pxに引き上げ
      useWebWorker: options?.useWebWorker ?? true,
    };

    const compressedFile = await imageCompression(file, compressionOptions);

    // WebP形式に変換
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (!event.target?.result) {
          reject(new Error('画像の読み込みに失敗しました'));
          return;
        }

        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvasコンテキストの取得に失敗しました'));
            return;
          }

          ctx.drawImage(img, 0, 0);

          // WebP形式に変換（品質を0.9に向上）
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('WebP変換に失敗しました'));
                return;
              }

              // 新しいファイル名を生成（元のファイル名の拡張子をwebpに変更）
              const fileName = file.name.replace(/\.[^/.]+$/, '') + '.webp';

              // Blobから新しいFileオブジェクトを作成
              const webpFile = new File([blob], fileName, { type: 'image/webp' });
              resolve(webpFile);
            },
            'image/webp',
            options?.webpQuality ?? 0.8 // 品質を0.9に向上（デフォルト）
          );
        };

        img.onerror = () => reject(new Error('画像の読み込みに失敗しました'));
        img.src = event.target.result as string;
      };

      reader.onerror = () => reject(new Error('ファイルの読み込みに失敗しました'));
      reader.readAsDataURL(compressedFile);
    });
  } catch (error) {
    console.error('画像圧縮/変換エラー:', error);
    throw new Error('画像の圧縮または変換に失敗しました');
  }
}
