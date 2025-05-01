'use client'

import { Doc } from '@/convex/_generated/dataModel'
import { Button } from '@/components/ui/button'
import { Id } from '@/convex/_generated/dataModel'

type StaffViewProps = {
  selectedStaff: Doc<'staff'> | null
  onChangeStaffAction: (staff: Doc<'staff'>, staff_config: Doc<'staff_config'> | null) => void
}

export const StaffView = ({ selectedStaff, onChangeStaffAction }: StaffViewProps) => {

  const staffs  = [
    {
      _id: '1' as Id<'staff'>,
      name: '山田 太郎',
      role: 'stylist',
      imgPath: '',
      _creationTime: 0,
    },
    {
      _id: '2' as Id<'staff'>,
      name: '佐藤 花子',
      role: 'assistant',
      imgPath: '',
      _creationTime: 0,
    },
    {
        _id: '3' as Id<'staff'>,
        name: '山田 太郎',
        role: 'assistant',
        imgPath: '',
        _creationTime: 0,
      },
  ]

  const staffsConfig = [
    {
      _id: '1'  as Id<'staff_config'>,
      staffId: '1' as Id<'staff'>,
      priority: 1,
      extraCharge: 1200
    },
    {
        _id: '2' as Id<'staff_config'>,
        staffId: '2' as Id<'staff'>,
        priority: 100,
        extraCharge: 2200
    },
    {
        _id: '3' as Id<'staff_config'>,
        staffId: '3' as Id<'staff'>,
        priority: 500,
        extraCharge: 1500
    }
]

  return (
    <div>
      <h2 className="text-xl">スタッフを選択</h2>
      <p className="text-gray-600 mb-4">
        担当してほしいスタッフを選択してください。
      </p>
      <div className="space-y-3">
        {staffs.map((staff) => (
          <div key={staff._id} className="flex items-center justify-between border rounded-lg p-4">
            <div>
              <p className="font-medium">{staff.name}</p>
              <p className="text-sm text-gray-500">{staff.role === 'stylist' ? 'スタイリスト' : 'アシスタント'}</p>
            </div>
            <Button
                variant={selectedStaff?._id === staff._id ? 'default' : 'outline'}
                onClick={() => {
                    // スタッフIDに基づいて適切なstaffConfigを取得
                    const staffConfig = staffsConfig.find((config) => config.staffId === staff._id);
                    // スタッフとそのコンフィグを親コンポーネントに渡す
                    onChangeStaffAction(staff as unknown as Doc<'staff'>, staffConfig as unknown as Doc<'staff_config'>);
                }}
            >
                {selectedStaff?._id === staff._id ? '選択中' : '選択する'}
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}