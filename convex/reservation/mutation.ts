import { api } from '@/convex/_generated/api'
import { mutation, internalMutation } from '@/convex/_generated/server';
import { v } from 'convex/values';
import { excludeFields, updateRecord } from '@/convex/utils/helpers';
import { reservationStatusType,  paymentMethodType,reservationPaymentStatusType, reservationMenuType, reservationOptionType, imageType } from '@/convex/types';
import { validateRequired, validateRequiredNumber, validateDateStrToDate } from '@/convex/utils/validations';
import { checkAuth } from '@/convex/utils/auth';
import { ConvexError } from 'convex/values';
import { ERROR_STATUS_CODE, ERROR_SEVERITY } from '@/lib/errors/constants';
import {
  createReservationWithDetails,
  archiveReservationWithDetails,
  deleteReservationWithDetails
} from '@/convex/reservation/reservation.helpers';

/**

1. Convex ミューテーションのトランザクショナル性

Convex のミューテーションは内部的に Optimistic Concurrency Control （OCC）を用いており、同一テーブルへの同時書き込みが競合すると自動的に再試行されるため、同一ミューテーション内でチェック→挿入を連続的に実行することで、外部呼び出しを挟む方法よりも整合性が担保されやすいです  ￼ ￼。
	•	たとえば、checkDoubleBooking を別クエリとして呼び出す場合、クエリ実行後に別のリクエストで同じ時間帯の予約が入る可能性があります。しかし、ミューテーション内にチェックロジックを内包し、直後に挿入する実装であれば、Convex が提供するトランザクション的な実行保証（シリアライズ処理）が働き、最後まで同じミューテーション内で連続実行されます  ￼ ￼。
	•	さらに、Convex のサンドボックス化された JavaScript 実行環境により、ミューテーション内で外部副作用を起こさず、データベース権限・読み書き以外の処理は許されないため、途中で外部 API を呼んで結果が変わるリスクもありません  ￼。

⸻

2. レースコンディション発生メカニズムと対策

2.1 レースコンディションの原理

レースコンディションは「複数の処理が同時に同じデータにアクセスし、更新のタイミングによって結果が不定になる状況」です  ￼ ￼。例えば、予約の重複チェックをクエリとして呼び出した直後に別リクエストが同時間帯の予約を挿入してしまうと、チェック後に矛盾した結果で予約を受け付けてしまう恐れがあります  ￼。

2.2 Convex における対策
	•	同一ミューテーション内での連続実行
Convex ミューテーションはサーバーサイドで一度にバッチ的に実行され、最終的な書き込みを OCC によって試行します。これにより、同一ミューテーション内で重複チェック→挿入を並列にせず直列に処理すれば、チェックと挿入の間に別プロセスが介入しづらくなります  ￼ ￼。
	•	OCC による自動再試行
それでも、極めて同時刻に複数ミューテーションが到達するケースでは、そのタイミングで同一レコードに対する書き込み衝突が発生し、Convex の OCC により一方のミューテーションが失敗して再試行されます。この再試行によって、結果として重複チェックの結果が再取得され、最終的に一方のみが書き込まれる仕組みです  ￼。

⸻

3. 以下の順序で処理を行っています。
	1.	入力バリデーション・スタッフ・組織の存在チェック
	2.	reservation_config から availableSheet を取得
	3.	組織全体で同日・確定済みの既存予約をクエリし、時間帯重複数 overlapCount を算出
	•	overlapCount >= availableSheet の場合は即例外投げ
	4.	同じスタッフ・同日・確定済みで時間帯が重複する予約をクエリし、1件でも存在すれば例外投げ
	5.	例外が発生しなければ ctx.db.insert('reservation', …) で新規予約レコードを作成
	6.	createReservationWithDetails で関連テーブルにも同一関数内でレコードを挿入

  「重複チェック→挿入」を同じミューテーション内にまとめた形です  ￼ ￼。
	•	予約件数上限 (availableSheet) のチェックと挿入を同じ関数内で直列実行
たとえば orgReservations を取得し、overlapCount を算出した後、すぐにエラー投げまたは次ステップへ進み、外部の別クエリ呼び出しを挟んでいません。これにより、チェック結果と挿入の間に別リクエストが介入する“間”がかなり小さくなっています  ￼ ￼。
	•	スタッフ単位の時間帯重複チェックも同様に同関数内で行い、そのままエラー投げまたは挿入へ。したがって、チェック→挿入の連続性が保たれています  ￼ ￼。

よって、多少の同時リクエストがあったとしても、Convex の OCC による自動再試行メカニズムが働き、最終的に正しいデータ整合性が担保されるため、実運用上「重複予約を許さない」要件を十分満たすといえます  ￼ ￼。

⸻

4. 注意点およびさらに安全性を高めるための提案

4.1 可能な OCC エラーの捕捉と再試行ロジック

Convex の OCC エラーは自動的に再試行されますが、ミューテーション内で何かしら例外をキャッチしてしまうと自動再試行がスキップされる恐れがあります  ￼。
	•	もし独自に try/catch を追加している場合は、ConvexError 以外の例外は再スローするようにし、OCC が発生したときに Convex の再試行機構が生きるように注意してください  ￼。

4.2 インデックス設計とクエリ最適化
	•	withIndex('by_tenant_org_date_status_archive', ...) と withIndex('by_tenant_org_staff_date_status_archive', ...) の両方を使っていますが、インデックスが適切に設定されていることでクエリが高速化され、結果的にチェック→挿入のタイミングラグがさらに小さくなります  ￼。
	•	インデックスのカーディナリティ（値の種類）が高い場合、実行プランによってはサブインデックスが使われず全表走査になる可能性もあるため、Convex ダッシュボードの「Query Performance」セクションで実行時間を確認し、必要なら追加インデックスを検討すると良いでしょう  ￼。

4.3 マルチインスタンス環境での検証
	•	複数クライアント（たとえばウェブとモバイルアプリ）が同時に予約を試みた場合の挙動を本番環境と同等の条件で負荷テストすることで、意図しないシナリオ（例：深夜バッチや外部システム連携による予約一括挿入時など）が発生したときに正常に再試行が起きるかを確認しておくと安心です  ￼ ￼。
*/

// 予約の追加処理
// 予約作成に必要な情報を受け取り、入力バリデーションやスタッフ・組織の存在確認を行う。
// さらに、予約時間の重複チェック（Race condition防止）を実施し、問題なければ予約と予約詳細を同時に作成する。
// 共通ヘルパーを利用することで、予約と関連情報の一貫性を保ちつつ効率的に処理を行う。
export const create = mutation({
  args: {
    tenant_id: v.id('tenant'), // テナントID
    org_id: v.id('organization'), // 組織ID
    customer_id: v.optional(v.string()), // Supabase 側の customer.id
    staff_id: v.id('staff'), // スタッフID
    customer_name: v.string(), // 顧客名
    staff_name: v.string(), // スタッフ名
    status: reservationStatusType, // 予約ステータス
    date: v.string(), // 予約日 YYYY-MM-DD
    start_time_unix: v.number(), // 予約開始時間
    end_time_unix: v.number(), // 予約終了時間
    total_price: v.number(), // 合計金額
    coupon_id: v.optional(v.id('coupon')), // クーポンID
    payment_method: paymentMethodType, // 支払方法
    stripe_checkout_session_id: v.optional(v.string()), // Stripe Checkout Session ID
    payment_status: reservationPaymentStatusType, // 支払ステータス
    menus: v.array(reservationMenuType), // メニュー
    options: v.array(reservationOptionType), // オプション
    extra_charge: v.optional(v.number()), // 追加料金
    use_points: v.optional(v.number()), // 使用ポイント数
    coupon_discount: v.optional(v.number()), // クーポン割引額
    featured_hair_images: v.array(imageType), // フィーチャー画像
    notes: v.optional(v.string()), // メモ
  },
  handler: async (ctx, args) => {
    // 入力値の妥当性を検証し、不正なデータの登録を防止するためのバリデーション処理
    validateDateStrToDate(args.date, 'date')
    validateRequiredNumber(args.start_time_unix, 'start_time_unix')
    validateRequiredNumber(args.end_time_unix, 'end_time_unix')
    validateRequired(args.org_id, 'org_id')

    // スタッフIDに対応するスタッフが存在するかを確認し、存在しなければエラーを返す
    const staff = await ctx.db.get(args.staff_id)
    if (!staff) {
      throw new ConvexError({
        statusCode: ERROR_STATUS_CODE.NOT_FOUND,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'reservation.create',
        message: '指定されたスタッフが存在しません',
        code: 'NOT_FOUND',
        status: 404,
        details: {
          ...args,
        },
      })
    }

    // アクティブな組織が存在し、かつアーカイブされていないことを確認する
    const organization = await ctx.db.query('organization').withIndex('by_tenant_active_archive', q => q.eq('tenant_id', args.tenant_id).eq('is_active', true).eq('is_archive', false)).first()
    if (!organization) {
      throw new ConvexError({
        statusCode: ERROR_STATUS_CODE.INTERNAL_SERVER_ERROR,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'reservation.create',
        message: '指定された有効な組織が存在しません',
        code: 'NOT_FOUND',
        status: 404,
        details: {
          ...args,
        },
      });
    }

    // 予約時間の重複を防ぐため、同じスタッフ・日時での予約が既に存在しないかをチェックする（Race condition防止）
    const reservationConfig = await ctx.db.query('reservation_config').withIndex('by_tenant_org_archive', (q) =>
      q.eq('tenant_id', args.tenant_id)
        .eq('org_id', args.org_id)
    ).first();
  
    // 店舗ごとの同時受付可能席数を取得
    const availableSheet = reservationConfig?.available_sheet || 3;
  
    // 組織全体で、該当日の confirmed かつ is_archive: false の予約のみ取得
    const orgReservations = await ctx.db
      .query('reservation')
      .withIndex('by_tenant_org_date_status_archive', (q) =>
        q.eq('tenant_id', args.tenant_id)
          .eq('org_id', args.org_id)
          .eq('date', args.date)
          .eq('status', 'confirmed')
          .eq('is_archive', false)
      )
      .collect();
  
    const overlapCount = orgReservations.filter((reservation) => {
      // 時間帯が一部でも重なればtrue
      return (
        reservation.start_time_unix < args.end_time_unix &&
        reservation.end_time_unix > args.start_time_unix
      );
    }).length;
  
    if (overlapCount >= availableSheet) {
      throw new ConvexError({
        statusCode: ERROR_STATUS_CODE.CONFLICT,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'reservation.checkReservationOverlap',
        message: 'この時間帯の最大同時予約数は上限です。別の時間を選択してください。',
        code: 'CONFLICT',
        status: 409,
        details: {
          ...args,
        },
      });
    }
  
    // 指定された条件に合致する予約を検索し、
    // 時間帯が重複している予約が存在するかを判定
    const query = ctx.db
      .query('reservation')
      .withIndex('by_tenant_org_staff_date_status_archive', (q) =>
        q
          .eq('tenant_id', args.tenant_id)
          .eq('org_id', args.org_id)
          .eq('staff_id', args.staff_id)
          .eq('date', args.date)
          .eq('status', 'confirmed')
          .eq('is_archive', false)
      )
      .filter((q) =>
        q.and(
          // 時間の重複をチェック（開始時間が相手の終了時間前、終了時間が相手の開始時間後）
          q.lt(q.field('start_time_unix'), args.end_time_unix),
          q.gt(q.field('end_time_unix'), args.start_time_unix),
        )
      );
  
    const isOverlapping = await query.first();

    if (isOverlapping) {
      throw new ConvexError({
        statusCode: ERROR_STATUS_CODE.CONFLICT,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'reservation.create',
        message: 'この時間帯の予約はすでにいっぱいです。別の時間を選択してください。',
        code: 'CONFLICT',
        status: 409,
        details: {
          ...args,
        },
      });
    }

    // 予約本体と詳細情報を一括で作成する共通ヘルパーを呼び出すことで、データの整合性を確保しつつ効率的に処理
    const { reservationId } = await createReservationWithDetails(ctx, args);
    return reservationId;
  },
})

// 予約情報の更新処理
// 予約内容の変更時に必要なバリデーションや認証チェックを行い、予約が存在しアーカイブされていないことを確認する。
// 予約時間が変更された場合は重複チェックを行い、問題なければ更新処理を実行する。
// 予約IDを除外した更新データを用いて、予約レコードの整合性を保ちながら更新する。
export const update = mutation({
  args: {
    tenant_id: v.id('tenant'),
    org_id: v.id('organization'),
    reservation_id: v.id('reservation'),
    customer_id: v.string(),
    customer_name: v.string(),
    staff_id: v.id('staff'),
    staff_name: v.string(),
    menus: v.array(reservationMenuType),
    options: v.array(reservationOptionType),
    total_price: v.number(),
    status: reservationStatusType,
    date: v.string(),
    start_time_unix: v.number(),
    end_time_unix: v.number(),
    extra_charge: v.number(),
    featured_hair_images: v.array(imageType),
    use_points: v.number(),
    coupon_id: v.id('coupon'),
    coupon_discount: v.number(),
    notes: v.string(),
    payment_method: paymentMethodType,
    stripe_checkout_session_id: v.string(),
    payment_status: reservationPaymentStatusType,
  },
  handler: async (ctx, args) => {
    // 認証チェック: ログイン済みユーザーのみ更新可能
    checkAuth(ctx)
    // 入力値の妥当性検証
    validateDateStrToDate(args.date, 'date')
    validateRequiredNumber(args.start_time_unix, 'start_time_unix')
    validateRequiredNumber(args.end_time_unix, 'end_time_unix')
    validateRequired(args.customer_id, 'customer_id')
    validateRequired(args.org_id, 'org_id')

    // 対象予約が存在し、アーカイブされていないことを確認
    const reservation = await ctx.db.get(args.reservation_id)
    if (!reservation || reservation.is_archive) {
      throw new ConvexError({
        statusCode: ERROR_STATUS_CODE.NOT_FOUND,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'reservation.update',
        message: '指定された予約が存在しません',
        code: 'NOT_FOUND',
        status: 404,
        details: {
          ...args,
        },
      })
    }

    // 予約時間が変更された場合は重複チェックを実施し、同時間帯に他の予約が存在しないかを検証（Race condition防止）
    if (
      (args.start_time_unix !== reservation.start_time_unix ||
        args.end_time_unix !== reservation.end_time_unix)
    ) {
      const isOverlapping = await ctx.runQuery(api.reservation.query.checkDoubleBooking, {
        tenant_id: args.tenant_id,
        org_id: args.org_id,
        staff_id: args.staff_id,
        date: args.date,
        start_time_unix: args.start_time_unix,
        end_time_unix: args.end_time_unix,
        excludeReservationId: reservation._id, // 自分自身の予約は除外
      });

      if (isOverlapping) {
        throw new ConvexError({
          message: 'この時間帯はすでに予約が入っています。別の時間を選択してください。',
          statusCode: ERROR_STATUS_CODE.CONFLICT,
          severity: ERROR_SEVERITY.ERROR,
          callFunc: 'reservation.update',
          code: 'CONFLICT',
          status: 409,
          details: {
            ...args,
          },
        })
      }
    }

    // 更新対象から予約IDを除外し、更新データを準備
    const updateData = excludeFields(args, ['reservation_id'])

    // 予約の基本情報を先に更新し、その後詳細情報を更新することで整合性を保つ
    await updateRecord(
      ctx,
      reservation._id,
      {
        master_id: reservation.master_id,         // Convex & Supabase 共通識別子
        tenant_id: args.tenant_id, // テナントID
        org_id: args.org_id, // 組織ID
        customer_id: args.customer_id, // Supabase 側の customer.id
        staff_id: args.staff_id, // スタッフID
        customer_name: args.customer_name, // 顧客名
        staff_name: args.staff_name, // スタッフ名
        status: args.status, // 予約ステータス
        date: args.date, // 予約日 YYYY-MM-DD
        start_time_unix: args.start_time_unix, // 予約開始時間
        end_time_unix: args.end_time_unix, // 予約終了時間
      }
    )

    const reservationDetail = await ctx.db.query('reservation_detail').withIndex('by_reservation_archive', q => q.eq('reservation_id', reservation._id).eq('is_archive', false)).first()
    if (!reservationDetail) {
      throw new ConvexError({
        statusCode: ERROR_STATUS_CODE.NOT_FOUND,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'reservation.update',
      })
    }

    // 予約詳細情報を更新し、最新の状態をDBに反映
    return await ctx.db.patch(reservationDetail._id, {
      tenant_id: args.tenant_id, // テナントID
      org_id: args.org_id, // 店舗ID
      reservation_id: args.reservation_id, // 予約ID
      coupon_id: args.coupon_id, // クーポンID
      total_price: args.total_price, // 合計金額
      payment_method: args.payment_method, // 支払方法
      menus: args.menus, // メニュー
      options: args.options, // オプション
      extra_charge: args.extra_charge, // 追加料金
      use_points: args.use_points, // 使用ポイント数
      coupon_discount: args.coupon_discount, // クーポン割引額
      featured_hair_images: args.featured_hair_images, // フィーチャー画像
      notes: args.notes, // メモ
    })
  },
})

// 予約の論理削除（アーカイブ）処理
// 予約を物理的に削除せず、アーカイブフラグを立てることで履歴を保持しつつ非表示にする。
// 関連する予約詳細も同時にアーカイブする共通ヘルパーを利用し、一貫した状態管理を実現。
export const archive = mutation({
  args: {
    reservation_id: v.id('reservation'),
  },
  handler: async (ctx, args) => {
    // 認証チェック: ログイン済みユーザーのみ実行可能
    checkAuth(ctx)
    // 予約と関連詳細をアーカイブ状態に更新
    await archiveReservationWithDetails(ctx, args.reservation_id)
    return true;
  },
})

// 予約の物理削除処理
// 予約とその関連詳細を完全に削除する。削除後は復元不可のため注意が必要。
// 共通ヘルパーを利用して関連情報も漏れなく削除する。
export const kill = mutation({
  args: {
    reservation_id: v.id('reservation'),
  },
  handler: async (ctx, args) => {
    // 認証チェック: ログイン済みユーザーのみ実行可能
    checkAuth(ctx)
    // 予約と関連詳細を完全に削除
    await deleteReservationWithDetails(ctx, args.reservation_id)
    return true;
  },
})

// 予約ステータスの更新処理
// 予約の状態変更を行う。キャンセル済みの予約に対しては変更不可とし、整合性を保つ。
export const updateStatus = mutation({
  args: {
    reservation_id: v.id('reservation'),
    status: reservationStatusType,
  },
  handler: async (ctx, args) => {
    // 入力値の必須チェック
    validateRequired(args.reservation_id, 'reservation_id')
    validateRequired(args.status, 'status')
    // 予約の存在確認とアーカイブ状態のチェック
    const reservation = await ctx.db.get(args.reservation_id)
    if (!reservation || reservation.is_archive) {
      throw new ConvexError({
        statusCode: ERROR_STATUS_CODE.NOT_FOUND,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'reservation.updateStatus',
        message: '指定された予約が存在しません',
        code: 'NOT_FOUND',
        status: 404,
        details: {
          ...args,
        },
      })
    }

    // キャンセル済み予約のステータス変更を禁止し、不整合を防止
    if (reservation.status == 'cancelled') {
      throw new ConvexError({
        statusCode: ERROR_STATUS_CODE.BAD_REQUEST,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'reservation.updateStatus',
        message: 'この予約はすでにキャンセルされています',
        code: 'BAD_REQUEST',
        status: 400,
        details: {
          ...args,
        },
      })
    }
    // ステータス更新を実行
    return await updateRecord(
      ctx,
      reservation._id,
      {
        status: args.status,
      }
    )
  },
})

// 予約の支払ステータスおよびStripe Checkout Session IDの更新処理
// 支払状況を管理し、必要に応じてStripeのセッション情報も更新する。
// 予約と関連情報の整合性を保つため共通の更新処理を利用。
export const updateReservationPaymentStatus = mutation({
  args: {
    reservation_id: v.id('reservation'),
    payment_status: reservationPaymentStatusType,
    stripe_checkout_session_id: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await updateRecord(
      ctx,
      args.reservation_id,
      {
        payment_status: args.payment_status,
        stripe_checkout_session_id: args.stripe_checkout_session_id,
      }
    )
  },
});

// Stripe Checkout Session IDの更新処理
// Checkout Session作成時に呼び出し、支払ステータスをpendingに設定することで決済待ち状態を管理。
export const updateReservationStripeCheckoutSessionId = mutation({
  args: {
    reservation_id: v.id('reservation'),
    stripe_checkout_session_id: v.string(),
  },
  handler: async (ctx, args) => {
    await updateRecord(
      ctx,
      args.reservation_id,
      {
        stripe_checkout_session_id: args.stripe_checkout_session_id,
        payment_status: 'pending', // Checkout Session作成時はpendingに設定
      }
    )
  },
});

// 複数予約の一括削除処理（内部用）
// 指定された複数の予約IDに対して、関連詳細を含めて物理削除を行う。
// 削除時に存在しないドキュメントがあってもエラーを無視し、処理を継続することで堅牢性を向上。
export const deleteReservationBatch = internalMutation({
  args: {
    ids: v.array(v.id("reservation")),
  },
  handler: async (ctx, { ids }) => {
    // 複数の予約IDに対して並列で削除処理を実行
    await Promise.all(ids.map(async (id) => {
      try{
        await deleteReservationWithDetails(ctx, id);
      } catch (e) {
        // 削除時にエラーが発生してもログに記録し処理は継続
        console.error("予約の削除時にエラーが発生しました" + id, e)
      }
    }));
  },
});