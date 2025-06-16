// app/(dashboard)/dashboard/staff/components/InviteManagement.tsx
// 招待管理コンポーネント - 招待状況の確認・再送・キャンセル機能
'use client'

import { useState } from 'react'
import { convertRole } from '@/convex/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { useTenantAndOrganization } from '@/hooks/useTenantAndOrganization'
import { useErrorHandler } from '@/hooks/useErrorHandler'
import { Mail, RefreshCw, Trash2, Clock, AlertCircle, Users, UserPlus } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { formatDistanceToNow } from 'date-fns'
import { ja } from 'date-fns/locale'
import { Role, Gender, InvitationStatus } from '@/convex/types'
import { Id } from '@/convex/_generated/dataModel'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'

// 招待データの型定義（Convex + Clerkの統合データ）
interface StaffInvitation {
  // Convexデータ
  staff_id: Id<'staff'>
  name: string
  email: string
  gender: Gender
  age?: number
  tags: string[]
  created_at: number

  // Clerk招待データ
  invitation_id: string | null
  invitation_status: InvitationStatus
  invitation_created_at: number | null

  // メタデータ
  metadata: {
    tenant_id: Id<'tenant'>
    org_id: Id<'organization'>
    role: Role
    staff_id: Id<'staff'>
    extra_charge?: number
    priority?: number
    invited_by?: string
    invited_at?: string
    resent?: boolean
  } | null
}

export default function InviteManagement() {
  const { tenantId, orgId } = useTenantAndOrganization()
  const { showErrorToast } = useErrorHandler()

  // Convexクエリで招待中スタッフを取得
  const pendingStaff = useQuery(
    api.staff.invitation.query.listPending,
    tenantId && orgId ? { tenant_id: tenantId, org_id: orgId } : 'skip'
  )

  // コンポーネントの状態管理
  const [selectedInvitation, setSelectedInvitation] = useState<StaffInvitation | null>(null)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  // pendingStaffをStaffInvitation型に変換
  const invitations: StaffInvitation[] =
    pendingStaff?.map((staff) => ({
      // Convexデータ
      staff_id: staff._id,
      name: staff.name,
      email: staff.invitation_email || '',
      gender: staff.config?.gender || ('unselected' as Gender),
      age: staff.config?.age,
      tags: staff.config?.tags || [],
      created_at: staff._creationTime,

      // 招待データ
      invitation_id: staff.clerk_invitation_id || null,
      invitation_status: staff.invitation_status || 'pending',
      invitation_created_at: staff._creationTime,

      // メタデータ
      metadata: {
        tenant_id: staff.tenant_id,
        org_id: staff.org_id,
        role: staff.config?.role || ('staff' as Role),
        staff_id: staff._id,
        extra_charge: staff.config?.extra_charge,
        priority: staff.config?.priority,
        resent: false,
      },
    })) || []

  const isLoading = pendingStaff === undefined

  // 招待を再送する関数
  const resendInvitation = async (invitation: StaffInvitation) => {
    setIsProcessing(true)
    try {
      const response = await fetch('/api/clerk/staff/invitations/resend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          staff_id: invitation.staff_id,
          invitation_id: invitation.invitation_id,
          org_id: orgId,
        }),
      })

      if (!response.ok) {
        const contentType = response.headers.get('content-type')
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json()
          throw new Error(data.error || '招待の再送に失敗しました')
        } else {
          throw new Error('招待の再送に失敗しました')
        }
      }

      toast.success(`${invitation.email} に招待メールを再送しました`)
    } catch (error) {
      console.error('Failed to resend invitation:', error)
      showErrorToast(error)
    } finally {
      setIsProcessing(false)
    }
  }

  // 招待をキャンセルする関数
  const cancelInvitation = async (invitation: StaffInvitation) => {
    setIsProcessing(true)
    try {
      // Clerk側の招待もキャンセル（APIエンドポイント経由）
      if (invitation.invitation_id) {
        const response = await fetch(
          `/api/clerk/staff/invitations/${invitation.invitation_id}?staff_id=${invitation.staff_id}`,
          {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
            },
          }
        )

        if (!response.ok) {
          const contentType = response.headers.get('content-type')
          if (contentType && contentType.includes('application/json')) {
            const data = await response.json()
            throw new Error(data.error || 'Clerk招待のキャンセルに失敗しました')
          } else {
            throw new Error('Clerk招待のキャンセルに失敗しました')
          }
        }
      } else {
        toast.error('招待IDが見つかりません')
      }

      toast.success(`${invitation.email} の招待をキャンセルしました`)
      setShowCancelDialog(false)
      setSelectedInvitation(null)
      // Convexは自動的に更新されるため、手動更新は不要
    } catch (error) {
      showErrorToast(error)
    } finally {
      setIsProcessing(false)
    }
  }

  if (isLoading) {
    return null
  }

  // 招待がない場合の表示
  if (!isLoading && invitations.length === 0) {
    return null
  }

  return (
    <>
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            スタッフ招待管理
            {invitations.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {invitations.length}件
              </Badge>
            )}
          </CardTitle>
          {/* Convexは自動更新されるため、更新ボタンは不要 */}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-link-primary mb-2"></div>
                <p className="text-sm text-muted-foreground">読み込み中...</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <AnimatePresence>
                {invitations.map((invitation) => (
                  <motion.div
                    key={invitation.staff_id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="border rounded-lg p-3 bg-muted/30"
                  >
                    <div className="flex flex-col md:flex-row items-center justify-between">
                      <div className="flex-1">
                        <div className="flex flex-col items-start justify-start gap-2 w-full">
                          {invitation.metadata && (
                            <Badge variant="default" className="text-xs text-nowrap">
                              {convertRole(invitation.metadata.role)}
                            </Badge>
                          )}
                          <div className="flex items-center gap-2">
                            <UserPlus className="h-6 w-6 text-neon" />
                            <p className="text-sm text-neon w-full">({invitation.email})</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {invitation.invitation_status === 'missing' && (
                              <Badge variant="destructive" className="text-xs">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                招待エラー
                              </Badge>
                            )}
                            {invitation.metadata?.resent && (
                              <Badge variant="outline" className="text-xs">
                                再送済
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                          <div className="flex items-center gap-1 text-nowrap">
                            <Clock className="h-3 w-3" />
                            登録日:{' '}
                            {formatDistanceToNow(new Date(invitation.created_at), {
                              addSuffix: true,
                              locale: ja,
                            })}
                          </div>
                          {invitation.invitation_created_at && (
                            <div className="flex items-center gap-1 text-nowrap">
                              <Mail className="h-3 w-3" />
                              招待送信:{' '}
                              {formatDistanceToNow(new Date(invitation.invitation_created_at), {
                                addSuffix: true,
                                locale: ja,
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-end gap-2 w-full mt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => resendInvitation(invitation)}
                          disabled={isProcessing}
                          className="flex items-center gap-1 bg-link text-link-foreground hover:text-link-foreground"
                        >
                          <RefreshCw className="h-3 w-3" />
                          {invitation.invitation_id ? '再送' : '送信'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedInvitation(invitation)
                            setShowCancelDialog(true)
                          }}
                          disabled={isProcessing}
                          className="flex items-center gap-1 text-destructive bg-destructive-foreground hover:text-destructive-foreground"
                        >
                          <Trash2 className="h-3 w-3" />
                          削除
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </CardContent>
      </Card>

      {/* キャンセル確認ダイアログ */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>スタッフ招待を削除しますか？</DialogTitle>
            <DialogDescription>
              {selectedInvitation?.name} ({selectedInvitation?.email}) の招待を削除します。
              この操作は元に戻すことができません。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCancelDialog(false)}
              disabled={isProcessing}
            >
              キャンセル
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedInvitation && cancelInvitation(selectedInvitation)}
              disabled={isProcessing}
            >
              {isProcessing ? '処理中...' : 'スタッフを削除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
