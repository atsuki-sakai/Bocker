'use client'

import { useState } from 'react'
import { useUser } from '@clerk/nextjs'
import {
  MailIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  StarIcon,
  MailQuestionIcon,
  LoaderCircleIcon,
  SendIcon,
  RefreshCwIcon,
  Trash2,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import type { ClerkEmailAddress } from '@/lib/types'

export default function EmailPreferencesPage() {
  const { user, isLoaded } = useUser()
  const [isProcessing, setIsProcessing] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [resendingEmailId, setResendingEmailId] = useState<string | null>(null)

  if (!isLoaded) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <LoaderCircleIcon className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-2">
        <AlertCircleIcon className="h-12 w-12 text-destructive" />
        <h2 className="text-xl font-semibold">認証エラー</h2>
        <p className="text-muted-foreground">ユーザー情報が読み込めません</p>
      </div>
    )
  }

  // Clerkのメールアドレスをマッピング
  const emailAddresses: ClerkEmailAddress[] = user.emailAddresses.map((email) => ({
    id: email.id,
    emailAddress: email.emailAddress,
    verification: email.verification,
    primary: email.id === user.primaryEmailAddressId,
  }))

  const setPrimaryEmail = async (emailId: string) => {
    try {
      setIsProcessing(true)
      const emailToSet = user.emailAddresses.find((email) => email.id === emailId)

      if (emailToSet) {
        // プライマリーメールアドレスを変更
        await user.update({
          primaryEmailAddressId: emailId,
        })

        toast.success('プライマリーメールアドレスを変更しました', {
          description: 'ログイン情報が更新されました',
          icon: <CheckCircleIcon className="h-4 w-4 text-active" />,
        })
      }
    } catch (error) {
      console.error('Error setting primary email:', error)
      toast.error('メールアドレスの更新に失敗しました', {
        description: 'もう一度お試しください',
        icon: <AlertCircleIcon className="h-4 w-4 text-destructive" />,
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const deleteEmail = async (emailId: string) => {
    try {
      setIsProcessing(true)
      const emailToDelete = user.emailAddresses.find((email) => email.id === emailId)

      if (emailToDelete) {
        // プライマリーメールアドレスは削除できない
        if (emailToDelete.id === user.primaryEmailAddressId) {
          toast.error('プライマリーメールアドレスは削除できません', {
            description: '別のメールアドレスをプライマリーに設定してから削除してください',
            icon: <AlertCircleIcon className="h-4 w-4 text-destructive" />,
          })
          return
        }
        // 認証済みのメールアドレスのみ削除可能
        if (emailToDelete.verification?.status !== 'verified') {
          toast.error('認証済みのメールアドレスのみ削除できます', {
            description: 'まずはメールを認証してから削除してください',
            icon: <AlertCircleIcon className="h-4 w-4 text-destructive" />,
          })
          return
        }

        // メールアドレスを削除
        await emailToDelete.destroy()
        toast.success('メールアドレスを削除しました', {
          icon: <CheckCircleIcon className="h-4 w-4 text-active" />,
        })
      }
    } catch (error) {
      console.error('Error deleting email:', error)
      toast.error('メールアドレスの削除に失敗しました', {
        description: 'もう一度お試しください',
        icon: <AlertCircleIcon className="h-4 w-4 text-destructive" />,
      })
    } finally {
      setIsProcessing(false)
      setShowDeleteDialog(false)
    }
  }

  const resendVerificationEmail = async (emailId: string) => {
    try {
      setResendingEmailId(emailId)
      const emailToVerify = user.emailAddresses.find((email) => email.id === emailId)

      if (emailToVerify) {
        // 認証メールを再送信
        await emailToVerify.prepareVerification({
          strategy: 'email_link',
          redirectUrl: window.location.origin + `/dashboard/setting/email-preferences`,
        })

        toast.success('認証メールを送信しました', {
          description: 'メールを確認して認証を完了してください',
          icon: <SendIcon className="h-4 w-4 text-active" />,
        })
      }
    } catch (error) {
      console.error('Error resending verification email:', error)
      toast.error('認証メールの送信に失敗しました', {
        description: 'もう一度お試しください',
        icon: <AlertCircleIcon className="h-4 w-4 text-destructive" />,
      })
    } finally {
      setResendingEmailId(null)
    }
  }

  return (
    <>
      <div className="space-y-4 grid grid-cols-1 md:grid-cols-2">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xl font-bold">
            <MailIcon className="h-4 w-4 text-primary" />
            登録済みメールアドレス
          </div>
          <div className="text-sm text-muted-foreground">
            <p className="my-2 text-sm">
              プライマリーに設定されたメールアドレスがログインとシステム通知に使用されます。
            </p>
          </div>
        </div>
        <div>
          {emailAddresses.length === 0 ? (
            <div className="p-4 border rounded-lg text-center text-muted-foreground flex flex-col items-center gap-2">
              <MailQuestionIcon className="h-10 w-10" />
              <p>メールアドレスが登録されていません</p>
            </div>
          ) : (
            <div className="space-y-3">
              {emailAddresses.map((email) => (
                <div
                  key={email.id}
                  className={`p-4 border rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 
                                ${email.primary ? 'bg-muted border-border' : ''}`}
                >
                  <div className="flex items-center gap-2 flex-1">
                    {!email.primary && email.verification?.status === 'verified' && (
                      <div className="mr-2">
                        <Button
                          onClick={() => {
                            setShowDeleteDialog(true)
                          }}
                          variant="outline"
                          size="icon"
                          className="p-0 border border-secondary hover:bg-muted hover:text-secondary-foreground"
                          disabled={isProcessing}
                        >
                          <Trash2 className="h-5 w-5 flex-shrink-0" />
                        </Button>
                      </div>
                    )}
                    <MailIcon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap gap-2 items-center">
                        <span className="font-light tracking-wide break-all">
                          {email.emailAddress}
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {email.primary && (
                            <Badge className="bg-primary text-primary-foreground">
                              <StarIcon className="h-3 w-3 mr-1" />
                              プライマリー
                            </Badge>
                          )}
                          {email.verification?.status === 'verified' ? (
                            <Badge
                              variant="outline"
                              className="text-active-foreground border-active-foreground bg-active"
                            >
                              <CheckCircleIcon className="h-3 w-3 mr-1" />
                              認証済み
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-warning-foreground border-warning-foreground bg-warning"
                            >
                              <AlertCircleIcon className="h-3 w-3 mr-1" />
                              未認証
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    {/* 未認証のメールアドレスに認証メール再送信ボタンを表示 */}
                    {email.verification?.status !== 'verified' && (
                      <Button
                        variant="outline"
                        className="flex-1 sm:flex-initial border-border border "
                        onClick={() => resendVerificationEmail(email.id)}
                        disabled={isProcessing || resendingEmailId === email.id}
                      >
                        {resendingEmailId === email.id ? (
                          <>
                            <RefreshCwIcon className="h-4 w-4 mr-2 animate-spin" />
                            送信中...
                          </>
                        ) : (
                          <>
                            <SendIcon className="h-4 w-4 mr-2" />
                            認証メール再送信
                          </>
                        )}
                      </Button>
                    )}

                    {!email.primary && email.verification?.status === 'verified' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 sm:flex-initial"
                        onClick={() => setPrimaryEmail(email.id)}
                        disabled={isProcessing}
                      >
                        <StarIcon className="h-4 w-4 mr-2" />
                        プライマリーに設定
                      </Button>
                    )}

                    {!email.primary && email.verification?.status === 'verified' && (
                      <Dialog
                        open={showDeleteDialog}
                        onOpenChange={() => setShowDeleteDialog(!showDeleteDialog)}
                      >
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>メールアドレスを削除しますか？</DialogTitle>
                            <DialogDescription>
                              このメールアドレスでのログインができなくなります。
                            </DialogDescription>
                          </DialogHeader>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                              キャンセル
                            </Button>
                            <Button variant="destructive" onClick={() => deleteEmail(email.id)}>
                              削除
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
