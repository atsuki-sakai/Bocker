import { useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";
import { Id } from "@/convex/_generated/dataModel";
import type { Role } from "@/convex/types";
import { Loading } from "@/components/common";

// Clerk JWT の型定義（必要に応じて追加）
type ClerkConvexTokenPayload = {
  tenant_id: Id<'tenant'>;
};

export function useTenantAndOrganization() {
  const { getToken, orgRole, orgId, userId, isLoaded, isSignedIn } = useAuth();
  const [tenantId, setTenantId] = useState<Id<'tenant'> | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTenantData = async () => {
      if (!isLoaded) return;

      if (!isSignedIn) {
        setError("ユーザーがサインインしていません");
        setIsLoading(false);
        return;
      }

      try {
        const token = await getToken({ template: "convex" });
        if (!token) {
          setError("認証トークンが見つかりませんでした");
          setIsLoading(false);
          return;
        }

        
        // jwt-decodeで安全にデコード
        const payload = jwtDecode<ClerkConvexTokenPayload>(token);

        console.log('payload', payload)
        if (!payload.tenant_id) {
          setError("トークンにtenant_idが含まれていません");
          setIsLoading(false);
          return;
        }

        setTenantId(payload.tenant_id);
        
        setError(null);

        if(orgRole) {
          // clerkのroleをconvexのroleに変換
          setRole(orgRole.split(':')[1] as Role);
        }
      } catch (err) {
        setError("トークンの取得またはデコードに失敗しました");
      } finally {
        setIsLoading(false);
      }
    };

    fetchTenantData();
    // 依存配列にorgIdやorgRoleも含めると、組織切り替え時も再取得されます
  }, [getToken, isLoaded, isSignedIn, orgId, orgRole, userId]);

  // FIXME: Roleの型を合わせる
  return {
    tenantId,
    orgId,
    role,
    userId,
    isLoading,
    error,
  };
}
