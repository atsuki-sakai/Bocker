import type { UserJSON, OrganizationJSON } from '@clerk/nextjs/server';

// 🎨 ClerkのWebhookイベントデータに対する型ガード関数
// dataオブジェクトがUserJSON型であるかを安全にチェックする。
export const isUserEvent = (data: any): data is UserJSON => {
    return data && typeof data.id === 'string' && Array.isArray(data.email_addresses);
  };
  
  // dataオブジェクトがOrganizationJSON型であるかを安全にチェックする。
  export const isOrganizationEvent = (data: any): data is OrganizationJSON => {
    return data && typeof data.id === 'string' && typeof data.name === 'string';
  }; 