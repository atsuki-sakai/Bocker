interface BatchRequest<T> {
  id: string
  execute: () => Promise<T>
  priority?: number
  timeout?: number
}

interface BatchResult<T> {
  id: string
  success: boolean
  data?: T
  error?: Error
  duration: number
}

export class BatchProcessor {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private queue: BatchRequest<any>[] = []
  private processing = false
  private concurrentLimit = 3
  private defaultTimeout = 10000 // 10秒

  constructor(concurrentLimit = 3) {
    this.concurrentLimit = concurrentLimit
  }

  // リクエストをキューに追加
  add<T>(request: BatchRequest<T>): void {
    this.queue.push(request)
    // 優先度でソート（高い順）
    this.queue.sort((a, b) => (b.priority || 0) - (a.priority || 0))
  }

  // バッチ処理を実行
  async process<T>(): Promise<BatchResult<T>[]> {
    if (this.processing) {
      throw new Error('Batch processing is already in progress')
    }

    this.processing = true
    const results: BatchResult<T>[] = []
    
    try {
      while (this.queue.length > 0) {
        // 同時実行数分のリクエストを取得
        const batch = this.queue.splice(0, this.concurrentLimit)
        
        // 並列実行
        const batchResults = await Promise.all(
          batch.map(request => this.executeWithTimeout(request))
        )
        
        results.push(...batchResults)
      }
      
      return results
    } finally {
      this.processing = false
    }
  }

  // タイムアウト付きでリクエストを実行
  private async executeWithTimeout<T>(
    request: BatchRequest<T>
  ): Promise<BatchResult<T>> {
    const startTime = Date.now()
    const timeout = request.timeout || this.defaultTimeout

    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), timeout)
      })

      const data = await Promise.race([
        request.execute(),
        timeoutPromise,
      ])

      return {
        id: request.id,
        success: true,
        data,
        duration: Date.now() - startTime,
      }
    } catch (error) {
      return {
        id: request.id,
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
        duration: Date.now() - startTime,
      }
    }
  }

  // キューをクリア
  clear(): void {
    this.queue = []
  }

  // キューのサイズを取得
  size(): number {
    return this.queue.length
  }
}

// LINE認証関連のバッチ処理ヘルパー
export async function batchAuthProcessing(
  tasks: Array<{
    name: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    task: () => Promise<any>
    priority?: number
  }>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<Map<string, any>> {
  const processor = new BatchProcessor(3)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const resultMap = new Map<string, any>()

  // タスクをバッチプロセッサーに追加
  tasks.forEach(({ name, task, priority }) => {
    processor.add({
      id: name,
      execute: task,
      priority: priority || 0,
    })
  })

  // バッチ処理を実行
  const results = await processor.process()

  // 結果をMapに変換
  results.forEach(result => {
    if (result.success) {
      resultMap.set(result.id, result.data)
    } else {
      console.error(`[batchAuthProcessing] Task ${result.id} failed:`, result.error)
      resultMap.set(result.id, null)
    }
  })

  return resultMap
}

// 認証フロー用の最適化されたデータフェッチ
export async function fetchAuthData(params: {
  tenantId: string
  orgId: string
  customerUid?: string
}): Promise<{
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  organization: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  customer: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  session: any
}> {
  const tasks = [
    {
      name: 'organization',
      task: () => fetch(`/api/organization/${params.orgId}?tenantId=${params.tenantId}`).then(r => r.json()),
      priority: 2,
    },
    {
      name: 'session',
      task: () => fetch('/api/auth/session', { credentials: 'include' }).then(r => r.json()),
      priority: 3,
    },
  ]

  if (params.customerUid) {
    tasks.push({
      name: 'customer',
      task: () => fetch(`/api/customer/${params.customerUid}`).then(r => r.json()),
      priority: 1,
    })
  }

  const results = await batchAuthProcessing(tasks)

  return {
    organization: results.get('organization'),
    customer: results.get('customer'),
    session: results.get('session'),
  }
}