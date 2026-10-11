import { chromium } from 'playwright-core'

const baseURL = process.env.E2E_URL || 'http://127.0.0.1:4173'
const executablePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const browser = await chromium.launch({ executablePath, headless: true })

for (const profile of [
  { name: 'mobile', viewport: { width: 390, height: 844 }, isMobile: true },
  { name: 'desktop', viewport: { width: 1440, height: 900 }, isMobile: false },
]) {
  const context = await browser.newContext({ viewport: profile.viewport, isMobile: profile.isMobile })
  const page = await context.newPage()
  const errors = []
  page.on('console', message => message.type() === 'error' && errors.push(`console: ${message.text()}`))
  page.on('pageerror', error => errors.push(`page: ${error.message}`))
  await page.goto(baseURL, { waitUntil: 'networkidle' })
  await page.getByPlaceholder('Masukkan PIN').fill('1234')
  await page.getByRole('button', { name: 'Masuk' }).click()
  await page.getByRole('button', { name: /Bakso Komplit/ }).click()
  await page.getByRole('button', { name: /Bakso Komplit/ }).click()
  await page.getByRole('button', { name: /Es Teh/ }).click()
  const countText = profile.isMobile
    ? await page.locator('.mobile-cart-trigger i').textContent()
    : await page.locator('.panel-heading p').textContent()
  if (!countText?.includes('3')) throw new Error(`${profile.name}: jumlah keranjang bukan 3 (${countText})`)
  if (profile.isMobile) {
    const floating = await page.locator('.mobile-cart-trigger').evaluate(element => {
      const style = getComputedStyle(element)
      const rect = element.getBoundingClientRect()
      return { position: style.position, visible: rect.top >= 0 && rect.bottom <= innerHeight, bottom: Math.round(innerHeight - rect.bottom) }
    })
    if (floating.position !== 'fixed' || !floating.visible || floating.bottom < 50) throw new Error(`${profile.name}: floating checkout tidak berada di atas navigasi (${JSON.stringify(floating)})`)
    await page.getByRole('button', { name: /Lihat Pesanan/ }).click()
  }
  const total = await page.locator('.grand-total b').textContent()
  if (!total?.includes('35.000')) throw new Error(`${profile.name}: total salah (${total})`)
  await page.getByRole('button', { name: /^Bayar/ }).click()
  await page.getByRole('button', { name: 'Selesaikan transaksi' }).click()
  await page.getByText('Transaksi berhasil').waitFor()
  const orderNumber = await page.locator('.success-state h3').textContent()
  if (errors.length) throw new Error(`${profile.name}: ${errors.join('\n')}`)
  console.log(`${profile.name}: PASS ${orderNumber}`)
  await context.close()
}

await browser.close()
