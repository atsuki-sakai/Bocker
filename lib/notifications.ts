/**
 * PWA通知管理のユーティリティ関数（ネイティブWeb Push API使用）
 */

export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

/**
 * Service Workerの状態変化を待機する
 */
function waitForServiceWorkerState(
  serviceWorker: ServiceWorker,
  targetState: ServiceWorkerState
): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Service Worker did not reach ${targetState} state within timeout`));
    }, 10000); // 10秒でタイムアウト

    function checkState() {
      if (serviceWorker.state === targetState) {
        clearTimeout(timeout);
        resolve();
      } else if (serviceWorker.state === 'redundant') {
        clearTimeout(timeout);
        reject(new Error('Service Worker became redundant'));
      }
    }

    serviceWorker.addEventListener('statechange', checkState);
    checkState(); // 初回チェック
  });
}

/**
 * pushsubscriptionchangeを受け取ったら再保存するリスナ
 */
export function startPushSubscriptionRenewalListener(tenant_id: string, org_id: string) {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.addEventListener('message', async (event: MessageEvent) => {
    const { data } = event as MessageEvent<{ type: string; subscription: PushSubscription }>;
    if (data?.type === 'pushsubscriptionchange' && data?.subscription) {
      try {
        await savePushSubscriptionToServer(data.subscription, tenant_id, org_id, true);
       
        console.log('Push subscription renewed and saved');
      } catch (e) {
        console.error('Failed to save renewed subscription', e);
      }
    }
  });
}

export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
  reservationId?: string;
}

/**
 * Service Workerを登録する
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service Worker is not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    console.log('Service Worker registered successfully:', registration);

    // アップデートがあるかチェック
    registration.addEventListener('updatefound', () => {
      console.log('Service Worker update found');
    });

    // Service Workerが準備完了するまで待機
    if (registration.installing) {
      console.log('Service Worker installing...');
      await waitForServiceWorkerState(registration.installing, 'activated');
    } else if (registration.waiting) {
      console.log('Service Worker waiting...');
      // 待機中の場合は即座に準備完了とみなす
    } else if (registration.active) {
      console.log('Service Worker already active');
    }

    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    return null;
  }
}

/**
 * プッシュ通知の許可を要求する
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.warn('Notifications are not supported');
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission === 'denied') {
    return 'denied';
  }

  const permission = await Notification.requestPermission();
  console.log('Notification permission:', permission);
  return permission;
}

/**
 * プッシュサブスクリプションを作成する
 */
export async function createPushSubscription(
  registration: ServiceWorkerRegistration,
  vapidPublicKey: string
): Promise<PushSubscription | null> {
  try {
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64UrlToUint8Array(vapidPublicKey),
    });

    console.log('Push subscription created:', subscription);
    return subscription;
  } catch (error) {
    console.error('Failed to create push subscription:', error);
    return null;
  }
}

/**
 * 既存のプッシュサブスクリプションを取得する
 */
export async function getExistingPushSubscription(
  registration: ServiceWorkerRegistration
): Promise<PushSubscription | null> {
  try {
    const subscription = await registration.pushManager.getSubscription();
    return subscription;
  } catch (error) {
    console.error('Failed to get existing subscription:', error);
    return null;
  }
}

/**
 * プッシュサブスクリプションを解除する
 */
export async function unsubscribePushNotification(
  subscription: PushSubscription
): Promise<boolean> {
  try {
    const result = await subscription.unsubscribe();
    console.log('Push subscription unsubscribed:', result);
    return result;
  } catch (error) {
    console.error('Failed to unsubscribe push notification:', error);
    return false;
  }
}

/**
 * サーバーにプッシュサブスクリプションを保存する
 */
export async function savePushSubscriptionToServer(
  subscription: PushSubscription,
  tenant_id: string,
  org_id: string,
  enabled: boolean = true
): Promise<boolean> {
  try {
    const response = await fetch('/api/notifications/subscription', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subscription: subscription.toJSON(),
        tenant_id,
        org_id,
        enabled,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to save subscription');
    }

    console.log('Push subscription saved to server');
    return true;
  } catch (error) {
    console.error('Failed to save push subscription to server:', error);
    return false;
  }
}

/**
 * サーバーからプッシュサブスクリプションを削除する
 */
export async function deletePushSubscriptionFromServer(
  tenant_id: string,
  org_id: string
): Promise<boolean> {
  try {
    const response = await fetch(
      `/api/notifications/subscription?tenant_id=${tenant_id}&org_id=${org_id}`,
      {
        method: 'DELETE',
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete subscription');
    }

    console.log('Push subscription deleted from server');
    return true;
  } catch (error) {
    console.error('Failed to delete push subscription from server:', error);
    return false;
  }
}

/**
 * サーバーからVAPID公開キーを取得する
 */
export async function getVapidPublicKey(): Promise<string | null> {
  try {
    const response = await fetch('/api/notifications/push');
    
    if (!response.ok) {
      throw new Error('Failed to get VAPID public key');
    }

    const data = await response.json();
    return data.publicKey;
  } catch (error) {
    console.error('Failed to get VAPID public key:', error);
    return null;
  }
}

/**
 * プッシュ通知をセットアップする（ネイティブWeb Push API使用）
 */
export async function setupPushNotifications(
  tenant_id: string,
  org_id: string
): Promise<{
  success: boolean;
  subscription?: PushSubscription;
  error?: string;
}> {
  try {
    // 1. 通知の許可を要求
    const permission = await requestNotificationPermission();
    if (permission !== 'granted') {
      return {
        success: false,
        error: '通知の許可が必要です',
      };
    }

    // 2. Service Workerを登録または既存の登録を取得
    let registration = await registerServiceWorker();
    if (!registration) {
      // 既存の登録を確認
      registration = await navigator.serviceWorker.getRegistration('/') || null;
      if (!registration) {
        return {
          success: false,
          error: 'Service Workerの登録に失敗しました',
        };
      }
    }

    // 3. Service Workerが準備完了するまで待機
    await navigator.serviceWorker.ready;
    
    // 4. アクティブなService Workerがあることを確認
    if (!registration.active) {
      return {
        success: false,
        error: 'Service Workerがアクティブではありません',
      };
    }

    // 5. VAPID公開キーを取得
    const vapidPublicKey = await getVapidPublicKey();
    if (!vapidPublicKey) {
      return {
        success: false,
        error: 'VAPID公開キーの取得に失敗しました',
      };
    }

    // 6. プッシュサブスクリプションを作成
    const subscription = await createPushSubscription(registration, vapidPublicKey);
    if (!subscription) {
      return {
        success: false,
        error: 'プッシュサブスクリプションの作成に失敗しました',
      };
    }

    // 7. サーバーに保存
    const saved = await savePushSubscriptionToServer(subscription, tenant_id, org_id);
    if (!saved) {
      return {
        success: false,
        error: 'サーバーへの保存に失敗しました',
      };
    }

    // 8. 再購読時の自動保存リスナを開始
    startPushSubscriptionRenewalListener(tenant_id, org_id);

    return {
      success: true,
      subscription,
    };
  } catch (error) {
    console.error('Failed to setup push notifications:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'セットアップに失敗しました',
    };
  }
}

/**
 * プッシュ通知を無効化する
 */
export async function disablePushNotifications(
  tenant_id: string,
  org_id: string
): Promise<boolean> {
  try {
    // 1. Service Worker登録を取得
    if (!('serviceWorker' in navigator)) {
      // Service Workerがサポートされていない場合でも、サーバー側の設定は無効化
      await updatePushSubscriptionStatus(tenant_id, org_id, false);
      return true;
    }

    const registration = await navigator.serviceWorker.getRegistration('/');
    
    // 2. 既存のサブスクリプションを取得
    if (registration) {
      const subscription = await getExistingPushSubscription(registration);
      
      // 3. サブスクリプションを解除
      if (subscription) {
        await unsubscribePushNotification(subscription);
      }
    }

    // 4. サーバー側でenabledフラグをfalseに設定（削除ではなく無効化）
    await updatePushSubscriptionStatus(tenant_id, org_id, false);

    return true;
  } catch (error) {
    console.error('Failed to disable push notifications:', error);
    return false;
  }
}

/**
 * サーバー側のプッシュサブスクリプションのenabledステータスを更新する
 */
export async function updatePushSubscriptionStatus(
  tenant_id: string,
  org_id: string,
  enabled: boolean
): Promise<boolean> {
  try {
    const response = await fetch('/api/notifications/subscription/status', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tenant_id,
        org_id,
        enabled,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update subscription status');
    }

    console.log('Push subscription status updated:', { enabled });
    return true;
  } catch (error) {
    console.error('Failed to update push subscription status:', error);
    return false;
  }
}

/**
 * Base64 URL文字列をUint8Arrayに変換する（web-push-libs準拠）
 */
function base64UrlToUint8Array(base64UrlData: string): BufferSource {
  const padding = '='.repeat((4 - base64UrlData.length % 4) % 4);
  const base64 = (base64UrlData + padding)
    .replace(/\-/g, '+')
    .replace(/\_/g, '/');
  const rawData = atob(base64);
  const buffer = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    buffer[i] = rawData.charCodeAt(i);
  }
  return buffer.buffer;
}