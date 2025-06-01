import { BaseRepository, BaseRepositoryOptions, ListOptions } from '../BaseRepository';
import type { RowType, InsertType, UpdateType } from '@/services/supabase/SupabaseService';
import { supabaseClientService } from '@/services/supabase/SupabaseService';
import { throwSupabaseError } from '@/services/supabase/utils/errors';

/**
 * カルテ詳細（施術ごと）(carte_detail) テーブル操作リポジトリ
 * 
 * 施術ごとのカルテ詳細情報の管理を行います。
 * - 施術記録の作成・更新
 * - 施術前後の写真管理
 * - 使用商品・メニュー詳細の記録
 * - 顧客要望・メモの管理
 */
export class CarteDetailRepository extends BaseRepository<'carte_detail'> {
  constructor(instance: typeof supabaseClientService = supabaseClientService) {
    super('carte_detail', instance);
  }

  /**
   * 新しい施術記録を作成します。
   * @param detailData - 施術記録データ
   * @returns 作成された施術記録情報
   */
  async createCarteDetail(
    detailData: Pick<InsertType<'carte_detail'>, 'tenant_id' | 'org_id' | 'carte_id' | 'reservation_id' | 'staff_id' | 'before_hair_img_path' | 'after_hair_img_path' | 'menu_details_json' | 'used_products_json' | 'notes' | 'customer_requests'>
  ): Promise<RowType<'carte_detail'>> {
    console.log(`[CarteDetailRepository] createCarteDetail: data=${JSON.stringify(detailData)}`);
    
    const newDetailData: InsertType<'carte_detail'> = {
      id: crypto.randomUUID(),
      ...detailData,
    };

    try {
      return await this.create(newDetailData);
    } catch (error) {
      if (error instanceof Error) {
        throwSupabaseError({
          callFunc: 'CarteDetailRepository.createCarteDetail',
          message: error.message,
          error: error,
          severity: 'high',
          details: { detailData }
        });
      }
      throw error;
    }
  }

  /**
   * カルテIDで施術記録を取得します。
   * @param tenantId - テナントID
   * @param orgId - 組織ID
   * @param carteId - カルテID
   * @param options - リスト取得オプション
   * @returns 施術記録の配列と合計件数
   */
  async findByCarte(
    tenantId: string,
    orgId: string,
    carteId: string,
    options?: ListOptions<'carte_detail'>
  ): Promise<{ data: RowType<'carte_detail'>[]; count: number | null }> {
    console.log(`[CarteDetailRepository] findByCarte: tenantId=${tenantId}, orgId=${orgId}, carteId=${carteId}`);
    
    const filters = { 
      ...(options?.filters || {}), 
      tenant_id: tenantId,
      org_id: orgId,
      carte_id: carteId 
    } as Partial<RowType<'carte_detail'>>;
    
    return this.list({ ...options, filters });
  }

  /**
   * 予約IDで施術記録を取得します。
   * @param tenantId - テナントID
   * @param orgId - 組織ID
   * @param reservationId - 予約ID
   * @param options - 取得オプション
   * @returns 施術記録情報、または null
   */
  async findByReservation(
    tenantId: string,
    orgId: string,
    reservationId: string,
    options?: BaseRepositoryOptions<'carte_detail'>
  ): Promise<RowType<'carte_detail'> | null> {
    console.log(`[CarteDetailRepository] findByReservation: tenantId=${tenantId}, orgId=${orgId}, reservationId=${reservationId}`);
    
    return this.findOne({ 
      tenant_id: tenantId,
      org_id: orgId,
      reservation_id: reservationId 
    } as Partial<RowType<'carte_detail'>>, options);
  }

  /**
   * スタッフIDで施術記録を取得します。
   * @param tenantId - テナントID
   * @param orgId - 組織ID
   * @param staffId - スタッフID
   * @param options - リスト取得オプション
   * @returns 施術記録の配列と合計件数
   */
  async findByStaff(
    tenantId: string,
    orgId: string,
    staffId: string,
    options?: ListOptions<'carte_detail'>
  ): Promise<{ data: RowType<'carte_detail'>[]; count: number | null }> {
    console.log(`[CarteDetailRepository] findByStaff: tenantId=${tenantId}, orgId=${orgId}, staffId=${staffId}`);
    
    const filters = { 
      ...(options?.filters || {}), 
      tenant_id: tenantId,
      org_id: orgId,
      staff_id: staffId 
    } as Partial<RowType<'carte_detail'>>;
    
    return this.list({ ...options, filters });
  }

  /**
   * 組織内の施術記録一覧を取得します。
   * @param tenantId - テナントID
   * @param orgId - 組織ID
   * @param options - リスト取得オプション
   * @returns 施術記録の配列と合計件数
   */
  async findByOrganization(
    tenantId: string,
    orgId: string,
    options?: ListOptions<'carte_detail'>
  ): Promise<{ data: RowType<'carte_detail'>[]; count: number | null }> {
    console.log(`[CarteDetailRepository] findByOrganization: tenantId=${tenantId}, orgId=${orgId}`);
    
    const filters = { 
      ...(options?.filters || {}), 
      tenant_id: tenantId,
      org_id: orgId,
    } as Partial<RowType<'carte_detail'>>;
    
    return this.list({ ...options, filters });
  }

  /**
   * 施術前の写真を更新します。
   * @param detailId - 施術記録ID
   * @param beforeImagePath - 施術前の写真パス
   * @param options - 更新オプション
   * @returns 更新された施術記録情報
   */
  async updateBeforeImage(
    detailId: string,
    beforeImagePath: string,
    options?: BaseRepositoryOptions<'carte_detail'>
  ): Promise<RowType<'carte_detail'>> {
    console.log(`[CarteDetailRepository] updateBeforeImage: detailId=${detailId}, imagePath=${beforeImagePath}`);
    
    const updateData: UpdateType<'carte_detail'> = {
      before_hair_img_path: beforeImagePath,
    };

    try {
      return await this.update(detailId, updateData, options);
    } catch (error) {
      if (error instanceof Error) {
        throwSupabaseError({
          callFunc: 'CarteDetailRepository.updateBeforeImage',
          message: error.message,
          error: error,
          severity: 'medium',
          details: { detailId, beforeImagePath }
        });
      }
      throw error;
    }
  }

  /**
   * 施術後の写真を更新します。
   * @param detailId - 施術記録ID
   * @param afterImagePath - 施術後の写真パス
   * @param options - 更新オプション
   * @returns 更新された施術記録情報
   */
  async updateAfterImage(
    detailId: string,
    afterImagePath: string,
    options?: BaseRepositoryOptions<'carte_detail'>
  ): Promise<RowType<'carte_detail'>> {
    console.log(`[CarteDetailRepository] updateAfterImage: detailId=${detailId}, imagePath=${afterImagePath}`);
    
    const updateData: UpdateType<'carte_detail'> = {
      after_hair_img_path: afterImagePath,
    };

    try {
      return await this.update(detailId, updateData, options);
    } catch (error) {
      if (error instanceof Error) {
        throwSupabaseError({
          callFunc: 'CarteDetailRepository.updateAfterImage',
          message: error.message,
          error: error,
          severity: 'medium',
          details: { detailId, afterImagePath }
        });
      }
      throw error;
    }
  }

  /**
   * メニュー詳細情報を更新します。
   * @param detailId - 施術記録ID
   * @param menuDetails - メニュー詳細情報 (JSON)
   * @param options - 更新オプション
   * @returns 更新された施術記録情報
   */
  async updateMenuDetails(
    detailId: string,
    menuDetails: any,
    options?: BaseRepositoryOptions<'carte_detail'>
  ): Promise<RowType<'carte_detail'>> {
    console.log(`[CarteDetailRepository] updateMenuDetails: detailId=${detailId}`);
    
    const updateData: UpdateType<'carte_detail'> = {
      menu_details_json: menuDetails,
    };

    try {
      return await this.update(detailId, updateData, options);
    } catch (error) {
      if (error instanceof Error) {
        throwSupabaseError({
          callFunc: 'CarteDetailRepository.updateMenuDetails',
          message: error.message,
          error: error,
          severity: 'medium',
          details: { detailId, menuDetails }
        });
      }
      throw error;
    }
  }

  /**
   * 使用商品情報を更新します。
   * @param detailId - 施術記録ID
   * @param usedProducts - 使用商品情報 (JSON)
   * @param options - 更新オプション
   * @returns 更新された施術記録情報
   */
  async updateUsedProducts(
    detailId: string,
    usedProducts: any,
    options?: BaseRepositoryOptions<'carte_detail'>
  ): Promise<RowType<'carte_detail'>> {
    console.log(`[CarteDetailRepository] updateUsedProducts: detailId=${detailId}`);
    
    const updateData: UpdateType<'carte_detail'> = {
      used_products_json: usedProducts,
    };

    try {
      return await this.update(detailId, updateData, options);
    } catch (error) {
      if (error instanceof Error) {
        throwSupabaseError({
          callFunc: 'CarteDetailRepository.updateUsedProducts',
          message: error.message,
          error: error,
          severity: 'medium',
          details: { detailId, usedProducts }
        });
      }
      throw error;
    }
  }

  /**
   * 施術メモを更新します。
   * @param detailId - 施術記録ID
   * @param notes - 施術メモ
   * @param options - 更新オプション
   * @returns 更新された施術記録情報
   */
  async updateNotes(
    detailId: string,
    notes: string,
    options?: BaseRepositoryOptions<'carte_detail'>
  ): Promise<RowType<'carte_detail'>> {
    console.log(`[CarteDetailRepository] updateNotes: detailId=${detailId}`);
    
    const updateData: UpdateType<'carte_detail'> = {
      notes: notes,
    };

    try {
      return await this.update(detailId, updateData, options);
    } catch (error) {
      if (error instanceof Error) {
        throwSupabaseError({
          callFunc: 'CarteDetailRepository.updateNotes',
          message: error.message,
          error: error,
          severity: 'medium',
          details: { detailId, notes }
        });
      }
      throw error;
    }
  }

  /**
   * 顧客要望を更新します。
   * @param detailId - 施術記録ID
   * @param customerRequests - 顧客要望
   * @param options - 更新オプション
   * @returns 更新された施術記録情報
   */
  async updateCustomerRequests(
    detailId: string,
    customerRequests: string,
    options?: BaseRepositoryOptions<'carte_detail'>
  ): Promise<RowType<'carte_detail'>> {
    console.log(`[CarteDetailRepository] updateCustomerRequests: detailId=${detailId}`);
    
    const updateData: UpdateType<'carte_detail'> = {
      customer_requests: customerRequests,
    };

    try {
      return await this.update(detailId, updateData, options);
    } catch (error) {
      if (error instanceof Error) {
        throwSupabaseError({
          callFunc: 'CarteDetailRepository.updateCustomerRequests',
          message: error.message,
          error: error,
          severity: 'medium',
          details: { detailId, customerRequests }
        });
      }
      throw error;
    }
  }

  /**
   * 施術記録を一括更新します。
   * @param detailId - 施術記録ID
   * @param updateData - 更新データ
   * @param options - 更新オプション
   * @returns 更新された施術記録情報
   */
  async updateCarteDetail(
    detailId: string,
    updateData: Partial<Pick<UpdateType<'carte_detail'>, 'before_hair_img_path' | 'after_hair_img_path' | 'menu_details_json' | 'used_products_json' | 'notes' | 'customer_requests'>>,
    options?: BaseRepositoryOptions<'carte_detail'>
  ): Promise<RowType<'carte_detail'>> {
    console.log(`[CarteDetailRepository] updateCarteDetail: detailId=${detailId}, data=${JSON.stringify(updateData)}`);
    
    try {
      return await this.update(detailId, updateData as UpdateType<'carte_detail'>, options);
    } catch (error) {
      if (error instanceof Error) {
        throwSupabaseError({
          callFunc: 'CarteDetailRepository.updateCarteDetail',
          message: error.message,
          error: error,
          severity: 'medium',
          details: { detailId, updateData }
        });
      }
      throw error;
    }
  }
}