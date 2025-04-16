import { Id } from '@/convex/_generated/dataModel';
import { PaginationOptions } from 'convex/server';

export type ListBySalonIdInput = {
  salonId: Id<'salon'>;
  paginationOpts: PaginationOptions;
  activeOnly?: boolean;
  sort?: 'asc' | 'desc';
  includeArchive?: boolean;
};

export type OptionCreateInput = {
  salonId: Id<'salon'>;
  name: string; // オプションメニュー名
  unitPrice?: number; // 価格
  salePrice?: number; // セール価格
  orderLimit?: number; // 注文制限
  timeToMin?: number; // 時間(分)
  tags?: string[]; // タグ
  description?: string; // 説明
  isActive?: boolean; // 有効/無効フラグ
};

export type OptionUpdateInput = {
  name?: string; // オプションメニュー名
  unitPrice?: number; // 価格
  salePrice?: number; // セール価格
  orderLimit?: number; // 注文制限
  timeToMin?: number; // 時間(分)
  tags?: string[]; // タグ
  description?: string; // 説明
  isActive?: boolean; // 有効/無効フラグ
};

export type OptionKillInput = {
  optionId: Id<'salon_option'>;
};
