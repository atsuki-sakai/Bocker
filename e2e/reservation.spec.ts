import { test, expect } from '@playwright/test'

// You might need to adjust this orgId to a valid one from your test environment
const orgId = process.env.TEST_ORG_ID || 'clwxl01vi000013ade4q57t1r'

test.describe('予約フロー', () => {
  test.beforeEach(async ({ page }) => {
    // A-1. クーポン選択から開始
    await page.goto(`/reservation/${orgId}/calendar`)
    // Wait for the main content to be visible to ensure the page is loaded
    await expect(page.locator('main, body')).toBeVisible()
  })

  test('ページが正しく読み込まれ、最初のステップがクーポン選択である', async ({
    page,
  }) => {
    // A-2. 初期表示がクーポン一覧であること
    await expect(page.getByRole('heading', { name: 'クーポンを選択' })).toBeVisible()
    await expect(page.getByRole('button', { name: '次へ進む' })).toBeVisible()
  })

  test('クーポンを選択せずにメニュー選択へ進める', async ({ page }) => {
    // A-3. クーポンを選択せず「次へ」
    await page.getByRole('button', { name: '次へ進む' }).click()

    // B-1. メニュー選択画面に遷移
    await expect(page.getByRole('heading', { name: 'メニューを選択' })).toBeVisible()
  })

  test('クーポン選択からメニュー選択、スタッフ選択へと遷移できる', async ({
    page,
  }) => {
    // A-3. クーポンを選択せず「次へ」
    await page.getByRole('button', { name: '次へ進む' }).click()

    // B-1. メニュー選択画面に遷移
    await expect(page.getByRole('heading', { name: 'メニューを選択' })).toBeVisible()

    // B-2. いずれかのメニューを選択
    // This assumes a card-based layout for menus. Adjust selector if needed.
    await page.locator('div.group.cursor-pointer').first().click()
    await expect(page.getByRole('button', { name: '次へ進む' })).not.toBeDisabled()

    // B-3. 「次へ」をクリック
    await page.getByRole('button', { name: '次へ進む' }).click()

    // C-1. スタッフ選択画面に遷移
    await expect(page.getByRole('heading', { name: 'スタッフを選択' })).toBeVisible()
  })

  test('予約フローを最後まで完了できる', async ({ page }) => {
    // A-3. クーポンを選択せず「次へ」
    await page.getByRole('button', { name: '次へ進む' }).click()

    // B-2. メニューを選択
    await page.locator('div.group.cursor-pointer').first().click()
    await page.getByRole('button', { name: '次へ進む' }).click()

    // C-2. スタッフを選択 (指名フリー)
    await page.getByRole('button', { name: '指名フリー' }).click()
    await page.getByRole('button', { name: '次へ進む' }).click()

    // D-1. オプション画面で「次へ」
    await expect(page.getByRole('heading', { name: 'オプションを選択' })).toBeVisible()
    await page.getByRole('button', { name: '次へ進む' }).click()

    // E-1. 日時選択画面で日付と時間を選択
    await expect(page.getByRole('heading', { name: '日時を選択' })).toBeVisible()
    // Select today's date
    const today = new Date()
    const day = today.getDate()
    await page.getByRole('gridcell', { name: String(day), exact: true }).click()

    // Select the first available time slot
    await page.locator('button[data-testid^="time-slot-"]').first().click()
    await page.getByRole('button', { name: '次へ進む' }).click()

    // F-1. 決済方法選択画面で「現金」を選択
    await expect(page.getByRole('heading', { name: 'お支払い' })).toBeVisible()
    await page.getByText('現金').click()
    await page.getByRole('button', { name: '次へ進む' }).click()

    // G-1. 確認画面へ遷移
    await expect(page.getByRole('heading', { name: '予約内容の確認' })).toBeVisible()

    // G-2. 電話番号を入力
    await page.getByPlaceholder(/電話番号/).fill('09012345678')

    // G-3. 予約を確定
    await page.getByRole('button', { name: '予約を確定する' }).click()

    // H-1. 完了画面へ遷移
    await expect(page.getByRole('heading', { name: '予約が完了しました' })).toBeVisible({
      timeout: 15000,
    })
  })

  test('メニュー選択後にクーポン割引が再計算される', async ({ page }) => {
    // A-3. 利用可能なクーポンを一つ選択
    // This assumes there is at least one coupon available
    const couponCard = page.locator('div.space-y-4 > .cursor-pointer').first()
    await expect(couponCard).toBeVisible()
    await couponCard.click()
    // 確認：選択したクーポンが「選択中のクーポン」として表示される
    await expect(page.getByText('選択中のクーポン')).toBeVisible()
    await page.getByRole('button', { name: '次へ進む' }).click()

    // B-2. メニューを選択
    await page.locator('div.group.cursor-pointer').first().click()

    // B-3. 割引が適用されていることを確認
    // The total amount is displayed in the bottom bar.
    const bottomBar = page.locator('div.fixed.bottom-0')
    // We check if the text contains "円", assuming discount makes it non-zero.
    // A more robust check would be to calculate the expected total and compare.
    await expect(bottomBar).toContainText('円')

    // G-1. 確認画面まで進む
    await page.getByRole('button', { name: '次へ進む' }).click() // to staff
    await page.getByRole('button', { name: '指名フリー' }).click()
    await page.getByRole('button', { name: '次へ進む' }).click() // to option
    await page.getByRole('button', { name: '次へ進む' }).click() // to date
    const today = new Date()
    const day = today.getDate()
    await page.getByRole('gridcell', { name: String(day), exact: true }).click()
    await page.locator('button[data-testid^="time-slot-"]').first().click()
    await page.getByRole('button', { name: '次へ進む' }).click() // to payment
    await page.getByText('現金').click()
    await page.getByRole('button', { name: '次へ進む' }).click() // to confirm

    // G-2. 確認画面で割引が適用されていることを確認
    const discountRow = page.locator('dl > div', { hasText: 'クーポン割引' })
    await expect(discountRow).toBeVisible()
    await expect(discountRow).not.toContainText('¥0')
  })

  test('クーポン選択後に利用不可メニューが非活性化される', async ({ page }) => {
    // This test assumes a specific coupon exists that excludes certain menus.
    // You may need to seed your test database with appropriate data.
    // For this example, we assume a coupon exists that makes some menus disabled.

    // A-3. Find and select a coupon.
    // We'll just click the first one for this test.
    const couponCard = page.locator('div.space-y-4 > .cursor-pointer').first()
    await expect(couponCard).toBeVisible()
    await couponCard.click()
    await page.getByRole('button', { name: '次へ進む' }).click()

    // B-1. On the menu page, verify that at least one menu is disabled.
    const disabledMenu = page.locator('.cursor-not-allowed').first()
    await expect(disabledMenu).toBeVisible()

    // B-2. Verify that the tooltip with the reason is shown on hover.
    await disabledMenu.hover()
    await expect(page.getByRole('tooltip', { name: '選択中のクーポンでは利用できません' })).toBeVisible()

    // B-3. Verify that a non-disabled menu can still be selected.
    const enabledMenu = page.locator('.cursor-pointer').first()
    await expect(enabledMenu).toBeVisible()
    await enabledMenu.click()
    await expect(page.getByText('選択中のメニュー')).toBeVisible()
  })
})
