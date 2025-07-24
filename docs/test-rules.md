# Bocker プロジェクト テストルール

## 📋 概要

**目的**: 高品質で保守性の高いテストコードの統一基準を定める  
**対象**: 全開発メンバー（フロントエンド・バックエンド・QA）  
**適用範囲**: ユニットテスト・統合テスト・E2Eテスト  
**更新日**: 2025年1月24日

---

## 🎯 テスト品質基準

### 必須品質指標
```
✅ テストカバレッジ: 80%以上
✅ ユニットテスト成功率: 95%以上  
✅ E2Eテスト成功率: 90%以上
✅ テスト実行時間: 5分以内（全体）
✅ 新機能テスト: 実装と同時提出必須
```

### 品質ゲート
```typescript
// 以下の条件をすべて満たす必要がある
const qualityGate = {
  unitTests: 'PASS',           // 全ユニットテスト成功
  e2eTests: 'PASS',            // 全E2Eテスト成功  
  coverage: '>= 80%',          // カバレッジ80%以上
  linting: 'PASS',             // ESLint・Prettier通過
  typeCheck: 'PASS',           // TypeScript型チェック通過
  buildSuccess: 'PASS'         // ビルド成功
}
```

---

## 🧪 ユニットテストルール

### 1. ファイル命名規則
```
✅ 正しい命名
components/Button.tsx → components/Button.test.tsx
utils/formatDate.ts → utils/formatDate.test.ts
hooks/useAuth.ts → hooks/useAuth.test.ts

❌ 間違った命名
components/Button.tsx → tests/ButtonTest.tsx
utils/formatDate.ts → __tests__/format-date.spec.ts
```

### 2. テスト構造規則
```typescript
// ✅ 推奨構造
describe('ComponentName', () => {
  // セットアップ
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // 基本機能テスト
  describe('基本機能', () => {
    it('正常にレンダリングされる', () => {
      // テスト実装
    })
  })

  // プロパティテスト
  describe('プロパティ', () => {
    it('propsが正しく適用される', () => {
      // テスト実装
    })
  })

  // イベントテスト
  describe('イベント処理', () => {
    it('クリックイベントが正しく動作する', () => {
      // テスト実装
    })
  })

  // エラーケース
  describe('エラーハンドリング', () => {
    it('無効なpropsでエラーが表示される', () => {
      // テスト実装
    })
  })
})
```

### 3. テストケース必須項目
```typescript
// 各コンポーネントで必須のテストケース
const requiredTestCases = [
  '基本レンダリング',           // 正常に表示される
  'プロパティ適用',             // propsが正しく反映される
  'イベント処理',               // ユーザー操作が動作する
  'エラーハンドリング',         // エラー状態が適切に処理される
  'アクセシビリティ',           // a11y要件を満たす
  'レスポンシブ対応'            // 画面サイズに対応する
]
```

### 4. モック使用ルール
```typescript
// ✅ 推奨モック
// 1. 外部依存関係のモック
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    pathname: '/ja'
  })
}))

// 2. API呼び出しのモック
vi.mock('@/lib/api', () => ({
  fetchUserData: vi.fn().mockResolvedValue(mockUserData)
}))

// 3. 日付・時間のモック
vi.mock('date-fns', () => ({
  format: vi.fn(() => '2025-01-24')
}))

// ❌ 避けるべきモック
// 1. テスト対象コンポーネント自体のモック
// 2. 基本的なReact機能のモック
// 3. 過度に複雑なモック
```

---

## 🔗 統合テストルール

### 1. 統合テスト対象
```typescript
// 統合テストが必要な場面
const integrationTestTargets = [
  'コンポーネント間の連携',     // Header + Navigation
  'フォーム送信フロー',         // Form + Validation + API
  'ページ遷移',                 // Router + Components
  'データフロー',               // Store + Components
  '認証フロー',                 // Auth + Protected Routes
  '多言語切り替え'              // i18n + Components
]
```

### 2. 統合テスト実装例
```typescript
// ✅ 推奨統合テスト
describe('ログインフォーム統合', () => {
  it('正常なログインフローが動作する', async () => {
    // 1. フォーム表示
    render(<LoginForm />)
    
    // 2. 入力
    await user.type(screen.getByLabelText('メールアドレス'), 'test@example.com')
    await user.type(screen.getByLabelText('パスワード'), 'password123')
    
    // 3. 送信
    await user.click(screen.getByRole('button', { name: 'ログイン' }))
    
    // 4. 結果確認
    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith('/dashboard')
    })
  })
})
```

---

## 🎭 E2Eテストルール

### 1. E2Eテスト対象選定
```typescript
// E2Eテストが必要な機能（優先度順）
const e2eTestPriorities = {
  critical: [
    'ユーザー登録・ログイン',
    '予約作成・変更・キャンセル',
    '決済処理',
    'ダッシュボード表示'
  ],
  important: [
    'プロフィール編集',
    '通知機能',
    '検索・フィルタ',
    'レポート生成'
  ],
  nice_to_have: [
    'ヘルプページ',
    '設定変更',
    'エクスポート機能'
  ]
}
```

### 2. E2Eテスト実装ルール
```typescript
// ✅ 推奨E2Eテスト構造
test.describe('予約管理フロー', () => {
  test.beforeEach(async ({ page }) => {
    // 共通セットアップ
    await page.goto('/ja/login')
    await loginAsUser(page, 'salon-owner@example.com')
  })

  test('新規予約を作成できる', async ({ page }) => {
    // 1. ページ遷移
    await page.click('[data-testid="new-booking-button"]')
    await expect(page).toHaveURL(/\/bookings\/new/)
    
    // 2. フォーム入力
    await page.fill('[name="customer-name"]', '田中太郎')
    await page.selectOption('[name="service"]', 'haircut')
    await page.fill('[name="date"]', '2025-02-01')
    
    // 3. 送信・確認
    await page.click('[data-testid="submit-booking"]')
    await expect(page.locator('.success-message')).toBeVisible()
    
    // 4. データ確認
    await page.goto('/ja/bookings')
    await expect(page.locator('text=田中太郎')).toBeVisible()
  })
})
```

### 3. 待機処理ルール
```typescript
// ✅ 推奨待機処理
// 1. 要素の表示待ち
await expect(page.locator('[data-testid="loading"]')).toBeHidden()
await expect(page.locator('[data-testid="content"]')).toBeVisible()

// 2. ネットワーク完了待ち
await page.waitForLoadState('networkidle')

// 3. 特定のレスポンス待ち
await page.waitForResponse(response => 
  response.url().includes('/api/bookings') && response.status() === 200
)

// ❌ 避けるべき待機処理
await page.waitForTimeout(3000) // 固定時間待機は禁止
```

---

## 📊 テストデータ管理ルール

### 1. テストデータ構造
```typescript
// test/fixtures/index.ts
export const testData = {
  users: {
    salonOwner: {
      id: 'user-1',
      email: 'owner@salon.com',
      role: 'owner',
      salon: 'test-salon-1'
    },
    customer: {
      id: 'user-2', 
      email: 'customer@example.com',
      role: 'customer'
    }
  },
  
  bookings: {
    upcoming: {
      id: 'booking-1',
      customerId: 'user-2',
      salonId: 'salon-1',
      date: '2025-02-01T10:00:00Z',
      service: 'haircut',
      status: 'confirmed'
    }
  },
  
  salons: {
    testSalon: {
      id: 'salon-1',
      name: 'テストサロン',
      ownerId: 'user-1',
      services: ['haircut', 'coloring']
    }
  }
}
```

### 2. データクリーンアップルール
```typescript
// ✅ 推奨クリーンアップ
describe('予約管理', () => {
  beforeEach(async () => {
    // テスト前にデータリセット
    await resetTestDatabase()
    await seedTestData(testData.users.salonOwner)
  })
  
  afterEach(async () => {
    // テスト後にクリーンアップ
    await cleanupTestData()
  })
})

// E2Eテストでのクリーンアップ
test.beforeEach(async ({ page }) => {
  // ブラウザストレージクリア
  await page.context().clearCookies()
  await page.evaluate(() => localStorage.clear())
})
```

---

## 🚨 エラーハンドリングテストルール

### 1. 必須エラーケース
```typescript
const requiredErrorTests = [
  'ネットワークエラー',         // API呼び出し失敗
  'バリデーションエラー',       // 入力値不正
  '認証エラー',                 // 未認証・権限不足
  'サーバーエラー',             // 500エラー
  'タイムアウトエラー',         // 処理時間超過
  'データ不整合エラー'          // 予期しないデータ状態
]
```

### 2. エラーテスト実装例
```typescript
// ✅ 推奨エラーテスト
describe('エラーハンドリング', () => {
  it('API呼び出し失敗時にエラーメッセージが表示される', async () => {
    // APIモックでエラーレスポンス設定
    vi.mocked(fetchBookings).mockRejectedValue(
      new Error('Network Error')
    )
    
    render(<BookingList />)
    
    // エラーメッセージ確認
    await waitFor(() => {
      expect(screen.getByText('データの取得に失敗しました')).toBeInTheDocument()
    })
    
    // リトライボタン確認
    expect(screen.getByRole('button', { name: '再試行' })).toBeInTheDocument()
  })
  
  it('フォームバリデーションエラーが正しく表示される', async () => {
    render(<BookingForm />)
    
    // 無効な入力
    await user.type(screen.getByLabelText('メールアドレス'), 'invalid-email')
    await user.click(screen.getByRole('button', { name: '送信' }))
    
    // バリデーションエラー確認
    expect(screen.getByText('正しいメールアドレスを入力してください')).toBeInTheDocument()
  })
})
```

---

## 🌐 多言語テストルール

### 1. 多言語テスト必須項目
```typescript
const i18nTestRequirements = [
  'テキスト翻訳確認',           // 全テキストが翻訳されている
  'レイアウト崩れ確認',         // 長いテキストでもレイアウト保持
  '日付・数値フォーマット',     // ロケール固有フォーマット
  'RTL言語対応',               // 右から左の言語（将来対応）
  '言語切り替え動作',           // 言語変更が正しく動作
  'URL構造確認'                // /ja/, /en/ パス構造
]
```

### 2. 多言語テスト実装
```typescript
// ✅ 推奨多言語テスト
describe.each(['ja', 'en'])('多言語対応 (%s)', (locale) => {
  beforeEach(() => {
    vi.mocked(useLocale).mockReturnValue(locale)
  })
  
  it(`${locale}ロケールで正しく表示される`, () => {
    render(<HeroSection />)
    
    const expectedText = locale === 'ja' 
      ? '美容サロン向け予約管理システム'
      : 'Booking Management System for Beauty Salons'
      
    expect(screen.getByText(expectedText)).toBeInTheDocument()
  })
  
  it(`${locale}ロケールで日付が正しくフォーマットされる`, () => {
    const testDate = new Date('2025-01-24')
    render(<DateDisplay date={testDate} />)
    
    const expectedFormat = locale === 'ja' 
      ? '2025年1月24日'
      : 'January 24, 2025'
      
    expect(screen.getByText(expectedFormat)).toBeInTheDocument()
  })
})
```

---

## 📱 レスポンシブテストルール

### 1. テスト対象画面サイズ
```typescript
const breakpoints = {
  mobile: { width: 375, height: 667 },      // iPhone SE
  tablet: { width: 768, height: 1024 },     // iPad
  desktop: { width: 1920, height: 1080 },   // Desktop
  wide: { width: 2560, height: 1440 }       // Wide Desktop
}
```

### 2. レスポンシブテスト実装
```typescript
// ✅ 推奨レスポンシブテスト
describe.each(Object.entries(breakpoints))('レスポンシブ対応 (%s)', (device, viewport) => {
  beforeEach(() => {
    // ビューポート設定
    Object.defineProperty(window, 'innerWidth', { value: viewport.width })
    Object.defineProperty(window, 'innerHeight', { value: viewport.height })
    window.dispatchEvent(new Event('resize'))
  })
  
  it(`${device}で正しくレイアウトされる`, () => {
    render(<ResponsiveComponent />)
    
    if (device === 'mobile') {
      expect(screen.getByTestId('mobile-menu')).toBeInTheDocument()
      expect(screen.queryByTestId('desktop-menu')).not.toBeInTheDocument()
    } else {
      expect(screen.getByTestId('desktop-menu')).toBeInTheDocument()
      expect(screen.queryByTestId('mobile-menu')).not.toBeInTheDocument()
    }
  })
})
```

---

## 🔒 セキュリティテストルール

### 1. セキュリティテスト必須項目
```typescript
const securityTestRequirements = [
  'XSS攻撃対策',               // スクリプト注入防止
  'CSRF攻撃対策',              // クロスサイトリクエスト偽造防止
  '認証・認可確認',             // 適切なアクセス制御
  '機密データ保護',             // パスワード・トークン保護
  '入力値サニタイズ',           // 危険な入力値の無害化
  'セッション管理'              // セッション適切な管理
]
```

### 2. セキュリティテスト実装例
```typescript
// ✅ 推奨セキュリティテスト
describe('セキュリティ', () => {
  it('XSS攻撃を防ぐ', () => {
    const maliciousInput = '<script>alert("XSS")</script>'
    
    render(<UserProfile name={maliciousInput} />)
    
    // スクリプトタグがエスケープされている
    expect(screen.queryByText(maliciousInput)).not.toBeInTheDocument()
    expect(screen.getByText('&lt;script&gt;alert("XSS")&lt;/script&gt;')).toBeInTheDocument()
  })
  
  it('未認証ユーザーは保護されたページにアクセスできない', async () => {
    // 未認証状態をモック
    vi.mocked(useAuth).mockReturnValue({ user: null, isLoading: false })
    
    render(<ProtectedPage />)
    
    // ログインページにリダイレクト
    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith('/login')
    })
  })
})
```

---

## 🚀 パフォーマンステストルール

### 1. パフォーマンス指標
```typescript
const performanceTargets = {
  pageLoad: '< 3秒',           // ページ読み込み時間
  firstPaint: '< 1.5秒',       // 初回描画時間
  interactive: '< 4秒',        // インタラクティブまでの時間
  bundleSize: '< 500KB',       // バンドルサイズ
  memoryUsage: '< 50MB',       // メモリ使用量
  renderTime: '< 100ms'        // コンポーネント描画時間
}
```

### 2. パフォーマンステスト実装
```typescript
// ✅ 推奨パフォーマンステスト
describe('パフォーマンス', () => {
  it('大量データでも高速レンダリングする', () => {
    const largeDataSet = Array.from({ length: 1000 }, (_, i) => ({
      id: i,
      name: `Item ${i}`,
      description: `Description for item ${i}`
    }))
    
    const startTime = performance.now()
    render(<DataTable data={largeDataSet} />)
    const endTime = performance.now()
    
    // 100ms以内でレンダリング完了
    expect(endTime - startTime).toBeLessThan(100)
  })
  
  it('メモリリークが発生しない', () => {
    const initialMemory = performance.memory?.usedJSHeapSize || 0
    
    // コンポーネントを複数回マウント・アンマウント
    for (let i = 0; i < 100; i++) {
      const { unmount } = render(<HeavyComponent />)
      unmount()
    }
    
    // ガベージコレクション実行
    if (global.gc) global.gc()
    
    const finalMemory = performance.memory?.usedJSHeapSize || 0
    const memoryIncrease = finalMemory - initialMemory
    
    // メモリ増加が10MB以下
    expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024)
  })
})
```

---

## 🎨 アクセシビリティテストルール

### 1. a11y必須チェック項目
```typescript
const a11yRequirements = [
  'キーボードナビゲーション',   // Tab, Enter, Escapeキー対応
  'スクリーンリーダー対応',     // aria-label, role属性
  'カラーコントラスト',         // WCAG AA基準準拠
  'フォーカス管理',             // 適切なフォーカス順序
  'エラーメッセージ',           // 支援技術で読み上げ可能
  'セマンティックHTML'          // 適切なHTML要素使用
]
```

### 2. アクセシビリティテスト実装
```typescript
// ✅ 推奨a11yテスト
import { axe, toHaveNoViolations } from 'jest-axe'

expect.extend(toHaveNoViolations)

describe('アクセシビリティ', () => {
  it('WCAG基準に準拠している', async () => {
    const { container } = render(<AccessibleComponent />)
    const results = await axe(container)
    
    expect(results).toHaveNoViolations()
  })
  
  it('キーボードナビゲーションが動作する', async () => {
    render(<NavigationMenu />)
    
    const firstItem = screen.getByRole('menuitem', { name: 'ホーム' })
    firstItem.focus()
    
    // Tabキーで次の項目に移動
    await user.keyboard('{Tab}')
    expect(screen.getByRole('menuitem', { name: 'サービス' })).toHaveFocus()
    
    // Enterキーで選択
    await user.keyboard('{Enter}')
    expect(mockRouter.push).toHaveBeenCalledWith('/services')
  })
  
  it('スクリーンリーダー用のラベルが適切', () => {
    render(<BookingForm />)
    
    // aria-labelが設定されている
    expect(screen.getByLabelText('予約日時を選択')).toBeInTheDocument()
    
    // エラーメッセージがaria-describedbyで関連付けられている
    const emailInput = screen.getByLabelText('メールアドレス')
    expect(emailInput).toHaveAttribute('aria-describedby', 'email-error')
  })
})
```

---

## 📝 テストドキュメントルール

### 1. テストケース記述ルール
```typescript
// ✅ 推奨テストケース記述
describe('BookingForm', () => {
  // 日本語で分かりやすく記述
  it('必須項目が未入力の場合、エラーメッセージが表示される', () => {
    // Given: フォームが表示されている
    render(<BookingForm />)
    
    // When: 必須項目を空のまま送信ボタンをクリック
    fireEvent.click(screen.getByRole('button', { name: '予約する' }))
    
    // Then: エラーメッセージが表示される
    expect(screen.getByText('お客様名は必須です')).toBeInTheDocument()
    expect(screen.getByText('サービスを選択してください')).toBeInTheDocument()
  })
})

// ❌ 避けるべき記述
it('should show error when empty', () => {
  // 何をテストしているか不明
})
```

### 2. コメント記述ルール
```typescript
// ✅ 推奨コメント
describe('予約フォーム', () => {
  beforeEach(() => {
    // 各テスト前にモックをリセット
    // 前のテストの影響を排除するため
    vi.clearAllMocks()
    
    // 認証済みユーザーとしてテスト実行
    vi.mocked(useAuth).mockReturnValue({
      user: testData.users.salonOwner,
      isLoading: false
    })
  })
  
  it('正常な予約作成フローが動作する', async () => {
    // 1. フォーム表示確認
    render(<BookingForm />)
    
    // 2. 顧客情報入力
    // 実際のユーザー操作をシミュレート
    await user.type(screen.getByLabelText('お客様名'), '田中太郎')
    
    // 3. サービス選択
    // セレクトボックスの操作
    await user.selectOptions(screen.getByLabelText('サービス'), 'haircut')
    
    // 4. 送信・結果確認
    await user.click(screen.getByRole('button', { name: '予約する' }))
    
    // APIが正しいパラメータで呼ばれることを確認
    expect(mockCreateBooking).toHaveBeenCalledWith({
      customerName: '田中太郎',
      service: 'haircut',
      // ... 他のパラメータ
    })
  })
})
```

---

## 🔄 CI/CDテストルール

### 1. GitHub Actions設定
```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
          
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
        
      - name: Run unit tests
        run: pnpm test:unit --coverage
        
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info
          
  e2e-tests:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
          
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
        
      - name: Install Playwright
        run: pnpm exec playwright install --with-deps
        
      - name: Run E2E tests
        run: pnpm test:e2e
        
      - name: Upload test results
        uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

### 2. プルリクエストルール
```markdown
## PR作成時の必須チェック

### テスト関連
- [ ] 新機能にユニットテストを追加
- [ ] 重要な機能にE2Eテストを追加
- [ ] 全テストが成功している
- [ ] カバレッジが80%以上を維持
- [ ] テスト実行時間が5分以内

### コード品質
- [ ] ESLint・Prettierが通過
- [ ] TypeScript型チェックが通過
- [ ] ビルドが成功している
- [ ] パフォーマンス劣化がない

### ドキュメント
- [ ] テストケースが適切に記述されている
- [ ] 複雑なロジックにコメントを追加
- [ ] README更新（必要に応じて）
```

---

## 🛠️ デバッグ・トラブルシューティング

### 1. よくある問題と解決法

#### テストが不安定（フレーキー）
```typescript
// ❌ 問題のあるテスト
it('データが読み込まれる', async () => {
  render(<DataComponent />)
  
  // 固定時間待機は不安定
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  expect(screen.getByText('データ')).toBeInTheDocument()
})

// ✅ 修正版
it('データが読み込まれる', async () => {
  render(<DataComponent />)
  
  // 要素の出現を待機
  await waitFor(() => {
    expect(screen.getByText('データ')).toBeInTheDocument()
  }, { timeout: 5000 })
})
```

#### モックが効かない
```typescript
// ❌ 問題のあるモック
describe('Component', () => {
  it('test', () => {
    // テスト内でモック設定（遅すぎる）
    vi.mock('./module', () => ({ default: vi.fn() }))
    
    render(<Component />)
  })
})

// ✅ 修正版
// ファイル上部でモック設定
vi.mock('./module', () => ({ default: vi.fn() }))

describe('Component', () => {
  beforeEach(() => {
    // テスト前にモックリセット
    vi.clearAllMocks()
  })
  
  it('test', () => {
    render(<Component />)
  })
})
```

#### E2Eテストタイムアウト
```typescript
// ❌ 問題のあるE2Eテスト
test('slow operation', async ({ page }) => {
  await page.goto('/')
  await page.click('button') // 要素が見つからずタイムアウト
})

// ✅ 修正版
test('slow operation', async ({ page }) => {
  await page.goto('/')
  
  // 要素の表示を待ってからクリック
  await page.waitForSelector('button', { state: 'visible' })
  await page.click('button')
  
  // 処理完了を待機
  await page.waitForLoadState('networkidle')
})
```

### 2. デバッグツール活用
```typescript
// テストデバッグ用ヘルパー
export const debugTest = {
  // DOM状態を出力
  logDOM: () => {
    console.log(screen.debug())
  },
  
  // 特定要素を出力
  logElement: (element: HTMLElement) => {
    console.log(screen.debug(element))
  },
  
  // 現在のクエリ結果を出力
  logQueries: () => {
    console.log(screen.logTestingPlaygroundURL())
  }
}

// 使用例
it('debug test', () => {
  render(<Component />)
  
  // デバッグ情報出力
  debugTest.logDOM()
  
  // テスト続行
})
```

---

## 📈 継続的改善

### 1. テスト品質メトリクス
```typescript
// 週次レポートで確認する指標
const qualityMetrics = {
  coverage: {
    current: '85%',
    target: '80%',
    trend: '+2%'
  },
  testCount: {
    unit: 156,
    integration: 23,
    e2e: 18
  },
  executionTime: {
    unit: '45秒',
    e2e: '3分30秒',
    total: '4分15秒'
  },
  flakiness: {
    rate: '2%',
    target: '<5%'
  }
}
```

### 2. 改善アクション
```markdown
## 月次テスト改善会議

### 議題
1. テストカバレッジ分析
2. フレーキーテスト対策
3. 実行時間最適化
4. 新しいテスト手法導入

### 改善提案例
- [ ] 重複テストの統合
- [ ] 並列実行の最適化
- [ ] モック戦略の見直し
- [ ] テストデータ管理改善
- [ ] 新しいツール導入検討
```

---

## 📚 参考資料・学習リソース

### 内部ドキュメント
- [テスト環境完全ガイド](./vitest-playwright-test.md)
- [テスト実装報告書](./test-implementation-report.md)
- [ホームページテスト状況](./test/tasks/home.md)

### 外部リソース
- [Testing Library公式ドキュメント](https://testing-library.com/)
- [Vitest公式ガイド](https://vitest.dev/guide/)
- [Playwright公式ドキュメント](https://playwright.dev/)
- [React Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

### 推奨書籍
- 『テスト駆動開発』Kent Beck
- 『単体テストの考え方/使い方』Vladimir Khorikov
- 『Effective Software Testing』Mauricio Aniche

---

## 🔧 ツール・設定

### 必須VS Code拡張機能
```json
{
  "recommendations": [
    "ms-vscode.vscode-typescript-next",
    "bradlc.vscode-tailwindcss",
    "ms-playwright.playwright",
    "vitest.explorer",
    "streetsidesoftware.code-spell-checker"
  ]
}
```

### 推奨設定
```json
// .vscode/settings.json
{
  "typescript.preferences.includePackageJsonAutoImports": "on",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true,
    "source.organizeImports": true
  },
  "files.associations": {
    "*.test.{ts,tsx}": "typescript"
  }
}
```

---

**最終更新**: 2025年1月24日  
**管理者**: 開発チーム  
**次回見直し**: 2025年4月24日

---

## 📞 サポート・質問

### 技術的な質問
- **Slack**: #testing-support
- **メール**: dev-team@bocker.com

### 緊急時対応
- **オンコール**: 24/7対応
- **エスカレーション**: CTO直通

### 改善提案
- **GitHub Issues**: テストルール改善提案
- **月次会議**: 第3金曜日 14:00-15:00