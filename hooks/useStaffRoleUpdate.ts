// hooks/useStaffRoleUpdate.ts
// スタッフ権限更新時のClerk連携フック

import { useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { useErrorHandler } from '@/hooks/useErrorHandler'
import { toast } from 'sonner'
import { Id } from '@/convex/_generated/dataModel'
import type { Role } from '@/convex/types'

export const useStaffRoleUpdate = () => {
  const { showErrorToast } = useErrorHandler()
  const updateStaffRoleMutation = useMutation(api.staff.config.mutation.updateRole)

  const updateStaffRole = async (
    staffId: Id<'staff'>,
    clerkUserId: string,
    staffConfigId: Id<'staff_config'>,
    newRole: Role,
  ) => {
    try {
      // 1. Convex側の更新を実行
      const result = await updateStaffRoleMutation({
        staff_id: staffId,
        clerk_user_id: clerkUserId,
        staff_config_id: staffConfigId,
        role: newRole,
      })

      // 2. Clerk側の更新が必要な場合
      if (result) {
        try {
          const response = await fetch('/api/clerk/staff/update-role', {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(result),
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