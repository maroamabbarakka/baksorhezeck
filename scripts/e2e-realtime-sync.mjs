import { chromium } from 'playwright-core'

const baseURL = process.env.E2E_URL || 'https://baksorhezeck.web.app'
const executablePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const browser = await chromium.launch({ executablePath, headless: true })
const contexts = []

async function openOwnerDevice(name) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true })
  contexts.push(context)
  const page = await context.newPage()
  const errors = []
  page.on('console', message => message.type() === 'error' && errors.push(`console: ${message.text()}`))
  page.on('pageerror', error => errors.push(`page: ${error.message}`))
  await page.goto(baseURL, { waitUntil: 'domcontentloaded' })
  await page.getByPlaceholder('Masukkan PIN').waitFor()
  await page.getByPlaceholder('Masukkan PIN').fill('1234')
  await page.getByRole('button', { name: 'Masuk' }).click()
  await page.locator('.menu-button').click()
  await page.getByRole('button', { name: /Menu & Harga/ }).click()
  await page.getByTestId('cloud-status').waitFor()
  await page.waitForFunction(() => document.querySelector('[data-testid="cloud-status"]')?.textContent?.includes('Cloud aktif'))
  return { name, page, errors }
}

async function setPrice(device, price) {
  const card = device.page.locator('.manage-grid article').filter({ hasText: 'Bakso Komplit' })
  await card.getByRole('button', { name: 'Edit' }).click()
  await device.page.getByLabel('Harga').fill(String(price))
  await device.page.getByRole('button', { name: 'Simpan menu' }).click()
}

function formattedPrice(price) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(price)
}

try {
  const deviceA = await openOwnerDevice('device-A')
  const deviceB = await openOwnerDevice('device-B')
  const productA = deviceA.page.locator('.manage-grid article').filter({ hasText: 'Bakso Komplit' })
  const currentText = await productA.locator('strong').textContent()
  const currentPrice = Number((currentText || '').replace(/\D/g, ''))
  if (!currentPrice) throw new Error(`Harga awal tidak terbaca: ${currentText}`)
  const testPrice = currentPrice + 1

  await setPrice(deviceA, testPrice)
  await deviceB.page.locator('.manage-grid article').filter({ hasText: 'Bakso Komplit' }).getByText(formattedPrice(testPrice), { exact: true }).waitFor({ timeout: 15000 })
  await setPrice(deviceA, currentPrice)
  await deviceB.page.locator('.manage-grid article').filter({ hasText: 'Bakso Komplit' }).getByText(formattedPrice(currentPrice), { exact: true }).waitFor({ timeout: 15000 })

  const allErrors = [...deviceA.errors, ...deviceB.errors]
  if (allErrors.length) throw new Error(allErrors.join('\n'))
  console.log(`realtime-sync: PASS (${formattedPrice(currentPrice)} → ${formattedPrice(testPrice)} → ${formattedPrice(currentPrice)})`)
} finally {
  await Promise.all(contexts.map(context => context.close()))
  await browser.close()
}
