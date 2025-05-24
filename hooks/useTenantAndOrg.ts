import { useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";
import { Id } from "@/convex/_generated/dataModel";

// Clerk JWT の型定義（必要に応じて追加）
type ClerkConvexTokenPayload = {
  tenant_id: Id<'tenant'>;
  org_id: string;
};

export function useOrganization() {
  const { getToken, orgRole, orgId, userId, isLoaded, isSignedIn } = useAuth();
  const [tenantId, setTenantId] = useState<Id<'tenant'> | null>(null);
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

        if (!payload.tenant_id) {
          setError("トークンにtenant_idが含まれていません");
          setIsLoading(false);
          return;
        }

        setTenantId(payload.tenant_id);
        setError(null);
      } catch (err) {
        setError("トークンの取得またはデコードに失敗しました");
      } finally {
        setIsLoading(false);
      }
    };

    fetchTenantData();
    // 依存配列にorgIdやorgRoleも含めると、組織切り替え時も再取得されます
  }, [getToken, isLoaded, isSignedIn, orgId, orgRole]);

  return {
    tenantId,
    orgId,
    orgRole,
    userId,
    isLoading,
    error,
  };
}
