'use client'

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SessionPayload } from '@/lib/types';

interface UseCustomerAuthReturn {
  session: SessionPayload | null;
  isLoading: boolean;
  error: string | null;
}

export function useCustomerAuth(
  orgId: string,
  customerUid?: string
): UseCustomerAuthReturn {
  const [session, setSession] = useState<SessionPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function checkAuth() {
      try {
        setIsLoading(true);
        
        const response = await fetch('/api/auth/session');
        
        if (!response.ok) {
          setError('認証が必要です');
          router.push(`/customer/${orgId}/auth/login`);
          return;
        }

        const data = await response.json();
        const sessionData = data.session as SessionPayload;

        // 組織IDの検証
        if (sessionData.orgId !== orgId) {
          setError('不正なアクセスです');
          router.push(`/customer/${orgId}/auth/login`);
          return;
        }

        // 顧客UIDの検証（提供されている場合のみ）
        if (customerUid && sessionData.customerUid !== customerUid) {
          setError('他の顧客の情報にはアクセスできません');
          router.push(`/customer/${orgId}/auth/login`);
          return;
        }

        setSession(sessionData);
        setError(null);
      } catch (err) {
        console.error('[useCustomerAuth] Error:', err);
        setError('エラーが発生しました');
        router.push(`/customer/${orgId}/auth/login`);
      } finally {
        setIsLoading(false);
      }
    }

    checkAuth();
  }, [orgId, customerUid, router]);

  return { session, isLoading, error };
}