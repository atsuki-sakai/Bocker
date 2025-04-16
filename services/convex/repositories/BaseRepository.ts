/**
 * ベースリポジトリクラス
 *
 * このクラスは全てのリポジトリの基底クラスとして機能し、
 * 基本的なCRUD操作を共通化します。データベースアクセスのパターンを
 * 統一することで、保守性と拡張性を高めます。
 */

import { MutationCtx, QueryCtx } from '@/convex/_generated/server';
import { WithoutSystemFields } from 'convex/server';
import { Doc, Id, TableNames } from '@/convex/_generated/dataModel';
import { ConvexCustomError } from '@/services/convex/shared/utils/error';
import { ARCHIVE_DURATION_SECONDS } from '@/services/convex/constants';
import { CommonFields } from '@/services/convex/shared/types/common';

export class BaseRepository<T extends TableNames> {
  /**
   * コンストラクタ
   *
   * @param tableName 操作対象のテーブル名
   */
  constructor(protected readonly tableName: T) {}

  /**
   * IDによるデータ取得
   *
   * @param ctx クエリコンテキスト
   * @param id 取得対象のID
   * @param includeArchived アーカイブ済みのデータも含めるか
   * @returns 取得したデータ、存在しない場合はnull
   */
  async find(ctx: QueryCtx, id: Id<T>, includeArchived: boolean = false): Promise<Doc<T> | null> {
    const record = (await ctx.db.get(id)) as Doc<T> | null;

    if (!record) {
      return null;
    }

    // アーカイブフラグがある場合はチェック
    if (!includeArchived && 'isArchive' in record && record.isArchive === true) {
      return null;
    }

    return record;
  }

  /**
   * IDによるデータ取得（存在チェック付き）
   *
   * @param ctx クエリコンテキスト
   * @param id 取得対象のID
   * @param includeArchived アーカイブ済みのデータも含めるか
   * @returns 取得したデータ
   * @throws ConvexError（データが存在しない場合）
   */
  async get(ctx: QueryCtx, id: Id<T>, includeArchived: boolean = false): Promise<Doc<T>> {
    const record = await this.find(ctx, id, includeArchived);

    if (!record) {
      const err = new ConvexCustomError('low', 'データが見つかりません', 'NOT_FOUND', 404, {
        tableName: this.tableName,
        id,
      });
      throw err;
    }

    // アーカイブフラグがある場合はチェック
    if (!includeArchived && 'isArchive' in record && record.isArchive === true) {
      const err = new ConvexCustomError('low', 'データが見つかりません', 'NOT_FOUND', 404, {
        tableName: this.tableName,
        id,
      });
      throw err;
    }
    return record;
  }

  /**
   * データの作成
   *
   * @param ctx ミューテーションコンテキスト
   * @param data 作成するデータ
   * @returns 作成されたデータのID
   */
  async create(ctx: MutationCtx, data: WithoutSystemFields<Doc<T>>): Promise<Id<T>> {
    return await ctx.db.insert(this.tableName, { ...data, isArchive: false });
  }

  /**
   * データの更新
   *
   * @param ctx ミューテーションコンテキスト
   * @param id 更新対象のID
   * @param data 更新するデータ
   * @returns 更新が成功したデータのID
   * @throws ConvexError（データが存在しない場合）
   */
  async update(
    ctx: MutationCtx,
    id: Id<T>,
    data: Partial<WithoutSystemFields<Omit<Doc<T>, '_id' | '_creationTime'>>>
  ): Promise<Id<T>> {
    // 存在確認
    const exists = await this.find(ctx, id);
    if (!exists) {
      const err = new ConvexCustomError('low', 'データが見つかりません', 'NOT_FOUND', 404, {
        call: 'update',
        tableName: this.tableName,
        id,
      });
      throw err;
    }

    await ctx.db.patch(id, data);
    const newRecord = await this.get(ctx, id);
    return newRecord._id;
  }

  /**
   * データの論理削除（アーカイブ）
   *
   * @param ctx ミューテーションコンテキスト
   * @param id アーカイブ対象のID
   * @returns アーカイブが成功したらtrue
   * @throws ConvexError（データが存在しない場合）
   */
  async archive(ctx: MutationCtx, id: Id<T>): Promise<boolean> {
    // 存在確認
    const exists = await this.find(ctx, id);
    if (!exists) {
      throw new ConvexCustomError('low', 'データが見つかりません', 'NOT_FOUND', 404, {
        call: 'archive',
        tableName: this.tableName,
        id,
      });
    }

    // 論理削除
    await ctx.db.patch(id, {
      isArchive: true,
      deletedAt: Math.floor(Date.now() / 1000) + ARCHIVE_DURATION_SECONDS, // 1年後（UNIXタイムスタンプとして）
    } as Partial<Doc<T> & typeof CommonFields>);

    await this.get(ctx, id);

    return true;
  }

  /**
   * データの完全削除
   *
   * @param ctx ミューテーションコンテキスト
   * @param id 削除対象のID
   * @returns 削除が成功したらtrue
   * @throws ConvexError（データが存在しない場合）
   */
  async delete(ctx: MutationCtx, id: Id<T>): Promise<boolean> {
    // 存在確認
    const exists = await this.find(ctx, id);
    if (!exists) {
      throw new ConvexCustomError('low', 'データが見つかりません', 'NOT_FOUND', 404, {
        call: 'delete',
        tableName: this.tableName,
        id,
      });
    }

    // 完全削除
    await ctx.db.delete(id);
    return true;
  }
}
