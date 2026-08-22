'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Bell, BellOff, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
  setupPushNotifications, 
  disablePushNotifications,
  requestNotificationPermission 
} from '@/lib/notifications';

interface PushNotificationSetupProps {
  tenant_id: string;
  org_id: string;
  className?: string;
}

export default function PushNotificationSetup({ 
  tenant_id, 
  org_id, 
  className 
}: PushNotificationSetupProps) {
  const { toast } = useToast();
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  // 現在のサブスクリプション状態を確認する関数をメモ化
  const checkCurrentSubscriptionStatus = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/notifications/subscription?tenant_id=${tenant_id}&org_id=${org_id}`
      );
      
      if (response.ok) {
        const data = await response.json();
        setIsEnabled(data.enabled && data.subscription !== null);
      }
    } catch (error) {
      console.error('Failed to check subscription status:', error);
    }
  }, [tenant_id, org_id]);

  useEffect(() => {
    // ブラウザサポートチェック
    const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    setIsSupported(supported);

    if (supported) {
      // 現在の通知許可状態を取得
      setPermission(Notification.permission);

      // 既存の設定状態を確認
      checkCurrentSubscriptionStatus();
    }
  }, [tenant_id, org_id, checkCurrentSubscriptionStatus]);

  const handleToggleNotifications = async (enabled: boolean) => {
    setIsLoading(true);

    try {
      if (enabled) {
        // 通知を有効化
        const result = await setupPushNotifications(tenant_id, org_id);
        
        if (result.success) {
          setIsEnabled(true);
          setPermission('granted');
          toast({
            title: '通知が有効になりました',
            description: '新しい予約が入ったときにお知らせします',
          });
        } else {
          toast({
            title: '通知の有効化に失敗しました',
            description: result.error || '設定を確認してください',
            variant: 'destructive',
          });
        }
      } else {
        // 通知を無効化
        const success = await disablePushNotifications(tenant_id, org_id);
        
        if (success) {
          setIsEnabled(false);
          toast({
            title: '通知が無効になりました',
            description: 'プッシュ通知を停止しました',
          });
        } else {
          toast({
            title: '通知の無効化に失敗しました',
            description: '再度お試しください',
            variant: 'destructive',
          });
        }
      }
    } catch (error) {
      console.error('Toggle notifications error:', error);
      toast({
        title: 'エラーが発生しました',
        description: '通知設定の変更に失敗しました',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestPermission = async () => {
    setIsLoading(true);
    
    try {
      const newPermission = await requestNotificationPermission();
      setPermission(newPermission);
      
      if (newPermission === 'granted') {
        toast({
          title: '通知許可が承認されました',
          description: '通知を有効にできるようになりました',
        });
      } else {
        toast({
          title: '通知許可が拒否されました',
          description: 'ブラウザ設定から許可してください',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Request permission error:', error);
      toast({
        title: 'エラーが発生しました',
        description: '許可リクエストに失敗しました',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isSupported) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="h-5 w-5" />
            プッシュ通知
          </CardTitle>
          <CardDescription>
            お使いのブラウザはプッシュ通知に対応していません
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isEnabled ? (
            <Bell className="h-5 w-5 text-success-foreground" />
          ) : (
            <BellOff className="h-5 w-5 text-muted-foreground" />
          )}
          プッシュ通知設定
        </CardTitle>
        <CardDescription>
          新しい予約が入ったときにデスクトップ通知を受け取る
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {permission === 'denied' && (
          <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-md">
            <p className="text-sm text-destructive">
              通知がブロックされています。ブラウザの設定から許可してください。
            </p>
          </div>
        )}

        {permission === 'default' && (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">通知許可が必要です</p>
              <p className="text-sm text-muted-foreground">
                プッシュ通知を受け取るために許可してください
              </p>
            </div>
            <Button
              onClick={handleRequestPermission}
              disabled={isLoading}
              size="sm"
            >
              許可する
            </Button>
          </div>
        )}

        {permission === 'granted' && (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">
                {isEnabled ? '通知が有効です' : '通知が無効です'}
              </p>
              <p className="text-sm text-muted-foreground">
                {isEnabled 
                  ? '新しい予約の通知を受け取ります' 
                  : '通知を有効にすると予約をすぐに確認できます'
                }
              </p>
            </div>
            <Switch
              checked={isEnabled}
              onCheckedChange={handleToggleNotifications}
              disabled={isLoading}
            />
          </div>
        )}

        <div className="pt-2 border-t">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Settings className="h-3 w-3" />
            PWA機能により、アプリが閉じていても通知を受け取れます
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
