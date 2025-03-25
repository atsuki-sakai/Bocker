import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useAction } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { generateStaffToken, hasPermission } from '@/lib/staff-auth';
import Cookies from 'js-cookie';
import { jwtDecode } from 'jwt-decode';
import { STAFF_TOKEN_COOKIE, STAFF_TOKEN_STORAGE_KEY, COOKIE_EXPIRES_DAYS } from '@/lib/constants';

// JWTトークンのペイロード型定義
interface StaffTokenPayload {
  staffId: string;
  salonId: string;
  role: string;
  name?: string | null;
  exp: number;
  iat: number;
}

export interface StaffAuthState {
  isAuthenticated: boolean;
  staffId: Id<'staff'> | null;
  salonId: string | null;
  role: string | null;
  name: string | null;
  loading: boolean;
}

export function useStaffAuth() {
  const router = useRouter();

  // 認証状態
  const [auth, setAuth] = useState<StaffAuthState>({
    isAuthenticated: false,
    staffId: null,
    salonId: null,
    role: null,
    name: null,
    loading: true
  });

  // Convexミューテーションとアクション
  // const verifyEmailMutation = useMutation(api.staff.auth.verifyEmail);
  // const verifyPinAction = useAction(api.staff.auth.verifyPin);

  // トークンを取得する関数（複数のソースから試みる）
  const getToken = useCallback(() => {
    // まずCookieから試す（クライアントからはhttpOnly Cookieにアクセスできないため機能しない）
    let token: string | undefined = Cookies.get(STAFF_TOKEN_COOKIE);
    
    // Cookieになければローカルストレージを試す
    if (!token && typeof window !== 'undefined') {
      try {
        const lsToken = localStorage.getItem(STAFF_TOKEN_STORAGE_KEY);
        if (lsToken) {
          token = lsToken;
        }
      } catch (e) {
        console.error('Failed to access localStorage:', e);
      }
    }
    
    return token;
  }, []);
  
  // トークンを保存する関数（複数の場所に保存）
  const saveToken = useCallback((token: string) => {
    console.log("Saving token to multiple storage locations...");
    
    // Cookieに保存（標準オプション）- httpOnly対策としてのバックアップ
    try {
      Cookies.set(STAFF_TOKEN_COOKIE, token, { 
        expires: COOKIE_EXPIRES_DAYS,
        path: '/',
        // 開発環境でもセキュアを有効にするとlocalhost対応が必要
        secure: false, // 修正: 開発環境ではfalseに
        sameSite: 'lax'
      });
      console.log("Token saved to cookie with standard options");
    } catch (e) {
      console.error('Failed to set cookie with standard options:', e);
    }
    
    // ローカルストレージにもバックアップ（主要なストレージ）
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STAFF_TOKEN_STORAGE_KEY, token);
        console.log("Token saved to localStorage");
      } catch (e) {
        console.error('Failed to save to localStorage:', e);
      }
    }
    
    // 重要: 保存後に確認
    setTimeout(() => {
      const cookieAfter = Cookies.get(STAFF_TOKEN_COOKIE);
      console.log("Cookie check after 100ms:", cookieAfter ? "exists" : "missing");
      if (typeof window !== 'undefined') {
        const lsAfter = localStorage.getItem(STAFF_TOKEN_STORAGE_KEY);
        console.log("LocalStorage check after 100ms:", lsAfter ? "exists" : "missing");
      }
    }, 100);
  }, []);
  
  // トークンを削除する関数（複数の場所から）
  const removeToken = useCallback(() => {
    // Cookieから削除
    try {
      Cookies.remove(STAFF_TOKEN_COOKIE, { path: '/' });

      console.log("Token removed from cookie");
    } catch (e) {
      console.error('Failed to remove cookie:', e);
    }
    
    // ローカルストレージからも削除
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(STAFF_TOKEN_STORAGE_KEY);
        console.log("Token removed from localStorage");
      } catch (e) {
        console.error('Failed to remove from localStorage:', e);
      }
    }
  }, []);

  // 認証状態の取得
  const getAuthState = useCallback(async () => {
    console.log("==== AUTH DEBUG START ====");
    
    // トークンを取得（複数のソースから）
    const token = getToken();
    
    // Cookieライブラリからのすべてのクッキーを取得（デバッグ用）
    const allCookies = Cookies.get();
    console.log("All cookies from js-cookie:", allCookies);
    
    // Cookieの検証
    console.log(`Specific cookie '${STAFF_TOKEN_COOKIE}':`, 
      Cookies.get(STAFF_TOKEN_COOKIE) ? `exists in cookie` : "not in cookie");
    
    // ローカルストレージの検証
    if (typeof window !== 'undefined') {
      try {
        const lsToken = localStorage.getItem(STAFF_TOKEN_STORAGE_KEY);
        console.log(`Token in localStorage:`, lsToken ? `exists` : "not found");
      } catch (e) {
        console.error('Failed to check localStorage:', e);
      }
    }
    
    // 最終的なトークン状態
    console.log("Final token status:", token ? `exists (length: ${token.length})` : "not found anywhere");
    
    if (!token) {
      console.log(`No token found - user is not authenticated`);
      setAuth({
        isAuthenticated: false,
        staffId: null,
        salonId: null,
        role: null,
        name: null,
        loading: false
      });
      console.log("==== AUTH DEBUG END ====");
      return;
    }
    
    // 以下、tokenの検証処理
    try {
      // トークンの形式チェック
      const tokenParts = token.split('.');
      console.log("Token parts count:", tokenParts.length);
      
      if (tokenParts.length !== 3) {
        throw new Error(`Invalid token format: expected 3 parts, got ${tokenParts.length}`);
      }
      
      // トークンをデコードして値を取得
      try {
        const decodedToken = jwtDecode<StaffTokenPayload>(token);
        console.log("decodedToken", decodedToken);
        
        // トークンの有効期限をチェック
        const currentTime = Math.floor(Date.now() / 1000);
        if (decodedToken.exp && decodedToken.exp < currentTime) {
          console.log("Token expired at:", new Date(decodedToken.exp * 1000));
          throw new Error('Token expired');
        }
        
        // デコードした値で認証状態を更新
        setAuth({
          isAuthenticated: true,
          staffId: decodedToken.staffId as unknown as Id<'staff'>,
          salonId: decodedToken.salonId,
          role: decodedToken.role,
          name: decodedToken.name || null,
          loading: false
        });
        console.log("Auth state updated with decoded token data");
      } catch (decodeError) {
        console.error('Failed to decode token:', decodeError);
        throw new Error('Invalid token format or contents');
      }
    } catch (error) {
      console.error('Token verification failed:', error);
      console.log("Removing invalid token");
      // トークンが無効なら削除
      removeToken();
      setAuth({
        isAuthenticated: false,
        staffId: null,
        salonId: null,
        role: null,
        name: null,
        loading: false
      });
    }
    console.log("==== AUTH DEBUG END ====");
  }, [getToken, removeToken]);

  // 初期化時に認証状態を確認
  useEffect(() => {
    getAuthState();
  }, [getAuthState]);

  // ログイン処理 - ステップ1: メール確認
  const verifyEmail = async (email: string, salonId: string) => {
    try {
      // const result = await verifyEmailMutation({ email, salonId });
      // return result;
    } catch (error) {
      console.error('Email verification failed:', error);
      throw error;
    }
  };

  // ログイン処理 - ステップ2: PIN確認 (API経由の実装)
  const loginWithAPI = async (staffId: string, pin: string) => {
    try {
      console.log("==== API LOGIN START ====");
      console.log("Logging in via API with staffId:", staffId);
      
      // リクエストパラメータをログ
      const requestBody = JSON.stringify({ 
        staffId, 
        pin,
        // これらのフィールドは直接staffIdで認証する場合は使用されない（念のため送信）
        salonId: "null" 
      });
      console.log("Request body:", requestBody);
      
      // APIエンドポイントを呼び出し
      try {
        console.log("Calling API endpoint: /api/staff/login");
        const response = await fetch('/api/staff/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: requestBody,
          credentials: 'include' // Cookieを含める
        });
        
        console.log("API Response status:", response.status, response.statusText);
        console.log("API Response headers:", Object.fromEntries([...response.headers.entries()]));
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error("API Error response:", errorText);
          throw new Error(`Login failed: ${response.status} - ${errorText}`);
        }
        
        // レスポンスのコンテンツタイプをチェック
        const contentType = response.headers.get('content-type');
        console.log("Response content type:", contentType);
        
        let data;
        if (contentType && contentType.includes('application/json')) {
          data = await response.json();
          console.log("API login response (parsed JSON):", data);
        } else {
          const textResponse = await response.text();
          console.log("API login response (raw text):", textResponse);
          
          try {
            // テキストからJSONを解析してみる
            data = JSON.parse(textResponse);
            console.log("Manually parsed JSON:", data);
          } catch (jsonError) {
            console.error("Failed to parse response as JSON:", jsonError);
            throw new Error("Unexpected response format from API");
          }
        }
        
        if (data.token) {
          // APIからのレスポンスにトークンが含まれている場合、ローカルストレージに保存
          console.log("Received token from API, length:", data.token.length);
          console.log("Token preview:", data.token.substring(0, 20) + "...");
          saveToken(data.token);
          
          // 保存後すぐに確認
          setTimeout(() => {
            if (typeof window !== 'undefined') {
              try {
                const storedToken = localStorage.getItem(STAFF_TOKEN_STORAGE_KEY);
                console.log("Immediately checking localStorage after save:", 
                  storedToken ? `Token found (length: ${storedToken.length})` : "No token found");
              } catch (e) {
                console.error("Failed to check localStorage:", e);
              }
            }
          }, 10);
        } else {
          console.error("No token received from API. Full response:", data);
        }
        
        // 認証状態を更新
        console.log("Refreshing auth state after API login");
        await getAuthState();
        
        console.log("==== API LOGIN END ====");
        return data.staffData;
      } catch (fetchError) {
        console.error("Fetch error:", fetchError);
        throw fetchError;
      }
    } catch (error) {
      console.error('API login failed:', error);
      console.log("==== API LOGIN END WITH ERROR ====");
      throw error;
    }
  };

  // ログイン処理 - ステップ2: PIN確認 (直接Convexの場合)
  const verifyPin = async (staffId: Id<'staff'>, pin: string) => {
    try {
      console.log("==== VERIFY PIN START ====");
      console.log("staffId:", staffId, "pin:", pin ? "provided" : "empty");
      
      // APIログインを優先的に試行
      try {
        console.log("Attempting to use API login");
        const apiResult = await loginWithAPI(staffId as unknown as string, pin);
        console.log("API login successful");
        return apiResult;
      } catch (apiError) {
        console.warn("API login failed, falling back to direct Convex call:", apiError);
      }
      
      // フォールバック: 直接Convexアクションを呼び出し
      // const result = await verifyPinAction({ staffId, pin });
      // console.log("Direct Convex verifyPin result:", result ? "success" : "failed");
      
      // if (result) {
      //   console.log("Generating token for staff:", result);
        
      //   // JWTトークンを生成
      //   const token = await generateStaffToken({
      //     staffId: staffId as unknown as string,
      //     salonId: result.salonId,
      //     role: result.role || 'staff',
      //     name: result.name
      //   });
        
      //   console.log("Generated token length:", token.length);
      //   console.log("Token preview:", token.substring(0, 20) + "...");
        
      //   // トークンを保存（Cookie + LocalStorage）
      //   saveToken(token);
        
      //   // 認証状態を更新
      //   console.log("Refreshing auth state");
      //   await getAuthState();
        
      //   console.log("==== VERIFY PIN END ====");
      //   return result;
      // }
      
      console.log("verifyPin failed: No result returned");
      console.log("==== VERIFY PIN END ====");
      return null;
    } catch (error) {
      console.error('PIN verification failed:', error);
      console.log("==== VERIFY PIN END WITH ERROR ====");
      throw error;
    }
  };

  // ログアウト処理
  const logout = (salonId: string) => {
    console.log("Logging out, removing all auth data");
    // トークンを削除
    removeToken();
    
    // 認証状態をリセット
    setAuth({
      isAuthenticated: false,
      staffId: null,
      salonId: null,
      role: null,
      name: null,
      loading: false
    });
    
    // Clerkセッションがあれば優先してダッシュボードにリダイレクト
    // そうでなければスタッフログインページにリダイレクト
    try {
      // ローカルストレージをチェックして、Clerkセッションが存在するか確認
      const hasClerkSession = typeof window !== 'undefined' && 
        localStorage.getItem('clerk-db') !== null;
      
      if (hasClerkSession) {
        // Clerkセッションがある場合はリロードして既存のダッシュボードを表示
        window.location.reload();
      } else {
        // デフォルトサロンIDでログインページにリダイレクト
        router.push(`/staff-auth/${salonId}`);
      }
    } catch (e) {
      console.error('Error during logout redirection:', e);
      // エラーが発生した場合は安全にスタッフログインへ
      router.push(`/staff-auth/${salonId}`);
    }
  };

  // 権限チェック
  const checkPermission = (requiredRole: string) => {
    if (!auth.role) return false;
    return hasPermission(auth.role, requiredRole);
  };

  return {
    ...auth,
    verifyEmail,
    verifyPin,
    logout,
    checkPermission,
    refreshAuth: getAuthState
  };
}