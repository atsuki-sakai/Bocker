// hooks/useStaffRoleUpdate.ts
// スタッフ権限更新時のClerk連携フック

import { useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { useErrorHandler } from '@/hooks/useErrorHandler'
import { toast } from 'sonner'
import { Id } from '@/convex/_generated/dataModel'

export const useStaffRoleUpdate = () => {
  const { showErrorToast } = useErrorHandler()
  const updateStaffAuth = useMutation(api.staff.auth.mutation.update)

  const updateStaffRole = async (
    staffAuthId: Id<'staff_auth'>,
    newRole: string,
    pinCode?: string
  ) => {
    try {
      // 1. Convex側の更新を実行
      const result = await updateStaffAuth({
        staff_auth_id: staffAuthId,
        role: newRole as any,
        ...(pinCode && { pin_code: pinCode }),
      })

      // 2. Clerk側の更新が必要な場合
      if (result.shouldUpdateClerk && result.clerkUpdateInfo) {
        try {
          const response = await fetch('/api/clerk/staff/update-role', {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(result.clerkUpdateInfo),
          })

          const clerkResult = await response.json()

          if (!response.ok) {
            throw new Error(clerkResult.error || 'Clerk更新に失敗しました')
          }

          // 警告がある場合は表示
          if (clerkResult.warning) {
            toast.warning(clerkResult.warning)
          } else {
            toast.success('スタッフ権限を更新しました')
          }
        } catch (clerkError) {
          console.error('Clerk更新エラー:', clerkError)
          toast.warning('スタッフ権限は更新されましたが、Clerkの権限情報更新に失敗しました')
        }
      } else {
        toast.success('スタッフ権限を更新しました')
      }

      return result
    } catch (error) {
      showErrorToast(error)
      throw error
    }
  }

  return {
    updateStaffRole,
  }
}