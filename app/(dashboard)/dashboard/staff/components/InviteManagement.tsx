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
import { Mail, RefreshCw, Trash2, Clock, XCircle, AlertCircle, Users } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { formatDistanceToNow } from 'date-fns'
import { ja } from 'date-fns/locale'

// 招待データの型定義
interface Invitation {
  id: string
  email: string
  status: string
  created_at: number
  expires_at: number
  metadata: {
    tenant_id: string
    org_id: string
    role: string
    invited_by: string
    invited_at: string
    resent?: boolean
  }
}

export default function InviteManagement() {
  const { tenantId, orgId } = useTenantAndOrganization()
  const { showErrorToast } = useErrorHandler()

  // コンポーネントの状態管理
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [selectedInvitation, setSelectedInvitation] = useState<Invitation | null>(null)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  // 初回読み込み時に招待一覧を取得
  useEffect(() => {
    if (tenantId && orgId) {
      fetchInvitations()
    }
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
  const resendInvitation = async (invitation: Invitation) => {
    setIsProcessing(true)
    try {
      const response = await fetch('/api/clerk/staff/invitations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: invitation.email,
          tenant_id: invitation.metadata.tenant_id,
          org_id: invitation.metadata.org_id,
          role: invitation.metadata.role,
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
  const cancelInvitation = async (invitation: Invitation) => {
    setIsProcessing(true)
    try {
      const response = await fetch(`/api/clerk/staff/invitations/${invitation.id}`, {
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
      default:
        return role
    }
  }

  // 招待の期限切れチェック
  const isExpired = (expiresAt: number) => {
    return new Date().getTime() > expiresAt
  }

  // 招待がない場合の表示
  if (!isLoading && invitations.length === 0) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            招待管理
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="text-muted-foreground mb-2">
              <Mail className="h-12 w-12 mx-auto" />
            </div>
            <p className="text-sm text-muted-foreground">現在、保留中の招待はありません</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            招待管理
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
                    key={invitation.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="border rounded-lg p-4 bg-muted/30"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{invitation.email}</span>
                          <Badge
                            variant={isExpired(invitation.expires_at) ? 'destructive' : 'default'}
                            className="text-xs"
                          >
                            {getRoleDisplayName(invitation.metadata.role)}
                          </Badge>
                          {invitation.metadata.resent && (
                            <Badge variant="outline" className="text-xs">
                              再送済
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            招待日:{' '}
                            {formatDistanceToNow(new Date(invitation.created_at), {
                              addSuffix: true,
                              locale: ja,
                            })}
                          </div>
                          <div className="flex items-center gap-1">
                            {isExpired(invitation.expires_at) ? (
                              <>
                                <XCircle className="h-3 w-3 text-destructive" />
                                <span className="text-destructive">期限切れ</span>
                              </>
                            ) : (
                              <>
                                <AlertCircle className="h-3 w-3 text-warning-foreground" />
                                期限:{' '}
                                {formatDistanceToNow(new Date(invitation.expires_at), {
                                  addSuffix: true,
                                  locale: ja,
                                })}
                              </>
                            )}
                          </div>
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
                          再送
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
                          キャンセル
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
            <DialogTitle>招待をキャンセルしますか？</DialogTitle>
            <DialogDescription>
              {selectedInvitation?.email} への招待をキャンセルします。
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
              {isProcessing ? '処理中...' : '招待をキャンセル'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
