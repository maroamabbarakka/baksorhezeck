import { chromium } from 'playwright-core'

const baseURL = process.env.E2E_URL || 'https://baksorhezeck.web.app'
const executablePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const browser = await chromium.launch({ executablePath, headless: true })

try {
  for (const viewport of [{ width: 390, height: 844 }, { width: 1366, height: 768 }]) {
    const context = await browser.newContext({ viewport, isMobile: viewport.width < 500 })
    const page = await context.newPage()
    try {
      await page.goto(baseURL, { waitUntil: 'domcontentloaded' })
      await page.getByLabel('Akun').selectOption('cashier')
      await page.getByPlaceholder('Masukkan PIN').fill('1234')
      await page.getByRole('button', { name: 'Masuk' }).click()
      if (viewport.width < 500) {
        await page.locator('.mobile-nav').getByRole('button', { name: /Printer/ }).click()
      } else {
        await page.locator('.sidebar nav').getByRole('button', { name: /Printer/ }).click()
      }
      await page.getByRole('heading', { name: 'Pengaturan Printer' }).waitFor()
      await page.getByRole('button', { name: /Hubungkan Bluetooth/ }).waitFor()
      await page.getByRole('button', { name: /Cetak melalui browser/ }).waitFor()
      console.log(`cashier-printer ${viewport.width}x${viewport.height}: PASS`)
    } finally {
      await context.close()
    }
  }
} finally {
  await browser.close()
}
