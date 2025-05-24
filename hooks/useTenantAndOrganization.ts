import { useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { Id } from "@/convex/_generated/dataModel";


export function useTenantAndOrganization() {
  const { getToken, orgRole, orgId, userId, isLoaded, isSignedIn } = useAuth();
  const [tenantId, setTenantId] = useState<Id<'tenant'> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    
    const fetchTenantData = async () => {
      setIsLoading(true);
      setError(null);
      console.log('start')

      try {
        console.log('try')
        if (!isSignedIn) {
          console.log('!isSignedIn')
          setError('Not signed in');
          setIsLoading(false);
          return;
        }
        console.log('isSignedIn2', isSignedIn)

        const token = await getToken({ template: process.env.NEXT_PUBLIC_CONVEX_AUD ?? 'convex' });
        if (!token) {
          console.log('No token')
          setError('No token');
          setIsLoading(false);
          return;
        }
        console.log('token', token)

        const res = await fetch('/api/clerk/private-metadata', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        console.log('res', res)
        const data = await res.json();
        console.log('data', data)
        setTenantId(data.tenant_id);
      } catch (e) {
        setError('Error fetching metadata');
      } finally {
        setIsLoading(false);
      }
    }

    fetchTenantData();
    // 依存配列にorgIdやorgRoleも含めると、組織切り替え時も再取得されます
  },  [isLoaded, isSignedIn, getToken, orgId, orgRole, userId]);

  // FIXME: Roleの型を合わせる
  console.log('tenantId', tenantId)
  console.log('orgId', orgId)
  console.log('userId', userId)
  console.log('orgRole', orgRole)
  console.log('isLoading', isLoading)
  console.log('error', error)
  return {
    tenantId,
    orgId,
    userId,
    orgRole,
    isLoading,
    error,
  };
}
