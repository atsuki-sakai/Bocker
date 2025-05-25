import {
  Home as HomeIcon,
  Book as BookIcon,
  Calendar as CalendarIcon,
  Users as UsersIcon,
  CreditCard as CreditCardIcon,
  Icon as LucideIcon
} from 'lucide-react';
import type { OrgRole } from '../types/roles';

export type NavItem = {
  name: string;
  href: string;
  icon: LucideIcon;
  minRole: OrgRole;
};

export const NAV_ITEMS: NavItem[] = [
  { name: 'ダッシュボード', href: '/dashboard', icon: HomeIcon, minRole: 'staff' },
  { name: '予約作成', href: '/dashboard/reservation/add', icon: BookIcon, minRole: 'staff' },
  { name: '予約ボード', href: '/dashboard/reservation', icon: CalendarIcon, minRole: 'staff' },
  { name: 'スタッフ管理', href: '/dashboard/staff', icon: UsersIcon, minRole: 'owner' },
  { name: 'サブスクリプション', href: '/dashboard/subscription', icon: CreditCardIcon, minRole: 'admin' },
];
