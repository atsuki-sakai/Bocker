// app/(dashboard)/dashboard/staff/components/InviteManagement.tsx
// 招待管理コンポーネント - 招待状況の確認・再送・キャンセル機能
'use client'

import { useState, useEffect } from 'react'
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
import { Mail, RefreshCw, Trash2, Clock, XCircle, AlertCircle, Users, UserPlus } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { formatDistanceToNow } from 'date-fns'
import { ja } from 'date-fns/locale'
import { formatTimestamp } from '@/lib/schedules'

// 招待データの型定義（Convex + Clerkの統合データ）
interface StaffInvitation {
  // Convexデータ
  staff_id: string
  name: string
  email: string
  gender: string
  age?: number
  tags: string[]
  created_at: number
  
  // Clerk招待データ
  invitation_id: string | null
  invitation_status: 'pending' | 'missing'
  invitation_created_at: number | null
  
  // メタデータ
  metadata: {
    tenant_id: string
    org_id: string
    role: string
    staff_id: string
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

  // コンポーネントの状態管理
  const [invitations, setInvitations] = useState<StaffInvitation[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [selectedInvitation, setSelectedInvitation] = useState<StaffInvitation | null>(null)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  // 初回読み込み時に招待一覧を取得
  useEffect(() => {
    if (tenantId && orgId) {
      fetchInvitations()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, orgId])

  // 招待一覧を取得する関数
  const fetchInvitations = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(
        `/api/clerk/staff/invitations?tenant_id=${tenantId}&org_id=${orgId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '招待一覧の取得に失敗しました')
      }

      setInvitations(data.invitations || [])
    } catch (error) {
      showErrorToast(error)
    } finally {
      setIsLoading(false)
    }
  }

  // 招待一覧を更新する関数
  const refreshInvitations = async () => {
    setIsRefreshing(true)
    await fetchInvitations()
    setIsRefreshing(false)
    toast.success('招待一覧を更新しました')
  }

  // 招待を再送する関数
  const resendInvitation = async (invitation: StaffInvitation) => {
    setIsProcessing(true)
    try {
      const response = await fetch('/api/clerk/staff/invitations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          staff_id: invitation.staff_id,
          invitation_id: invitation.invitation_id,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '招待の再送に失敗しました')
      }

      toast.success(`${invitation.email} に招待メールを再送しました`)
      await fetchInvitations() // 一覧を更新
    } catch (error) {
      showErrorToast(error)
    } finally {
      setIsProcessing(false)
    }
  }

  // 招待をキャンセルする関数
  const cancelInvitation = async (invitation: StaffInvitation) => {
    setIsProcessing(true)
    try {
      const url = invitation.invitation_id 
        ? `/api/clerk/staff/invitations/${invitation.invitation_id}?staff_id=${invitation.staff_id}`
        : `/api/clerk/staff/invitations/cancel?staff_id=${invitation.staff_id}`
        
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '招待のキャンセルに失敗しました')
      }

      toast.success(`${invitation.email} の招待をキャンセルしました`)
      setShowCancelDialog(false)
      setSelectedInvitation(null)
      await fetchInvitations() // 一覧を更新
    } catch (error) {
      showErrorToast(error)
    } finally {
      setIsProcessing(false)
    }
  }

  // ロール表示を日本語に変換
  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'staff':
        return 'スタッフ'
      case 'manager':
        return 'マネージャー'
      case 'owner':
        return 'オーナー'
      case 'admin':
        return '管理者'
      default:
        return role
    }
  }

  // 性別表示を日本語に変換
  const getGenderDisplayName = (gender: string) => {
    switch (gender) {
      case 'male':
        return '男性'
      case 'female':
        return '女性'
      case 'unselected':
        return '未選択'
      default:
        return gender
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
          <Button
            variant="outline"
            size="sm"
            onClick={refreshInvitations}
            disabled={isRefreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            更新
          </Button>
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
                    className="border rounded-lg p-4 bg-muted/30"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <UserPlus className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{invitation.name}</span>
                          <span className="text-sm text-muted-foreground">({invitation.email})</span>
                          {invitation.metadata && (
                            <Badge
                              variant="default"
                              className="text-xs"
                            >
                              {getRoleDisplayName(invitation.metadata.role)}
                            </Badge>
                          )}
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
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>{getGenderDisplayName(invitation.gender)}</span>
                          {invitation.age && <span>{invitation.age}歳</span>}
                          {invitation.tags.length > 0 && (
                            <div className="flex gap-1">
                              {invitation.tags.map((tag, index) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            登録日:{' '}
                            {formatDistanceToNow(new Date(invitation.created_at), {
                              addSuffix: true,
                              locale: ja,
                            })}
                          </div>
                          {invitation.invitation_created_at && (
                            <div className="flex items-center gap-1">
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
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => resendInvitation(invitation)}
                          disabled={isProcessing}
                          className="flex items-center gap-1"
                        >
                          <RefreshCw className="h-3 w-3" />
                          {invitation.invitation_id ? '再送' : '送信'}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            setSelectedInvitation(invitation)
                            setShowCancelDialog(true)
                          }}
                          disabled={isProcessing}
                          className="flex items-center gap-1"
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