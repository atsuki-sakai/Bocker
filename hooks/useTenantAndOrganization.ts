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

      try {
        if (!isSignedIn) {
          setError('Not signed in');
          setIsLoading(false);
          return;
        }

        const token = await getToken();
        if (!token) {
          setError('No token');
          setIsLoading(false);
          return;
        }

        
        const res = await fetch('/api/clerk/private-metadata', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        
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
  return {
    tenantId,
    orgId,
    userId,
    orgRole,
    isLoading,
    error,
  };
}
