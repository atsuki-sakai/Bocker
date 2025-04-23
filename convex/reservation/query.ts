import { query } from '@/convex/_generated/server';
import { v } from 'convex/values';
import { paginationOptsValidator } from 'convex/server';
import { reservationStatusType } from '@/services/convex/shared/types/common';
import { validateReservation, validateRequired } from '@/services/convex/shared/utils/validation';
import { checkAuth } from '@/services/convex/shared/utils/auth';
import { throwConvexError } from '@/lib/error';
import { canScheduling } from '@/lib/schedule';
// 顧客IDから予約一覧を取得
export const findByCustomerId = query({
  args: {
    customerId: v.id('customer'),
    salonId: v.id('salon'),
    paginationOpts: paginationOptsValidator,
    sort: v.optional(v.union(v.literal('asc'), v.literal('desc'))),
    includeArchive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateReservation(args);
    return await ctx.db
      .query('reservation')
      .withIndex('by_customer_id', (q) =>
        q
          .eq('salonId', args.salonId)
          .eq('customerId', args.customerId)
          .eq('isArchive', args.includeArchive || false)
      )
      .order(args.sort || 'asc')
      .paginate(args.paginationOpts);
  },
});

export const getById = query({
  args: {
    reservationId: v.id('reservation'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);

    return await ctx.db.get(args.reservationId);
  },
});
// スタッフIDから予約一覧を取得
export const findByStaffId = query({
  args: {
    staffId: v.id('staff'),
    salonId: v.id('salon'),
    paginationOpts: paginationOptsValidator,
    sort: v.optional(v.union(v.literal('asc'), v.literal('desc'))),
    includeArchive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateReservation(args);
    return await ctx.db
      .query('reservation')
      .withIndex('by_staff_id', (q) =>
        q
          .eq('salonId', args.salonId)
          .eq('staffId', args.staffId)
          .eq('isArchive', args.includeArchive || false)
      )
      .order(args.sort || 'desc')
      .paginate(args.paginationOpts);
  },
});

// サロンIDから予約一覧を取得
export const findBySalonId = query({
  args: {
    salonId: v.id('salon'),
    paginationOpts: paginationOptsValidator,
    status: v.optional(reservationStatusType),
    sort: v.optional(v.union(v.literal('asc'), v.literal('desc'))),
    includeArchive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateReservation(args);

    const reservations = await ctx.db
      .query('reservation')
      .withIndex('by_status', (q) =>
        q
          .eq('salonId', args.salonId)
          .eq('status', args.status || 'confirmed')
          .eq('isArchive', args.includeArchive || false)
      )
      .order(args.sort || 'desc')
      .paginate(args.paginationOpts);

    return reservations;
  },
});

export const findBySalonIdAndStaffId = query({
  args: {
    salonId: v.id('salon'),
    staffId: v.id('staff'),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const reservations = await ctx.db
      .query('reservation')
      .withIndex('by_staff_id', (q) =>
        q.eq('salonId', args.salonId).eq('staffId', args.staffId).eq('isArchive', false)
      )
      .filter((q) => q.gt(q.field('startTime_unix'), Date.now() / 1000))
      .order('desc')
      .paginate(args.paginationOpts);

    return reservations;
  },
});

// ステータスから予約一覧を取得
export const findByStatus = query({
  args: {
    status: reservationStatusType,
    salonId: v.id('salon'),
    paginationOpts: paginationOptsValidator,
    sort: v.optional(v.union(v.literal('asc'), v.literal('desc'))),
    includeArchive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateReservation(args);
    return await ctx.db
      .query('reservation')
      .withIndex('by_status', (q) =>
        q
          .eq('salonId', args.salonId)
          .eq('status', args.status)
          .eq('isArchive', args.includeArchive || false)
      )
      .order(args.sort || 'desc')
      .paginate(args.paginationOpts);
  },
});

// サロンIDと日付から予約一覧を取得
export const findBySalonAndDate = query({
  args: {
    salonId: v.id('salon'),
    startTime_unix: v.number(),
    paginationOpts: paginationOptsValidator,
    sort: v.optional(v.union(v.literal('asc'), v.literal('desc'))),
    includeArchive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateReservation(args);
    return await ctx.db
      .query('reservation')
      .withIndex('by_salon_date', (q) =>
        q
          .eq('salonId', args.salonId)
          .eq('startTime_unix', args.startTime_unix)
          .eq('isArchive', args.includeArchive || false)
      )
      .order(args.sort || 'desc')
      .paginate(args.paginationOpts);
  },
});

// スタッフIDと日付から予約一覧を取得
export const findByStaffAndDate = query({
  args: {
    staffId: v.id('staff'),
    salonId: v.id('salon'),
    startTime_unix: v.number(),
    paginationOpts: paginationOptsValidator,
    sort: v.optional(v.union(v.literal('asc'), v.literal('desc'))),
    includeArchive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateReservation(args);
    return await ctx.db
      .query('reservation')
      .withIndex('by_staff_date', (q) =>
        q
          .eq('salonId', args.salonId)
          .eq('staffId', args.staffId)
          .eq('startTime_unix', args.startTime_unix)
          .eq('isArchive', args.includeArchive || false)
      )
      .order(args.sort || 'desc')
      .paginate(args.paginationOpts);
  },
});

// 顧客IDと日付から予約一覧を取得
export const findByCustomerAndDate = query({
  args: {
    customerId: v.id('customer'),
    salonId: v.id('salon'),
    startTime_unix: v.number(),
    paginationOpts: paginationOptsValidator,
    sort: v.optional(v.union(v.literal('asc'), v.literal('desc'))),
    includeArchive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateReservation(args);
    return await ctx.db
      .query('reservation')
      .withIndex('by_customer_date', (q) =>
        q
          .eq('salonId', args.salonId)
          .eq('customerId', args.customerId)
          .eq('startTime_unix', args.startTime_unix)
          .eq('isArchive', args.includeArchive || false)
      )
      .order(args.sort || 'desc')
      .paginate(args.paginationOpts);
  },
});

// サロンIDとステータスから予約一覧を取得
export const findBySalonAndStatus = query({
  args: {
    salonId: v.id('salon'),
    status: reservationStatusType,
    paginationOpts: paginationOptsValidator,
    sort: v.optional(v.union(v.literal('asc'), v.literal('desc'))),
    includeArchive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    validateReservation(args);
    checkAuth(ctx);
    return await ctx.db
      .query('reservation')
      .withIndex('by_status', (q) =>
        q
          .eq('salonId', args.salonId)
          .eq('status', args.status)
          .eq('isArchive', args.includeArchive || false)
      )
      .order(args.sort || 'desc')
      .paginate(args.paginationOpts);
  },
});

// 新たに予約可能な時間枠を計算して返す
export const newAvailableTimeSlots = query({
  args: {
    salonId: v.id('salon'),
    date: v.string(), // "YYYY-MM-DD"
    staffId: v.optional(v.id('staff')), // オプション: 特定スタッフを選ぶ場合
    totalTimeToMin: v.number(), // 合計施術時間(分)
    onionMode: v.optional(
      v.object({
        slotSize: v.optional(v.number()), // 時間枠の分割サイズ(分)
        layer: v.optional(v.number()), // 先頭/末尾から抽出する枠数
        disableBackSlots: v.optional(v.boolean()), // 終了時間から逆算するスロットを無効にする
        allowOverlap: v.optional(v.number()), // 営業時間を超過しても許容する分数
      })
    ),
  },
  handler: async (ctx, args) => {
    // 引数バリデーション
    if (!args.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      console.log('日付形式が不正です:', args.date);
      return [];
    }

    if (args.totalTimeToMin <= 0) {
      console.log('施術時間が不正です:', args.totalTimeToMin);
      return [];
    }

    // 日付から曜日を取得
    const targetDate = new Date(args.date);
    if (isNaN(targetDate.getTime())) {
      console.log('日付の変換に失敗しました:', args.date);
      return [];
    }
    const dayOfWeek = getDayOfWeek(targetDate);

    // 1. サロン設定の取得
    const salonConfig = await ctx.db
      .query('salon_schedule_config')
      .withIndex('by_salon_id', (q) => q.eq('salonId', args.salonId).eq('isArchive', false))
      .first();

    if (!salonConfig || !salonConfig.availableSheet) {
      console.log('サロン設定が見つからないか、最大予約数が設定されていません');
      return [];
    }
    const availableSheet = salonConfig.availableSheet;

    // 2. サロンの週間スケジュール取得
    const salonWeekSchedule = await ctx.db
      .query('salon_week_schedule')
      .withIndex('by_salon_week_is_open_day_of_week', (q) =>
        q
          .eq('salonId', args.salonId)
          .eq('dayOfWeek', dayOfWeek)
          .eq('isOpen', true)
          .eq('isArchive', false)
      )
      .first();

    if (!salonWeekSchedule || !salonWeekSchedule.isOpen) {
      console.log(`サロンは${dayOfWeek}曜日は営業していません`);
      return [];
    }

    if (!salonWeekSchedule.startHour || !salonWeekSchedule.endHour) {
      console.log(`サロンの${dayOfWeek}曜日の営業時間が設定されていません`);
      return [];
    }

    // 3. サロンの例外スケジュール (休業日) チェック
    const salonException = await ctx.db
      .query('salon_schedule_exception')
      .withIndex('by_salon_date_type', (q) =>
        q
          .eq('salonId', args.salonId)
          .eq('date', args.date)
          .eq('type', 'holiday')
          .eq('isArchive', false)
      )
      .first();

    if (salonException) {
      console.log('サロンの臨時休業日です:', args.date);
      return [];
    }

    // 4. スタッフの取得
    let staffList = [];
    if (args.staffId) {
      // 特定のスタッフが指定されている場合
      const staff = await ctx.db
        .query('staff')
        .withIndex('by_salon_id', (q) =>
          q.eq('salonId', args.salonId).eq('isActive', true).eq('isArchive', false)
        )
        .filter((q) => q.eq(q.field('_id'), args.staffId))
        .first();

      if (!staff) {
        console.log('指定されたスタッフが見つからないか、非アクティブです');
        return [];
      }
      staffList.push(staff);
    } else {
      // スタッフが指定されていない場合、優先度順にアクティブなスタッフを取得
      const staffs = await ctx.db
        .query('staff')
        .withIndex('by_salon_id', (q) =>
          q.eq('salonId', args.salonId).eq('isActive', true).eq('isArchive', false)
        )
        .collect();

      if (staffs.length === 0) {
        console.log('アクティブなスタッフが見つかりません');
        return [];
      }

      // スタッフ設定(priority)を取得して優先度でソート
      const staffConfigs = await Promise.all(
        staffs.map(async (staff) => {
          const config = await ctx.db
            .query('staff_config')
            .withIndex('by_staff_id', (q) => q.eq('staffId', staff._id).eq('isArchive', false))
            .first();

          return {
            staff,
            priority: config?.priority || 0,
          };
        })
      );

      // 優先度順にソートして上位5名を取得
      staffList = staffConfigs
        .sort((a, b) => b.priority - a.priority)
        .slice(0, 5)
        .map((item) => item.staff);
    }

    // 5. 各スタッフごとの空き時間を計算
    const result = await Promise.all(
      staffList.map(async (staff) => {
        // 5.1 スタッフの週間スケジュール取得
        const staffWeekSchedule = await ctx.db
          .query('staff_week_schedule')
          .withIndex('by_salon_staff_week_is_open', (q) =>
            q
              .eq('salonId', args.salonId)
              .eq('staffId', staff._id)
              .eq('dayOfWeek', dayOfWeek)
              .eq('isOpen', true)
              .eq('isArchive', false)
          )
          .first();

        // スタッフがその曜日に勤務していない場合
        if (!staffWeekSchedule || !staffWeekSchedule.isOpen) {
          return {
            staffId: staff._id,
            slots: [],
          };
        }

        // 5.2 サロンとスタッフの営業時間から有効な勤務時間帯を計算
        const year = targetDate.getFullYear();
        const month = targetDate.getMonth();
        const day = targetDate.getDate();

        // サロンの営業時間
        const [salonStartH, salonStartM] = salonWeekSchedule.startHour
          ? salonWeekSchedule.startHour.split(':').map(Number)
          : [0, 0];
        const [salonEndH, salonEndM] = salonWeekSchedule.endHour
          ? salonWeekSchedule.endHour.split(':').map(Number)
          : [23, 59];
        const salonOpenTime = new Date(year, month, day, salonStartH, salonStartM, 0).getTime();
        const salonCloseTime = new Date(year, month, day, salonEndH, salonEndM, 0).getTime();

        // スタッフの勤務時間
        let staffOpenTime, staffCloseTime;
        if (staffWeekSchedule.startHour && staffWeekSchedule.endHour) {
          const [staffStartH, staffStartM] = staffWeekSchedule.startHour.split(':').map(Number);
          const [staffEndH, staffEndM] = staffWeekSchedule.endHour.split(':').map(Number);
          staffOpenTime = new Date(year, month, day, staffStartH, staffStartM, 0).getTime();
          staffCloseTime = new Date(year, month, day, staffEndH, staffEndM, 0).getTime();
        } else {
          // スタッフの詳細勤務時間がない場合はサロンの時間を採用
          staffOpenTime = salonOpenTime;
          staffCloseTime = salonCloseTime;
        }

        // 有効な営業時間範囲を計算 (サロンとスタッフの共通部分)
        const effectiveOpenTime = Math.max(salonOpenTime, staffOpenTime);
        const effectiveCloseTime = Math.min(salonCloseTime, staffCloseTime);

        // 有効な営業時間がない場合
        if (effectiveOpenTime >= effectiveCloseTime) {
          return {
            staffId: staff._id,
            slots: [],
          };
        }

        // 5.3 スタッフの個別スケジュール (休日/ブロック時間) チェック
        const staffSchedules = await ctx.db
          .query('staff_schedule')
          .withIndex('by_salon_staff_date', (q) =>
            q
              .eq('salonId', args.salonId)
              .eq('staffId', staff._id)
              .eq('date', args.date)
              .eq('isArchive', false)
          )
          .collect();

        // 全日休みの場合
        if (staffSchedules.some((s) => s.type === 'holiday' && s.isAllDay)) {
          return {
            staffId: staff._id,
            slots: [],
          };
        }

        // 5.4 勤務可能な時間帯を計算
        // 初期の連続勤務可能区間 (スタッフの営業時間全体)
        let availableRanges = [
          {
            start: effectiveOpenTime,
            end: effectiveCloseTime,
          },
        ];

        // 個別スケジュールによるブロック時間を反映
        const blockRanges = staffSchedules
          .filter((s) => !s.isAllDay && s.startTime_unix && s.endTime_unix)
          .map((s) => ({
            start: s.startTime_unix! * 1000, // UNIXタイム(秒)からミリ秒へ変換
            end: s.endTime_unix! * 1000,
          }));

        // ブロック時間によって勤務可能区間を分割
        for (const block of blockRanges) {
          const newRanges = [];
          for (const range of availableRanges) {
            // ブロック時間が現在の区間と重なる場合
            if (block.start < range.end && block.end > range.start) {
              // ブロック前の区間があれば追加
              if (range.start < block.start) {
                newRanges.push({
                  start: range.start,
                  end: block.start,
                });
              }
              // ブロック後の区間があれば追加
              if (range.end > block.end) {
                newRanges.push({
                  start: block.end,
                  end: range.end,
                });
              }
            } else {
              // 重ならない場合はそのまま追加
              newRanges.push(range);
            }
          }
          availableRanges = newRanges;
        }

        // 5.5 既存予約の取得（スタッフ個別とサロン全体の両方）
        const startOfDay = new Date(year, month, day, 0, 0, 0).getTime() / 1000;
        const endOfDay = new Date(year, month, day, 23, 59, 59).getTime() / 1000;

        // 予約間隔を取得（分単位）
        const intervalMinutes = salonConfig.reservationIntervalMinutes || 30; // デフォルト30分
        const intervalMillis = intervalMinutes * 60 * 1000;

        // スタッフ個別の予約を取得（当日のみ）
        const staffReservations = await ctx.db
          .query('reservation')
          .withIndex('by_staff_id', (q) =>
            q.eq('salonId', args.salonId).eq('staffId', staff._id).eq('isArchive', false)
          )
          .filter((q) =>
            q.and(
              // 開始時刻が当日範囲内の予約のみ（日付をまたぐ予約は受け付けない）
              q.gte(q.field('startTime_unix'), startOfDay),
              q.lte(q.field('startTime_unix'), endOfDay),
              q.or(q.eq(q.field('status'), 'confirmed'), q.eq(q.field('status'), 'pending'))
            )
          )
          .collect();

        // サロン全体の予約を取得（同時予約数チェック用）
        const allSalonReservations = await ctx.db
          .query('reservation')
          .withIndex('by_salon_id', (q) => q.eq('salonId', args.salonId).eq('isArchive', false))
          .filter((q) =>
            q.and(
              // 開始時刻が当日範囲内の予約のみ（日付をまたぐ予約は受け付けない）
              q.gte(q.field('startTime_unix'), startOfDay),
              q.lte(q.field('startTime_unix'), endOfDay),
              q.or(q.eq(q.field('status'), 'confirmed'), q.eq(q.field('status'), 'pending'))
            )
          )
          .collect();

        // スタッフ個別の予約カウント
        const staffTimeSlotCounts = new Map();
        for (const res of staffReservations) {
          const startTime = res.startTime_unix! * 1000; // 秒→ミリ秒に変換
          const endTime = res.endTime_unix! * 1000;

          // 予約間隔に合わせてサンプリング
          for (let time = startTime; time < endTime; time += intervalMillis) {
            const count = staffTimeSlotCounts.get(time) || 0;
            staffTimeSlotCounts.set(time, count + 1);
          }
        }

        // サロン全体の予約カウント（同時予約上限チェック用）
        const salonTimeSlotCounts = new Map();
        for (const res of allSalonReservations) {
          const startTime = res.startTime_unix! * 1000;
          const endTime = res.endTime_unix! * 1000;

          // 予約間隔に合わせてサンプリング
          for (let time = startTime; time < endTime; time += intervalMillis) {
            const count = salonTimeSlotCounts.get(time) || 0;
            salonTimeSlotCounts.set(time, count + 1);
          }
        }

        // 5.6 同時予約数を考慮した空き時間帯の計算
        const finalRanges = [];
        for (const range of availableRanges) {
          let currentStart = range.start;
          let isRangeOpen = true;

          // 予約間隔でチェック
          for (let time = range.start; time < range.end; time += intervalMillis) {
            const staffCount = staffTimeSlotCounts.get(time) || 0;
            const salonCount = salonTimeSlotCounts.get(time) || 0;

            // スタッフが既に予約済み、またはサロン全体の最大同時予約数に達した場合
            if (staffCount > 0 || salonCount >= availableSheet) {
              if (isRangeOpen) {
                // 現在のオープン区間を閉じる
                if (currentStart < time) {
                  finalRanges.push({
                    start: currentStart,
                    end: time,
                  });
                }
                isRangeOpen = false;
              }
            } else if (!isRangeOpen) {
              // 新しい区間を開始
              currentStart = time;
              isRangeOpen = true;
            }
          }

          // 最後の区間を追加
          if (isRangeOpen && currentStart < range.end) {
            finalRanges.push({
              start: currentStart,
              end: range.end,
            });
          }
        }

        // 5.7 施術時間を確保できる時間枠を抽出
        const requiredDuration = args.totalTimeToMin * 60000; // ミリ秒に変換
        let availableSlots: { startTime_unix: number; endTime_unix: number }[] = [];

        for (const range of finalRanges) {
          // 区間の長さが施術時間以上の場合のみ処理
          if (range.end - range.start >= requiredDuration) {
            // 各開始可能時点を予約間隔に従って検出
            for (
              let startTime = range.start;
              startTime + requiredDuration <= range.end;
              startTime += intervalMillis
            ) {
              availableSlots.push({
                startTime_unix: Math.floor(startTime / 1000),
                endTime_unix: Math.floor((startTime + requiredDuration) / 1000),
              });
            }
          }
        }

        // 5.8 オニオンモードの適用
        if (args.onionMode) {
          const {
            slotSize = 60,
            layer = 2,
            disableBackSlots = false,
            allowOverlap = 0,
          } = args.onionMode;

          // 営業開始時間と終了時間を分単位に変換
          const startWorkTimeMin = Math.floor(effectiveOpenTime / 1000 / 60); // 分単位
          const endWorkTimeMin = Math.floor(effectiveCloseTime / 1000 / 60); // 分単位

          // 施術時間（分単位）
          const totalMin = args.totalTimeToMin;

          // 仕様に従った関数を実装
          const generateTimeSlots = (
            totalmin: number,
            startMin: number,
            endMin: number,
            layer: number,
            slotsize: number,
            disableBack: boolean,
            overlapMin: number = 0
          ) => {
            // 2. 前方から時間枠を生成
            const frontSlots: [number, number][] = [];
            for (let i = 0; i < layer; i++) {
              const slotStart = startMin + i * slotsize;
              const slotEnd = slotStart + totalmin;

              // 営業時間内かチェック (オーバーラップを許容)
              if (slotStart >= startMin && slotEnd <= endMin + overlapMin) {
                // この時間枠が予約可能かどうかチェック
                let isSlotAvailable = true;
                const slotStartMs = slotStart * 60 * 1000;
                // 営業時間を超える部分はチェックしない
                const checkEndTime = Math.min(slotEnd, endMin);
                const slotEndMs = checkEndTime * 60 * 1000;

                // 予約間隔でチェック
                for (
                  let checkTime = slotStartMs;
                  checkTime < slotEndMs;
                  checkTime += intervalMillis
                ) {
                  // スタッフの予約状況をチェック
                  const staffCount = staffTimeSlotCounts.get(checkTime) || 0;
                  // サロン全体の予約状況をチェック
                  const salonCount = salonTimeSlotCounts.get(checkTime) || 0;

                  // スタッフがすでに予約済み、またはサロンの同時予約上限に達している場合
                  if (staffCount > 0 || salonCount >= availableSheet) {
                    isSlotAvailable = false;
                    break;
                  }
                }

                // 予約可能な場合のみスロットに追加
                if (isSlotAvailable) {
                  frontSlots.push([slotStart, slotEnd]);
                }
              }
            }

            // disableBackSlotsが有効な場合は後方スロットを追加しない
            if (disableBack) {
              // 時間順に並べ替え
              frontSlots.sort((a, b) => a[0] - b[0]);

              // フォーマット関数
              const formatMinutes = (total: number) => {
                const hh = Math.floor(total / 60);
                const mm = total % 60;
                return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
              };

              // 時間枠をUNIXタイムに変換して返す
              return frontSlots.map(([s, e]) => {
                const startTimeUnix = Math.floor(s * 60); // 秒単位
                const endTimeUnix = Math.floor(e * 60); // 秒単位

                return {
                  startTime_unix: startTimeUnix,
                  endTime_unix: endTimeUnix,
                  // デバッグ用にフォーマット済みの時間も含める
                  startTimeFormatted: formatMinutes(s),
                  endTimeFormatted: formatMinutes(e),
                  // オーバーラップがあるかどうかのフラグ
                  hasOverlap: e > endMin,
                };
              });
            }

            // 3. 後方から時間枠を生成 (disableBackSlotsが無効の場合のみ)
            const backSlots: [number, number][] = [];
            for (let i = 0; i < layer; i++) {
              const slotEnd = endMin - i * slotsize;
              const slotStart = slotEnd - totalmin;

              // 営業時間内かチェック
              if (slotStart >= startMin && slotEnd <= endMin) {
                // この時間枠が予約可能かどうかチェック
                let isSlotAvailable = true;
                const slotStartMs = slotStart * 60 * 1000;
                const slotEndMs = slotEnd * 60 * 1000;

                // 予約間隔でチェック
                for (
                  let checkTime = slotStartMs;
                  checkTime < slotEndMs;
                  checkTime += intervalMillis
                ) {
                  // スタッフの予約状況をチェック
                  const staffCount = staffTimeSlotCounts.get(checkTime) || 0;
                  // サロン全体の予約状況をチェック
                  const salonCount = salonTimeSlotCounts.get(checkTime) || 0;

                  // スタッフがすでに予約済み、またはサロンの同時予約上限に達している場合
                  if (staffCount > 0 || salonCount >= availableSheet) {
                    isSlotAvailable = false;
                    break;
                  }
                }

                // 予約可能な場合のみスロットに追加
                if (isSlotAvailable) {
                  backSlots.push([slotStart, slotEnd]);
                }
              }
            }

            // 後方スロットを開始時間昇順にソート
            backSlots.sort((a, b) => a[0] - b[0]);

            // 4. 前方と後方を結合し、重複を除外
            const merged = [...frontSlots];
            for (const [bs, be] of backSlots) {
              // 既存のスロットと重複してないか確認
              let isOverlap = false;
              for (const [ms, me] of merged) {
                // 重複判定: 開始時間が既存の終了時間以前 かつ 終了時間が既存の開始時間以降
                if (!(be <= ms || bs >= me)) {
                  isOverlap = true;
                  break;
                }
              }

              // 重複がない場合のみ追加（仕様: 早い方を優先）
              if (!isOverlap) {
                merged.push([bs, be]);
              }
            }

            // 時間順に並べ替え
            merged.sort((a, b) => a[0] - b[0]);

            // フォーマット関数
            const formatMinutes = (total: number) => {
              const hh = Math.floor(total / 60);
              const mm = total % 60;
              return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
            };

            // 時間枠をUNIXタイムに変換して返す
            return merged.map(([s, e]) => {
              const startTimeUnix = Math.floor(s * 60); // 秒単位
              const endTimeUnix = Math.floor(e * 60); // 秒単位

              return {
                startTime_unix: startTimeUnix,
                endTime_unix: endTimeUnix,
                // デバッグ用にフォーマット済みの時間も含める
                startTimeFormatted: formatMinutes(s),
                endTimeFormatted: formatMinutes(e),
                // オーバーラップがあるかどうかのフラグ
                hasOverlap: e > endMin,
              };
            });
          };

          // オニオンモードで時間枠を生成
          const generatedSlots = generateTimeSlots(
            totalMin,
            startWorkTimeMin,
            endWorkTimeMin,
            layer,
            slotSize,
            disableBackSlots,
            allowOverlap
          );

          // UNIX形式のスロットのみに変換して返す
          availableSlots = generatedSlots.map((slot) => ({
            startTime_unix: slot.startTime_unix,
            endTime_unix: slot.endTime_unix,
          }));
        }

        return {
          staffId: staff._id,
          slots: availableSlots,
        };
      })
    );

    return result;
  },
});

// 利用可能な予約の空き時間枠を取得
export const getAvailableTimeSlots = query({
  args: {
    salonId: v.id('salon'),
    date: v.string(), // 予約を希望する日付(YYYY-MM-DD形式)
    staffId: v.optional(v.id('staff')), // オプショナル: 特定のスタッフを指定する場合
    totalTimeToMin: v.number(), // 合計の施術時間(分)
  },
  handler: async (ctx, args) => {
    // 認証チェック
    checkAuth(ctx, true);

    // 引数のバリデーション
    validateRequired(args.date, '予約日');
    console.log('API - 受け取ったパラメータ:', {
      salonId: args.salonId,
      date: args.date,
      staffId: args.staffId,
      totalTimeToMin: args.totalTimeToMin,
    });

    // 日付形式を確認して修正
    // YYYY-MM-DD形式であることを前提
    if (!args.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      console.error('日付形式が不正です:', args.date);
      return { timeSlots: [] };
    }

    // 指定日のUNIXタイムスタンプを取得 (その日の0時0分)
    const targetDate = new Date(args.date);
    console.log('targetDate:', targetDate);

    // 日付が不正な場合は空配列を返す
    if (isNaN(targetDate.getTime())) {
      console.error('日付の変換に失敗しました:', args.date);
      return { timeSlots: [] };
    }

    const year = targetDate.getFullYear();
    const month = targetDate.getMonth();
    const day = targetDate.getDate();
    const startOfDay = new Date(year, month, day, 0, 0, 0).getTime() / 1000;
    const endOfDay = new Date(year, month, day, 23, 59, 59).getTime() / 1000;
    console.log('日時範囲:', { startOfDay, endOfDay });

    // 曜日を取得
    const dayOfWeek = getDayOfWeek(targetDate);
    console.log('曜日:', dayOfWeek);

    // 1. サロンの設定を取得
    const salonConfig = await ctx.db
      .query('salon_schedule_config')
      .withIndex('by_salon_id', (q) => q.eq('salonId', args.salonId).eq('isArchive', false))
      .first();

    if (!salonConfig) {
      console.error('サロン設定が見つかりません:', args.salonId);
      throw throwConvexError({
        message: 'サロンのスケジュール設定が見つかりません',
        status: 404,
        code: 'NOT_FOUND',
        title: 'サロンのスケジュール設定が見つかりません',
        callFunc: 'reservation.getAvailableTimeSlots',
        severity: 'low',
        details: { ...args },
      });
    }

    // 予約間隔(分)を取得
    const interval = salonConfig.reservationIntervalMinutes || 30; // デフォルト30分
    console.log('予約間隔(分):', interval);

    // 2. サロンのスケジュール設定を取得
    const daySchedules = await ctx.db
      .query('salon_week_schedule')
      .withIndex('by_salon_id', (q) => q.eq('salonId', args.salonId).eq('isArchive', false))
      .filter((q) => q.eq(q.field('dayOfWeek'), dayOfWeek))
      .collect();

    console.log(
      `サロンの${dayOfWeek}曜日のスケジュール (isOpenに関わらず):`,
      daySchedules.map((s) => ({
        dayOfWeek: s.dayOfWeek,
        isOpen: s.isOpen,
        startHour: s.startHour,
        endHour: s.endHour,
      }))
    );

    // 3. 営業日のスケジュールを取得
    const salonSchedule = await ctx.db
      .query('salon_week_schedule')
      .withIndex('by_salon_week_is_open_day_of_week', (q) =>
        q
          .eq('salonId', args.salonId)
          .eq('dayOfWeek', dayOfWeek)
          .eq('isOpen', true)
          .eq('isArchive', false)
      )
      .first();

    // 営業日でない場合や営業時間の設定がない場合の詳細ログ
    if (!salonSchedule) {
      console.log(`サロンの${dayOfWeek}曜日のスケジュールが見つかりません`);
      return { timeSlots: [] };
    }

    if (!salonSchedule.startHour) {
      console.log(`サロンの${dayOfWeek}曜日の開始時間が設定されていません`);
      return { timeSlots: [] };
    }

    if (!salonSchedule.endHour) {
      console.log(`サロンの${dayOfWeek}曜日の終了時間が設定されていません`);
      return { timeSlots: [] };
    }

    console.log('サロンスケジュール:', {
      ...salonSchedule,
      startHour: salonSchedule.startHour,
      endHour: salonSchedule.endHour,
    });

    // 4. サロンの臨時休業日をチェック
    const salonException = await ctx.db
      .query('salon_schedule_exception')
      .withIndex('by_salon_date_type', (q) =>
        q
          .eq('salonId', args.salonId)
          .eq('date', args.date)
          .eq('type', 'holiday')
          .eq('isArchive', false)
      )
      .first();

    // 臨時休業日の場合は空配列を返す
    if (salonException) {
      console.log('サロンの臨時休業日です:', args.date);
      return { timeSlots: [] };
    }

    // 5. スタッフ関連のデータを取得
    let staffIds = [];
    if (args.staffId) {
      // 特定のスタッフが指定されている場合
      const staff = await ctx.db
        .query('staff')
        .withIndex('by_salon_id', (q) =>
          q.eq('salonId', args.salonId).eq('isActive', true).eq('isArchive', false)
        )
        .filter((q) => q.eq(q.field('_id'), args.staffId))
        .first();

      if (!staff) {
        console.error('指定されたスタッフが見つかりません:', args.staffId);
        throw throwConvexError({
          message: '指定されたスタッフが見つかりません',
          status: 404,
          code: 'NOT_FOUND',
          title: '指定されたスタッフが見つかりません',
          callFunc: 'reservation.getAvailableTimeSlots',
          severity: 'low',
          details: { ...args },
        });
      }

      staffIds.push(staff._id);
    } else {
      // スタッフが指定されていない場合、全アクティブスタッフを取得
      const staffs = await ctx.db
        .query('staff')
        .withIndex('by_salon_id', (q) =>
          q.eq('salonId', args.salonId).eq('isActive', true).eq('isArchive', false)
        )
        .collect();

      staffIds = staffs.map((staff) => staff._id);
    }

    // スタッフが見つからない場合
    if (staffIds.length === 0) {
      console.log('利用可能なスタッフが見つかりません');
      return { timeSlots: [] };
    }
    console.log('利用可能なスタッフ数:', staffIds.length);

    // 6. スタッフの休日情報を事前にまとめて取得
    const staffHolidays = await Promise.all(
      staffIds.map(async (staffId) => {
        const holiday = await ctx.db
          .query('staff_schedule')
          .withIndex('by_salon_staff_date_type', (q) =>
            q
              .eq('salonId', args.salonId)
              .eq('staffId', staffId)
              .eq('date', args.date)
              .eq('type', 'holiday')
              .eq('isArchive', false)
          )
          .first();
        console.log(args);
        console.log(holiday);
        console.log('スタッフの休日情報:', { staffId, holiday });
        return { staffId, isHoliday: !!holiday };
      })
    );

    // 休日のスタッフをフィルタリング
    const availableStaffIds = staffIds.filter(
      (staffId) => !staffHolidays.find((h) => h.staffId === staffId && h.isHoliday)
    );

    console.log('休日を除いた利用可能なスタッフ数:', availableStaffIds.length);
    if (availableStaffIds.length === 0) {
      return { timeSlots: [] };
    }

    // 7. スタッフの曜日スケジュールを一括取得
    const staffWeekSchedules = await Promise.all(
      availableStaffIds.map(async (staffId) => {
        const schedule = await ctx.db
          .query('staff_week_schedule')
          .withIndex('by_salon_staff_week_is_open', (q) =>
            q
              .eq('salonId', args.salonId)
              .eq('staffId', staffId)
              .eq('dayOfWeek', dayOfWeek)
              .eq('isOpen', true)
              .eq('isArchive', false)
          )
          .first();
        return { staffId, schedule };
      })
    );

    // 8. 全スタッフの予約情報を一括取得
    const allStaffReservations = await Promise.all(
      availableStaffIds.map(async (staffId) => {
        const reservations = await ctx.db
          .query('reservation')
          .withIndex('by_staff_id', (q) =>
            q.eq('salonId', args.salonId).eq('staffId', staffId).eq('isArchive', false)
          )
          .filter((q) =>
            q.and(
              q.gte(q.field('startTime_unix'), startOfDay),
              q.lte(q.field('startTime_unix'), endOfDay),
              q.or(q.eq(q.field('status'), 'confirmed'), q.eq(q.field('status'), 'pending'))
            )
          )
          .collect();
        return { staffId, reservations };
      })
    );

    // 施術時間は引数から直接取得
    const menuDuration = args.totalTimeToMin;
    console.log('施術時間(分):', menuDuration);

    // 9. サロンの営業時間からスロットを生成
    const [startH, startM] = salonSchedule.startHour.split(':').map(Number);
    const [endH, endM] = salonSchedule.endHour.split(':').map(Number);

    // 営業開始時間と終了時間をUNIXタイムスタンプに変換
    const openTime = new Date(year, month, day, startH, startM, 0).getTime() / 1000;
    const closeTime = new Date(year, month, day, endH, endM, 0).getTime() / 1000;
    console.log('サロン営業時間:', {
      openTime,
      closeTime,
      開始時間: `${startH}:${startM.toString().padStart(2, '0')}`,
      終了時間: `${endH}:${endM.toString().padStart(2, '0')}`,
      日付: `${year}/${month + 1}/${day}`,
    });

    // 10. 各スタッフの営業時間情報を準備
    const staffBusinessHours = staffWeekSchedules.map(({ staffId, schedule }) => {
      if (schedule && schedule.startHour && schedule.endHour) {
        const [staffStartH, staffStartM] = schedule.startHour.split(':').map(Number);
        const [staffEndH, staffEndM] = schedule.endHour.split(':').map(Number);

        const staffOpenTime =
          new Date(year, month, day, staffStartH, staffStartM, 0).getTime() / 1000;
        const staffCloseTime = new Date(year, month, day, staffEndH, staffEndM, 0).getTime() / 1000;

        // サロンとスタッフの共通営業時間を計算
        const effectiveOpenTime = Math.max(openTime, staffOpenTime);
        const effectiveCloseTime = Math.min(closeTime, staffCloseTime);

        // 有効な共通時間があるか確認（開始時間が終了時間より前か）
        const isValid = effectiveOpenTime < effectiveCloseTime;

        console.log(`スタッフID ${staffId} の営業時間計算:`, {
          スタッフ開始: new Date(staffOpenTime * 1000).toLocaleTimeString('ja-JP'),
          スタッフ終了: new Date(staffCloseTime * 1000).toLocaleTimeString('ja-JP'),
          サロン開始: new Date(openTime * 1000).toLocaleTimeString('ja-JP'),
          サロン終了: new Date(closeTime * 1000).toLocaleTimeString('ja-JP'),
          最終開始: new Date(effectiveOpenTime * 1000).toLocaleTimeString('ja-JP'),
          最終終了: new Date(effectiveCloseTime * 1000).toLocaleTimeString('ja-JP'),
          有効: isValid,
        });

        return {
          staffId,
          hasCustomHours: true,
          openTime: effectiveOpenTime,
          closeTime: effectiveCloseTime,
          isValid: isValid,
        };
      }

      // カスタム時間がない場合はサロンの時間を使用
      return {
        staffId,
        hasCustomHours: false,
        openTime,
        closeTime,
        isValid: true, // サロンの営業時間はすでに有効と確認済み
      };
    });

    // 11. 有効な営業時間がないスタッフをフィルタリング
    const validStaffBusinessHours = staffBusinessHours.filter((staff) => staff.isValid);
    console.log('有効な営業時間があるスタッフ数:', validStaffBusinessHours.length);

    // スタッフがいない場合は空の結果を返す
    if (validStaffBusinessHours.length === 0) {
      console.log('有効な営業時間のあるスタッフが見つかりません');
      return { timeSlots: [] };
    }

    // 12. 各時間スロットを生成
    const availableTimeSlots = [];

    // スタッフが指定されている場合のチェックを強化（for文の前に移動）
    if (args.staffId) {
      // 指定されたスタッフが休日の場合は処理を終了
      const isStaffOnHoliday = staffHolidays.some((h) => h.staffId === args.staffId && h.isHoliday);

      if (isStaffOnHoliday) {
        console.log(`指定されたスタッフID ${args.staffId} は休日です`);
        return { timeSlots: [] };
      }

      // 有効な営業時間があるかの追加チェック
      const targetStaff = validStaffBusinessHours.find((s) => s.staffId === args.staffId);
      if (!targetStaff) {
        console.log(`指定されたスタッフID ${args.staffId} は有効な営業時間がありません`);
        return { timeSlots: [] };
      }
    }

    // スタッフフィルタリング
    const staffsToCheck = args.staffId
      ? validStaffBusinessHours.filter((s) => s.staffId === args.staffId)
      : validStaffBusinessHours;

    // 欠落していたfor文を追加
    for (let slotTime = openTime; slotTime < closeTime; slotTime += interval * 60) {
      // メニュー所要時間を考慮したスロット終了時間
      const slotEndTime = slotTime + menuDuration * 60;

      // 13. この時間スロットで利用可能なスタッフがいるかチェック
      let availableStaffFound = false;

      // 各スタッフについてチェック
      for (const staffInfo of staffsToCheck) {
        const {
          staffId,
          hasCustomHours,
          openTime: staffOpenTime,
          closeTime: staffCloseTime,
        } = staffInfo;

        const currentSlotStart = new Date(slotTime * 1000);
        const currentSlotEnd = new Date(slotEndTime * 1000);
        const formattedSlot = `${currentSlotStart.getHours()}:${currentSlotStart.getMinutes().toString().padStart(2, '0')} 〜 ${currentSlotEnd.getHours()}:${currentSlotEnd.getMinutes().toString().padStart(2, '0')}`;

        console.log(`スタッフID ${staffId} のスロット確認: ${formattedSlot}`);

        // スタッフの営業時間外の場合はスキップ
        if (slotTime < staffOpenTime || slotEndTime > staffCloseTime) {
          if (hasCustomHours) {
            console.log(
              `スキップされた時間枠(スタッフ営業時間外): ${currentSlotStart.getHours()}:${currentSlotStart.getMinutes().toString().padStart(2, '0')} 〜 ${currentSlotEnd.getHours()}:${currentSlotEnd.getMinutes().toString().padStart(2, '0')}`
            );
          }
          continue;
        }

        // 14. スタッフの既存予約と重なるかチェック
        const staffReservations =
          allStaffReservations.find((r) => r.staffId === staffId)?.reservations || [];

        const hasConflict = staffReservations.some((res) => {
          // nullやundefinedの安全な処理
          if (res.startTime_unix === undefined || res.endTime_unix === undefined) {
            console.log('予約情報が不完全:', res._id);
            return false; // 不完全な予約情報は衝突なしとして扱う
          }

          // 予約時間のオーバーラップをチェック
          const overlap = slotTime < res.endTime_unix && slotEndTime > res.startTime_unix;

          if (overlap) {
            console.log(`予約 ${res._id} と重複`);
            const resStart = new Date(res.startTime_unix * 1000);
            const resEnd = new Date(res.endTime_unix * 1000);
            console.log(
              `既存予約: ${resStart.getHours()}:${resStart.getMinutes().toString().padStart(2, '0')} 〜 ${resEnd.getHours()}:${resEnd.getMinutes().toString().padStart(2, '0')}`
            );
          }

          return overlap;
        });

        if (!hasConflict) {
          // 利用可能なスタッフが見つかった
          availableStaffFound = true;
          break;
        }
      }

      // 15. 少なくとも1人のスタッフが利用可能な場合、スロットを追加
      if (availableStaffFound) {
        const date = new Date(slotTime * 1000);
        const endDate = new Date(slotEndTime * 1000);
        const formattedStart = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
        const formattedEnd = `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;

        availableTimeSlots.push({
          startTime: slotTime,
          endTime: slotEndTime,
          startTimeFormatted: formattedStart,
          endTimeFormatted: formattedEnd,
        });

        console.log(`予約可能な時間枠を追加: ${formattedStart} 〜 ${formattedEnd}`);
      }
    }

    console.log('利用可能な時間スロット数:', availableTimeSlots.length);
    if (availableTimeSlots.length > 0) {
      console.log(
        '最初の予約枠:',
        availableTimeSlots[0].startTimeFormatted,
        '〜',
        availableTimeSlots[0].endTimeFormatted
      );
      console.log(
        '最後の予約枠:',
        availableTimeSlots[availableTimeSlots.length - 1].startTimeFormatted,
        '〜',
        availableTimeSlots[availableTimeSlots.length - 1].endTimeFormatted
      );
    }
    return { timeSlots: availableTimeSlots };
  },
});

// 予約可能かの判定
export const checkAvailableTimeSlot = query({
  args: {
    salonId: v.id('salon'),
    staffId: v.id('staff'),
    date: v.string(),
    startTime: v.number(),
    endTime: v.number(),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateRequired(args.date, '予約日');

    // 日付オブジェクトの作成と曜日の取得
    const targetDate = new Date(args.date);
    if (isNaN(targetDate.getTime())) {
      throw throwConvexError({
        message: '無効な日付形式です',
        status: 400,
        code: 'INVALID_ARGUMENT',
        title: '無効な日付形式です',
        callFunc: 'reservation.checkAvailableTimeSlot',
        severity: 'low',
        details: { ...args },
      });
    }
    const dayOfWeek = getDayOfWeek(targetDate);

    // 1. サロンの営業時間チェック
    const salonSchedule = await ctx.db
      .query('salon_week_schedule')
      .withIndex('by_salon_week_is_open_day_of_week', (q) =>
        q
          .eq('salonId', args.salonId)
          .eq('dayOfWeek', dayOfWeek)
          .eq('isOpen', true)
          .eq('isArchive', false)
      )
      .first();

    if (!salonSchedule) {
      console.log(`サロンは${dayOfWeek}曜日は営業していません`);
      return false;
    }

    if (!salonSchedule.startHour || !salonSchedule.endHour) {
      console.log(`サロンの${dayOfWeek}曜日の営業時間が設定されていません`);
      return false;
    }

    // サロン営業時間をUNIXタイムスタンプに変換
    const [startH, startM] = salonSchedule.startHour.split(':').map(Number);
    const [endH, endM] = salonSchedule.endHour.split(':').map(Number);

    const year = targetDate.getFullYear();
    const month = targetDate.getMonth();
    const day = targetDate.getDate();

    const salonOpenTime = new Date(year, month, day, startH, startM, 0).getTime() / 1000;
    const salonCloseTime = new Date(year, month, day, endH, endM, 0).getTime() / 1000;

    // 予約時間がサロンの営業時間外かチェック
    if (args.startTime < salonOpenTime || args.endTime > salonCloseTime) {
      console.log('予約時間がサロンの営業時間外です');
      return false;
    }

    // 2. サロンの臨時休業日をチェック
    const salonException = await ctx.db
      .query('salon_schedule_exception')
      .withIndex('by_salon_date_type', (q) =>
        q
          .eq('salonId', args.salonId)
          .eq('date', args.date)
          .eq('type', 'holiday')
          .eq('isArchive', false)
      )
      .first();

    if (salonException) {
      console.log('サロンの臨時休業日です');
      return false;
    }

    // 3. スタッフの営業時間をチェック
    const staffSchedule = await ctx.db
      .query('staff_week_schedule')
      .withIndex('by_salon_staff_week_is_open', (q) =>
        q
          .eq('salonId', args.salonId)
          .eq('staffId', args.staffId)
          .eq('dayOfWeek', dayOfWeek)
          .eq('isOpen', true)
          .eq('isArchive', false)
      )
      .first();

    // スタッフが当日営業しているかチェック
    if (staffSchedule) {
      if (staffSchedule.startHour && staffSchedule.endHour) {
        // スタッフの営業時間をUNIXタイムスタンプに変換
        const [staffStartH, staffStartM] = staffSchedule.startHour.split(':').map(Number);
        const [staffEndH, staffEndM] = staffSchedule.endHour.split(':').map(Number);

        const staffOpenTime =
          new Date(year, month, day, staffStartH, staffStartM, 0).getTime() / 1000;
        const staffCloseTime = new Date(year, month, day, staffEndH, staffEndM, 0).getTime() / 1000;

        // 予約時間がスタッフの営業時間外かチェック
        if (args.startTime < staffOpenTime || args.endTime > staffCloseTime) {
          console.log('予約時間がスタッフの営業時間外です');
          return false;
        }
      }
    } else {
      // スタッフが営業日でない場合、サロンのデフォルト営業時間を使用するか確認
      const staffDefault = await ctx.db
        .query('staff_week_schedule')
        .withIndex('by_salon_id_staff_id_day_of_week', (q) =>
          q
            .eq('salonId', args.salonId)
            .eq('staffId', args.staffId)
            .eq('dayOfWeek', dayOfWeek)
            .eq('isArchive', false)
        )
        .first();

      // スタッフのその曜日のスケジュールが存在して、isOpenがfalseの場合は予約不可
      if (staffDefault && staffDefault.isOpen === false) {
        console.log(`スタッフは${dayOfWeek}曜日は勤務していません`);
        return false;
      }
    }

    // 4. スタッフの休日や予定をチェック
    // 休日チェック
    const staffHoliday = await ctx.db
      .query('staff_schedule')
      .withIndex('by_salon_staff_date_type', (q) =>
        q
          .eq('salonId', args.salonId)
          .eq('staffId', args.staffId)
          .eq('date', args.date)
          .eq('type', 'holiday')
          .eq('isArchive', false)
      )
      .first();

    if (staffHoliday && staffHoliday.isAllDay) {
      console.log('スタッフは当日休日です');
      return false;
    }

    // 5. スタッフの既存の予約や予定をチェック
    // 予約チェック
    const existingReservations = await ctx.db
      .query('reservation')
      .withIndex('by_staff_id', (q) =>
        q.eq('salonId', args.salonId).eq('staffId', args.staffId).eq('isArchive', false)
      )
      .filter((q) =>
        q.and(
          q.or(q.eq(q.field('status'), 'confirmed'), q.eq(q.field('status'), 'pending')),
          // 予約時間と重複するかどうかをチェック
          q.lt(q.field('startTime_unix'), args.endTime),
          q.gt(q.field('endTime_unix'), args.startTime)
        )
      )
      .collect();

    if (existingReservations.length > 0) {
      console.log(
        '既存の予約と重複しています',
        existingReservations.map((r) => r._id)
      );
      return false;
    }

    // スタッフのその他の予定（休日以外）をチェック
    const staffSchedules = await ctx.db
      .query('staff_schedule')
      .withIndex('by_salon_staff_date', (q) =>
        q
          .eq('salonId', args.salonId)
          .eq('staffId', args.staffId)
          .eq('date', args.date)
          .eq('isArchive', false)
      )
      .filter((q) => q.and(q.neq(q.field('type'), 'holiday'), q.neq(q.field('isAllDay'), true)))
      .collect();

    // スタッフのスケジュールを配列に変換
    const staffSchedulesArray = staffSchedules.map((schedule) => ({
      start: schedule.startTime_unix!,
      end: schedule.endTime_unix!,
    }));

    // canScheduling関数で時間の重複をチェック
    const canSchedule = canScheduling(staffSchedulesArray, {
      start: args.startTime,
      end: args.endTime,
    });

    if (!canSchedule) {
      console.log('スタッフの予定と重複しています');
      return false;
    }

    // すべての条件を満たした場合、予約可能
    return true;
  },
});

// 日付から曜日を取得するヘルパー関数
function getDayOfWeek(
  date: Date
): 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday' {
  const dayNames = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
  ] as const;
  return dayNames[date.getDay()];
}


