import { BaseRepository, BaseRepositoryOptions, ListOptions } from '../BaseRepository';
import type { RowType, InsertType, UpdateType } from '@/services/supabase/SupabaseService';
import { supabaseClientService } from '@/services/supabase/SupabaseService';
import { throwSupabaseError } from '@/services/supabase/utils/errors';
import { generateUUID } from '@/services/supabase/utils/uuid';

/**
 * カルテ基本情報 (carte) テーブル操作リポジトリ
 * 
 * 顧客のカルテ情報の管理を行います。
 * - カルテの作成・更新
 * - 顧客別カルテ情報の取得
 * - 肌質・髪質・アレルギー情報の管理
 */
export class CarteRepository extends BaseRepository<'carte'> {
  constructor(instance: typeof supabaseClientService = supabaseClientService) {
    super('carte', instance);
  }

  /**
   * 新しいカルテを作成します。
   * @param carteData - カルテデータ
   * @returns 作成されたカルテ情報
   */
  async createCarte(
    carteData: Pick<InsertType<'carte'>, 'tenant_id' | 'org_id' | 'customer_uid' | 'skin_type' | 'hair_type' | 'allergy_history' | 'medical_history' | 'ltv_price'>
  ): Promise<RowType<'carte'>> {
    console.log(`[CarteRepository] createCarte: data=${JSON.stringify(carteData)}`);
    
    const newCarteData: InsertType<'carte'> = {
      id: generateUUID(),
      ...carteData,
    };

    try {
      return await this.create(newCarteData);
    } catch (error) {
      if (error instanceof Error) {
        throwSupabaseError({
          callFunc: 'CarteRepository.createCarte',
          message: error.message,
          error: error,
          severity: 'high',
          details: { carteData }
        });
      }
      throw error;
    }
  }

  /**
   * 顧客のカルテを取得します。
   * 通常、顧客ごとにカルテは1つです。
   * @param tenantId - テナントID
   * @param orgId - 組織ID
   * @param customerUid - 顧客ID
   * @param options - 取得オプション
   * @returns カルテ情報、または null
   */
  async findByCustomer(
    tenantId: string,
    orgId: string,
    customerUid: string,
    options?: BaseRepositoryOptions<'carte'>
  ): Promise<RowType<'carte'> | null> {
    console.log(`[CarteRepository] findByCustomer: tenantId=${tenantId}, orgId=${orgId}, customerUid=${customerUid}`);
    
    return this.findOne({ 
      tenant_id: tenantId,
      org_id: orgId,
      customer_uid: customerUid 
    } as Partial<RowType<'carte'>>, options);
  }

  /**
   * 顧客のカルテを取得または作成します。
   * カルテが存在しない場合は新しく作成します。
   * @param tenantId - テナントID
   * @param orgId - 組織ID
   * @param customerUid - 顧客ID
   * @param initialData - カルテが存在しない場合の初期データ
   * @returns カルテ情報
   */
  async findOrCreateByCustomer(
    tenantId: string,
    orgId: string,
    customerUid: string,
    initialData?: Partial<Pick<InsertType<'carte'>, 'skin_type' | 'hair_type' | 'allergy_history' | 'medical_history' | 'ltv_price'>>
  ): Promise<RowType<'carte'>> {
    console.log(`[CarteRepository] findOrCreateByCustomer: tenantId=${tenantId}, orgId=${orgId}, customerUid=${customerUid}`);
    
    let carte = await this.findByCustomer(tenantId, orgId, customerUid);
    
    if (!carte) {
      carte = await this.createCarte({
        tenant_id: tenantId,
        org_id: orgId,
        customer_uid: customerUid,
        skin_type: initialData?.skin_type || null,
        hair_type: initialData?.hair_type || null,
        allergy_history: initialData?.allergy_history || null,
        medical_history: initialData?.medical_history || null,
        ltv_price: initialData?.ltv_price || 0,
      });
      console.log(`[CarteRepository] Created new carte for customer ${customerUid}`);
    }
    
    return carte;
  }

  /**
   * 組織内のカルテ一覧を取得します。
   * @param tenantId - テナントID
   * @param orgId - 組織ID
   * @param options - リスト取得オプション
   * @returns カルテの配列と合計件数
   */
  async findByOrganization(
    tenantId: string,
    orgId: string,
    options?: ListOptions<'carte'>
  ): Promise<{ data: RowType<'carte'>[]; count: number | null }> {
    console.log(`[CarteRepository] findByOrganization: tenantId=${tenantId}, orgId=${orgId}`);
    
    const filters = { 
      ...(options?.filters || {}), 
      tenant_id: tenantId,
      org_id: orgId,
    } as Partial<RowType<'carte'>>;
    
    return this.list({ ...options, filters });
  }

  /**
   * 肌質でカルテを検索します。
   * @param tenantId - テナントID
   * @param orgId - 組織ID
   * @param skinType - 肌質
   * @param options - リスト取得オプション
   * @returns カルテの配列と合計件数
   */
  async findBySkinType(
    tenantId: string,
    orgId: string,
    skinType: string,
    options?: ListOptions<'carte'>
  ): Promise<{ data: RowType<'carte'>[]; count: number | null }> {
    console.log(`[CarteRepository] findBySkinType: tenantId=${tenantId}, orgId=${orgId}, skinType=${skinType}`);
    
    const filters = { 
      ...(options?.filters || {}), 
      tenant_id: tenantId,
      org_id: orgId,
      skin_type: skinType 
    } as Partial<RowType<'carte'>>;
    
    return this.list({ ...options, filters });
  }

  /**
   * 髪質でカルテを検索します。
   * @param tenantId - テナントID
   * @param orgId - 組織ID
   * @param hairType - 髪質
   * @param options - リスト取得オプション
   * @returns カルテの配列と合計件数
   */
  async findByHairType(
    tenantId: string,
    orgId: string,
    hairType: string,
    options?: ListOptions<'carte'>
  ): Promise<{ data: RowType<'carte'>[]; count: number | null }> {
    console.log(`[CarteRepository] findByHairType: tenantId=${tenantId}, orgId=${orgId}, hairType=${hairType}`);
    
    const filters = { 
      ...(options?.filters || {}), 
      tenant_id: tenantId,
      org_id: orgId,
      hair_type: hairType 
    } as Partial<RowType<'carte'>>;
    
    return this.list({ ...options, filters });
  }

  /**
   * カルテ情報を更新します。
   * @param carteId - カルテID
   * @param updateData - 更新データ
   * @param options - 更新オプション
   * @returns 更新されたカルテ情報
   */
  async updateCarte(
    carteId: string,
    updateData: Partial<Pick<UpdateType<'carte'>, 'skin_type' | 'hair_type' | 'allergy_history' | 'medical_history' | 'ltv_price'>>,
    options?: BaseRepositoryOptions<'carte'>
  ): Promise<RowType<'carte'>> {
    console.log(`[CarteRepository] updateCarte: carteId=${carteId}, data=${JSON.stringify(updateData)}`);
    
    try {
      return await this.update(carteId, updateData as UpdateType<'carte'>, options);
    } catch (error) {
      if (error instanceof Error) {
        throwSupabaseError({
          callFunc: 'CarteRepository.updateCarte',
          message: error.message,
          error: error,
          severity: 'medium',
          details: { carteId, updateData }
        });
      }
      throw error;
    }
  }

  /**
   * アレルギー履歴を更新します。
   * @param carteId - カルテID
   * @param allergyHistory - アレルギー履歴
   * @param options - 更新オプション
   * @returns 更新されたカルテ情報
   */
  async updateAllergyHistory(
    carteId: string,
    allergyHistory: string,
    options?: BaseRepositoryOptions<'carte'>
  ): Promise<RowType<'carte'>> {
    console.log(`[CarteRepository] updateAllergyHistory: carteId=${carteId}`);
    
    return this.updateCarte(carteId, { allergy_history: allergyHistory }, options);
  }

  /**
   * 病歴を更新します。
   * @param carteId - カルテID
   * @param medicalHistory - 病歴
   * @param options - 更新オプション
   * @returns 更新されたカルテ情報
   */
  async updateMedicalHistory(
    carteId: string,
    medicalHistory: string,
    options?: BaseRepositoryOptions<'carte'>
  ): Promise<RowType<'carte'>> {
    console.log(`[CarteRepository] updateMedicalHistory: carteId=${carteId}`);
    
    return this.updateCarte(carteId, { medical_history: medicalHistory }, options);
  }

  /**
   * 顧客のLTV（生涯価値）を更新します。
   * @param carteId - カルテID
   * @param ltvPrice - LTV価格
   * @param options - 更新オプション
   * @returns 更新されたカルテ情報
   */
  async updateLtvPrice(
    carteId: string,
    ltvPrice: number,
    options?: BaseRepositoryOptions<'carte'>
  ): Promise<RowType<'carte'>> {
    console.log(`[CarteRepository] updateLtvPrice: carteId=${carteId}, ltvPrice=${ltvPrice}`);
    
    return this.updateCarte(carteId, { ltv_price: ltvPrice }, options);
  }
}