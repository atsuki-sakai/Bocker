'use client'

import Image from 'next/image'
import Link from 'next/link'
import { api } from '@/convex/_generated/api'
import { useTenantAndOrganization } from '@/hooks/useTenantAndOrganization'
import { Loading } from '@/components/common'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import InviteManagement from './_components/InviteManagement'
import { useQuery } from 'convex/react'
import { CheckCircleIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'

export default function StaffList() {
  const t = useTranslations()
  const { tenantId, orgId } = useTenantAndOrganization()

  // 招待状態を含むスタッフ一覧を取得
  const staffsWithInvitation = useQuery(
    api.staff.invitation.query.getStaffWithInvitationStatus,
    tenantId && orgId
      ? {
          tenant_id: tenantId,
          org_id: orgId,
          includeInactive: true, // 招待中のスタッフも含める
        }
      : 'skip'
  )

  if (!staffsWithInvitation) {
    return <Loading />
  }

  return (
    <div className="space-y-6">
      {/* 招待管理コンポーネント */}
      <InviteManagement />

      {/* スタッフ一覧テーブル */}
      <div className="mt-2 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8 px-4 md:px-0">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <div className="overflow-hidden border border-border rounded-lg">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-muted text-nowrap px-2">
                  <tr>
                    <th
                      scope="col"
                      className="py-3.5 pr-3 pl-4 text-left text-sm font-semibold text-muted-foreground sm:pl-6"
                    >
                      {t('staff.list.status')}
                    </th>

                    <th
                      scope="col"
                      className="py-3.5 pr-3 pl-4 text-left text-sm font-semibold text-muted-foreground sm:pl-6"
                    >
                      {t('staff.list.image')}
                    </th>
                    <th
                      scope="col"
                      className="py-3.5 pr-3 pl-4 text-left text-sm font-semibold text-muted-foreground sm:pl-6"
                    >
                      {t('staff.list.name')}
                    </th>
                    <th
                      scope="col"
                      className="py-3.5 pr-3 pl-4 text-left text-sm font-semibold text-muted-foreground sm:pl-6"
                    >
                      {t('staff.list.description')}
                    </th>
                    <th scope="col" className="relative py-3.5 pr-4 pl-3 sm:pr-6">
                      <span className="sr-only">{t('staff.list.details')}</span>
                    </th>
                    <th scope="col" className="relative py-3.5 pr-4 pl-3 sm:pr-6">
                      <span className="sr-only">{t('staff.list.edit')}</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-background text-nowrap">
                  {staffsWithInvitation && staffsWithInvitation.length > 0 ? (
                    staffsWithInvitation.map((staff, index: number) => (
                      <tr key={index}>
                        <td className="py-4 pr-3 pl-4 text-xs font-medium whitespace-nowrap text-muted-foreground sm:pl-6">
                          {staff.is_active ? (
                            <Badge variant="outline" className="bg-active-foreground text-active">
                              {t('staff.active')}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-muted  text-muted-foreground">
                              {t('staff.inactive')}
                            </Badge>
                          )}
                        </td>

                        <td className="px-3 py-4 text-sm whitespace-nowrap text-muted-foreground">
                          {staff.images && staff.images.length > 0 ? (
                            <div className="relative w-12 h-12 bg-muted flex items-center justify-center">
                              <Image
                                src={staff.images[0].thumbnail_url}
                                alt={staff.name ?? ''}
                                layout="fill"
                                objectFit="cover"
                                className="object-cover rounded-md"
                              />
                              {staff.connect_clerk ? (
                                <div className="bg-active-foreground text-active border-active p-1 rounded-full absolute -top-2 -right-2">
                                  <CheckCircleIcon className="h-3 w-3" />
                                </div>
                              ) : null}
                            </div>
                          ) : (
                            <div className="w-10 h-10  bg-muted rounded-full text-center flex items-center justify-center ">
                              <span className="uppercase font-bold text-muted-foreground">
                                {staff.name?.charAt(0)}
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-4 text-sm whitespace-nowrap text-muted-foreground">
                          {staff.name ?? t('staff.list.notSet')}
                        </td>
                        <td className="px-3 py-4 text-sm whitespace-nowrap text-muted-foreground">
                          {staff.description && staff.description.length > 20 ? (
                            <div className="line-clamp-2">{staff.description.slice(0, 20)}...</div>
                          ) : (
                            <div className="text-muted-foreground">{staff.description}</div>
                          )}
                        </td>

                        <td className="relative py-4 pr-4 pl-3 text-right text-sm font-medium whitespace-nowrap sm:pr-6">
                          <Link
                            href={`/dashboard/staff/${staff._id}`}
                            className="text-purple-600 hover:text-purple-900"
                          >
                            <Button variant="ghost" size="sm">
                              <span>{t('staff.list.details')}</span>
                            </Button>
                          </Link>
                        </td>
                        <td className="relative py-4 pr-4 pl-3 text-right text-sm font-medium whitespace-nowrap sm:pr-6">
                          <Link
                            href={`/dashboard/staff/${staff._id}/edit`}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            <Button variant="ghost" size="sm">
                              <span>{t('staff.list.edit')}</span>
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr className="h-24 text-center">
                      <td colSpan={12} className="text-sm text-gray-500">
                        {t('staff.list.noStaff')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
