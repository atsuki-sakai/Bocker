import { DashboardSection } from '@/components/common';

const dammmyMenus = [
  {
    menuId: '1',
    name: 'メニュー1',
    price: 1000,
    salePrice: 800,
    timeToMin: 30,
    category: 'カテゴリ1',
    imgPath: 'https://via.placeholder.com/150',
    description: 'メニュー1の説明',
    couponIds: ['1', '2'],
    targetGender: '男性',
    tags: ['タグ1', 'タグ2'],
    paymentMethod: 'cash',
  },
  {
    menuId: '2',
    name: 'メニュー2',
    price: 1000,
    salePrice: 800,
    timeToMin: 30,
    category: 'カテゴリ2',
    imgPath: 'https://via.placeholder.com/150',
    description: 'メニュー2の説明',
    couponIds: ['1', '2'],
    targetGender: '女性',
    tags: ['タグ1', 'タグ2'],
    paymentMethod: 'cash',
  },
  {
    menuId: '3',
    name: 'メニュー3',
    price: 1000,
    salePrice: 800,
    timeToMin: 30,
    category: 'カテゴリ3',
    imgPath: 'https://via.placeholder.com/150',
    description: 'メニュー3の説明',
    couponIds: ['1', '2'],
    targetGender: '男性',
    tags: ['タグ1', 'タグ2'],
    paymentMethod: 'cash',
  },
];

const availableStaffs = [
  {
    salonId: '1',
    menuId: '1',
    staffId: '1',
    staffName: 'スタッフ1',
  },
  {
    salonId: '1',
    menuId: '2',
    staffId: '2',
    staffName: 'スタッフ2',
  },
  {
    salonId: '1',
    menuId: '1',
    staffId: '3',
    staffName: 'スタッフ3',
  },
  {
    salonId: '1',
    menuId: '2',
    staffId: '2',
    staffName: 'スタッフ2',
  },
  {
    salonId: '1',
    menuId: '1',
    staffId: '3',
    staffName: 'スタッフ3',
  },
  {
    salonId: '1',
    menuId: '2',
    staffId: '2',
    staffName: 'スタッフ2',
  },
  {
    salonId: '1',
    menuId: '1',
    staffId: '3',
    staffName: 'スタッフ3',
  },
  {
    salonId: '1',
    menuId: '2',
    staffId: '2',
    staffName: 'スタッフ2',
  },
  {
    salonId: '1',
    menuId: '1',
    staffId: '3',
    staffName: 'スタッフ3',
  },
];

export default function MenuForm() {
  return (
    <DashboardSection
      title="メニュー設定"
      backLink="/dashboard"
      backLinkTitle="ダッシュボードに戻る"
      infoBtn={{
        text: '新規メニューを作成',
        link: '/dashboard/menu/create',
      }}
    >
      <div className="w-full flex flex-col gap-4">
        <div className="mt-8 flow-root">
          <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
              <div className="overflow-hidden ring-1 shadow-sm ring-black/5 sm:rounded-lg">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th
                        scope="col"
                        className="py-3.5 pr-3 pl-4 text-left text-sm font-semibold text-gray-900 sm:pl-6"
                      >
                        画像
                      </th>
                      <th
                        scope="col"
                        className="py-3.5 pr-3 pl-4 text-left text-sm font-semibold text-gray-900 sm:pl-6"
                      >
                        メニュー名
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                      >
                        価格
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                      >
                        セール価格
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                      >
                        時間
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                      >
                        カテゴリ
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                      >
                        タグ
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                      >
                        対応可能スタッフ
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                      >
                        支払い方法
                      </th>
                      <th scope="col" className="relative py-3.5 pr-4 pl-3 sm:pr-6">
                        <span className="sr-only">Edit</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {dammmyMenus.map((menu) => (
                      <tr key={menu.name}>
                        <td className="py-4 pr-3 pl-4 text-sm font-medium whitespace-nowrap text-gray-900 sm:pl-6">
                          <img src={menu.imgPath} alt={menu.name} className="w-10 h-10" />
                        </td>
                        <td className="py-4 pr-3 pl-4 text-sm font-medium whitespace-nowrap text-gray-900 sm:pl-6">
                          {menu.name}
                        </td>
                        <td className="px-3 py-4 text-sm whitespace-nowrap text-gray-500">
                          {menu.price}
                        </td>
                        <td className="px-3 py-4 text-sm whitespace-nowrap text-gray-500">
                          {menu.salePrice}
                        </td>
                        <td className="px-3 py-4 text-sm whitespace-nowrap text-gray-500">
                          {menu.timeToMin}
                        </td>
                        <td className="px-3 py-4 text-sm whitespace-nowrap text-gray-500">
                          {menu.category}
                        </td>
                        <td className="px-3 py-4 text-sm whitespace-nowrap text-gray-500">
                          {menu.tags.join(', ')}
                        </td>
                        <td className="flex gap-2 px-3 py-4 text-sm whitespace-nowrap text-gray-500">
                          {availableStaffs
                            .filter((staff) => staff.menuId === menu.menuId)
                            .map((staff, index) => (
                              <p
                                className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center"
                                key={index}
                              >
                                {staff.staffName?.slice(0, 1)}
                              </p>
                            ))}
                        </td>
                        <td className="px-3 py-4 text-sm whitespace-nowrap text-gray-500">
                          {menu.paymentMethod}
                        </td>
                        <td className="relative py-4 pr-4 pl-3 text-right text-sm font-medium whitespace-nowrap sm:pr-6">
                          <a href="#" className="text-indigo-600 hover:text-indigo-900">
                            Edit<span className="sr-only">, {menu.name}</span>
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardSection>
  );
}
