import type { UserJSON} from '@clerk/nextjs/server';
import { Id } from '@/convex/_generated/dataModel'
import { Role } from '@/convex/types';

// 🎨 ClerkのWebhookイベントデータに対する型ガード関数
// dataオブジェクトがUserJSON型であるかを安全にチェックする。
export const isUserEvent = (data: any): data is UserJSON => {
    return data && typeof data.id === 'string' && Array.isArray(data.email_addresses);
  };


export type UserMetadata = {
  org_id: Id<'organization'> | null
  tenant_id: Id<'tenant'> | null
  role: Role | null
}
