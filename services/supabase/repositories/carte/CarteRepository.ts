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
    carteData: Pick<InsertType<'carte'>, 
      'tenant_id' | 'org_id' | 'customer_uid' | 'skin_type' | 'hair_type' | 'allergy_history' | 'medical_history' | 'ltv_price' |
      // 🟢 顧客記入項目
      'prefer_silence' | 'avoid_chemicals' | 'has_sensitive_skin' | 'sensitive_skin_detail' | 'fragrance_sensitivity' | 
      'use_contact_lenses' | 'avoid_sales_talk' | 'avoid_private_topics' | 'daily_styling_time' | 'allow_photo_sns' |
      // 🔵 店舗記入項目  
      'hair_thickness' | 'hair_volume' | 'hair_wave_level' | 'hair_damage_tendency' | 'poor_dye_perm_retention' |
      'quick_color_fade' | 'hair_dryness' | 'scalp_condition' | 'scalp_trouble_detail' |
      // 🟡 共通編集項目
      'prefer_hair_styling' | 'use_styling_product'
    >
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
    initialData?: Partial<Pick<InsertType<'carte'>, 
      'skin_type' | 'hair_type' | 'allergy_history' | 'medical_history' | 'ltv_price' |
      // 🟢 顧客記入項目
      'prefer_silence' | 'avoid_chemicals' | 'has_sensitive_skin' | 'sensitive_skin_detail' | 'fragrance_sensitivity' | 
      'use_contact_lenses' | 'avoid_sales_talk' | 'avoid_private_topics' | 'daily_styling_time' | 'allow_photo_sns' |
      // 🔵 店舗記入項目  
      'hair_thickness' | 'hair_volume' | 'hair_wave_level' | 'hair_damage_tendency' | 'poor_dye_perm_retention' |
      'quick_color_fade' | 'hair_dryness' | 'scalp_condition' | 'scalp_trouble_detail' |
      // 🟡 共通編集項目
      'prefer_hair_styling' | 'use_styling_product'
    >>
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
        // 🟢 顧客記入項目
        prefer_silence: initialData?.prefer_silence || null,
        avoid_chemicals: initialData?.avoid_chemicals || null,
        has_sensitive_skin: initialData?.has_sensitive_skin || null,
        sensitive_skin_detail: initialData?.sensitive_skin_detail || null,
        fragrance_sensitivity: initialData?.fragrance_sensitivity || null,
        use_contact_lenses: initialData?.use_contact_lenses || null,
        avoid_sales_talk: initialData?.avoid_sales_talk || null,
        avoid_private_topics: initialData?.avoid_private_topics || null,
        daily_styling_time: initialData?.daily_styling_time || null,
        allow_photo_sns: initialData?.allow_photo_sns || null,
        // 🔵 店舗記入項目
        hair_thickness: initialData?.hair_thickness || null,
        hair_volume: initialData?.hair_volume || null,
        hair_wave_level: initialData?.hair_wave_level || null,
        hair_damage_tendency: initialData?.hair_damage_tendency || null,
        poor_dye_perm_retention: initialData?.poor_dye_perm_retention || null,
        quick_color_fade: initialData?.quick_color_fade || null,
        hair_dryness: initialData?.hair_dryness || null,
        scalp_condition: initialData?.scalp_condition || null,
        scalp_trouble_detail: initialData?.scalp_trouble_detail || null,
        // 🟡 共通編集項目
        prefer_hair_styling: initialData?.prefer_hair_styling || null,
        use_styling_product: initialData?.use_styling_product || null,
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
    updateData: Partial<Pick<UpdateType<'carte'>, 
      'skin_type' | 'hair_type' | 'allergy_history' | 'medical_history' | 'ltv_price' |
      // 🟢 顧客記入項目
      'prefer_silence' | 'avoid_chemicals' | 'has_sensitive_skin' | 'sensitive_skin_detail' | 'fragrance_sensitivity' | 
      'use_contact_lenses' | 'avoid_sales_talk' | 'avoid_private_topics' | 'daily_styling_time' | 'allow_photo_sns' |
      // 🔵 店舗記入項目  
      'hair_thickness' | 'hair_volume' | 'hair_wave_level' | 'hair_damage_tendency' | 'poor_dye_perm_retention' |
      'quick_color_fade' | 'hair_dryness' | 'scalp_condition' | 'scalp_trouble_detail' |
      // 🟡 共通編集項目
      'prefer_hair_styling' | 'use_styling_product'
    >>,
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

  // ========================================
  // 🟢 顧客記入項目用の専用メソッド
  // ========================================

  /**
   * 顧客の好み設定を一括更新します。
   * @param carteId - カルテID
   * @param preferences - 顧客の好み設定
   * @param options - 更新オプション
   * @returns 更新されたカルテ情報
   */
  async updateCustomerPreferences(
    carteId: string,
    preferences: Partial<Pick<UpdateType<'carte'>, 
      'prefer_silence' | 'avoid_sales_talk' | 'avoid_private_topics' | 'daily_styling_time' | 'allow_photo_sns'
    >>,
    options?: BaseRepositoryOptions<'carte'>
  ): Promise<RowType<'carte'>> {
    console.log(`[CarteRepository] updateCustomerPreferences: carteId=${carteId}`);
    
    return this.updateCarte(carteId, preferences, options);
  }

  /**
   * 顧客の肌・アレルギー情報を更新します。
   * @param carteId - カルテID
   * @param skinInfo - 肌・アレルギー情報
   * @param options - 更新オプション
   * @returns 更新されたカルテ情報
   */
  async updateCustomerSkinInfo(
    carteId: string,
    skinInfo: Partial<Pick<UpdateType<'carte'>, 
      'has_sensitive_skin' | 'sensitive_skin_detail' | 'fragrance_sensitivity' | 'avoid_chemicals' | 'use_contact_lenses'
    >>,
    options?: BaseRepositoryOptions<'carte'>
  ): Promise<RowType<'carte'>> {
    console.log(`[CarteRepository] updateCustomerSkinInfo: carteId=${carteId}`);
    
    return this.updateCarte(carteId, skinInfo, options);
  }

  // ========================================
  // 🔵 店舗記入項目用の専用メソッド
  // ========================================

  /**
   * 髪質の専門的評価を更新します。
   * @param carteId - カルテID
   * @param hairAssessment - 髪質評価
   * @param options - 更新オプション
   * @returns 更新されたカルテ情報
   */
  async updateHairAssessment(
    carteId: string,
    hairAssessment: Partial<Pick<UpdateType<'carte'>, 
      'hair_thickness' | 'hair_volume' | 'hair_wave_level' | 'hair_damage_tendency' | 
      'poor_dye_perm_retention' | 'quick_color_fade' | 'hair_dryness'
    >>,
    options?: BaseRepositoryOptions<'carte'>
  ): Promise<RowType<'carte'>> {
    console.log(`[CarteRepository] updateHairAssessment: carteId=${carteId}`);
    
    return this.updateCarte(carteId, hairAssessment, options);
  }

  /**
   * 頭皮の状態評価を更新します。
   * @param carteId - カルテID
   * @param scalpAssessment - 頭皮評価
   * @param options - 更新オプション
   * @returns 更新されたカルテ情報
   */
  async updateScalpAssessment(
    carteId: string,
    scalpAssessment: Partial<Pick<UpdateType<'carte'>, 'scalp_condition' | 'scalp_trouble_detail'>>,
    options?: BaseRepositoryOptions<'carte'>
  ): Promise<RowType<'carte'>> {
    console.log(`[CarteRepository] updateScalpAssessment: carteId=${carteId}`);
    
    return this.updateCarte(carteId, scalpAssessment, options);
  }

  // ========================================
  // 🟡 共通編集項目用の専用メソッド
  // ========================================

  /**
   * スタイリング関連の設定を更新します。
   * @param carteId - カルテID
   * @param stylingPrefs - スタイリング設定
   * @param options - 更新オプション
   * @returns 更新されたカルテ情報
   */
  async updateStylingPreferences(
    carteId: string,
    stylingPrefs: Partial<Pick<UpdateType<'carte'>, 'prefer_hair_styling' | 'use_styling_product'>>,
    options?: BaseRepositoryOptions<'carte'>
  ): Promise<RowType<'carte'>> {
    console.log(`[CarteRepository] updateStylingPreferences: carteId=${carteId}`);
    
    return this.updateCarte(carteId, stylingPrefs, options);
  }

  // ========================================
  // 検索・フィルタリング用の専用メソッド
  // ========================================

  /**
   * 敏感肌の顧客を検索します。
   * @param tenantId - テナントID
   * @param orgId - 組織ID
   * @param options - リスト取得オプション
   * @returns 敏感肌の顧客カルテ配列
   */
  async findSensitiveSkinCustomers(
    tenantId: string,
    orgId: string,
    options?: ListOptions<'carte'>
  ): Promise<{ data: RowType<'carte'>[]; count: number | null }> {
    console.log(`[CarteRepository] findSensitiveSkinCustomers: tenantId=${tenantId}, orgId=${orgId}`);
    
    const filters = { 
      ...(options?.filters || {}), 
      tenant_id: tenantId,
      org_id: orgId,
      has_sensitive_skin: true 
    } as Partial<RowType<'carte'>>;
    
    return this.list({ ...options, filters });
  }

  /**
   * 髪質タイプで顧客を検索します。
   * @param tenantId - テナントID
   * @param orgId - 組織ID
   * @param hairThickness - 髪の太さ
   * @param hairVolume - 髪の量
   * @param options - リスト取得オプション
   * @returns 指定した髪質の顧客カルテ配列
   */
  async findByHairCharacteristics(
    tenantId: string,
    orgId: string,
    hairThickness?: 'fine' | 'medium' | 'coarse',
    hairVolume?: 'low' | 'medium' | 'high',
    options?: ListOptions<'carte'>
  ): Promise<{ data: RowType<'carte'>[]; count: number | null }> {
    console.log(`[CarteRepository] findByHairCharacteristics: tenantId=${tenantId}, orgId=${orgId}, thickness=${hairThickness}, volume=${hairVolume}`);
    
    const filters: Partial<RowType<'carte'>> = { 
      ...(options?.filters || {}), 
      tenant_id: tenantId,
      org_id: orgId,
    };

    if (hairThickness) filters.hair_thickness = hairThickness;
    if (hairVolume) filters.hair_volume = hairVolume;
    
    return this.list({ ...options, filters });
  }
}