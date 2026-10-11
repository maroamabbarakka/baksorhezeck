import { chromium } from 'playwright-core'

const baseURL = process.env.E2E_URL || 'https://baksorhezeck.web.app'
const executablePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const browser = await chromium.launch({ executablePath, headless: true })
const profiles = [
  { name: 'mobile-small', width: 320, height: 700 },
  { name: 'mobile', width: 390, height: 844 },
  { name: 'mobile-wide', width: 430, height: 932 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'tablet-landscape', width: 1024, height: 768 },
  { name: 'laptop', width: 1366, height: 768 },
  { name: 'desktop', width: 1920, height: 1080 },
]
const pages = ['Kasir', 'Transaksi', 'Menu & Harga', 'Laporan', 'Printer', 'Pengguna', 'Pengaturan']

try {
  for (const profile of profiles) {
    const context = await browser.newContext({ viewport: { width: profile.width, height: profile.height }, isMobile: profile.width <= 430 })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', error => errors.push(`page: ${error.message}`))
    page.on('console', message => message.type() === 'error' && errors.push(`console: ${message.text()}`))
    try {
      await page.goto(baseURL, { waitUntil: 'domcontentloaded' })
      await page.getByPlaceholder('Masukkan PIN').waitFor()
      await page.getByPlaceholder('Masukkan PIN').fill('1234')
      await page.getByRole('button', { name: 'Masuk' }).click()
      await page.locator('[data-testid="cloud-status"]').waitFor()

      for (const target of pages) {
        if (profile.width <= 820) await page.locator('.menu-button').click()
        await page.locator('.sidebar nav button').filter({ hasText: target }).click()
        await page.locator('.topbar h1').filter({ hasText: target }).waitFor()
        const geometry = await page.evaluate(() => ({
          viewport: innerWidth,
          bodyWidth: document.body.scrollWidth,
          rootWidth: document.documentElement.scrollWidth,
          topbarRight: Math.round(document.querySelector('.topbar')?.getBoundingClientRect().right || 0),
        }))
        if (geometry.bodyWidth > geometry.viewport + 1 || geometry.rootWidth > geometry.viewport + 1 || geometry.topbarRight > geometry.viewport + 1) {
          throw new Error(`${target}: overflow horizontal ${JSON.stringify(geometry)}`)
        }
      }

      if (profile.width <= 820) {
        await page.locator('.mobile-nav').waitFor()
        const nav = await page.locator('.mobile-nav').evaluate(element => {
          const rect = element.getBoundingClientRect()
          return { left: Math.round(rect.left), right: Math.round(rect.right), bottom: Math.round(rect.bottom), viewportWidth: innerWidth, viewportHeight: innerHeight }
        })
        if (nav.left !== 0 || nav.right !== nav.viewportWidth || nav.bottom !== nav.viewportHeight) throw new Error(`Navigasi bawah tidak menempel viewport: ${JSON.stringify(nav)}`)
      }

      if (errors.length) throw new Error(errors.join('\n'))
      console.log(`${profile.name} ${profile.width}x${profile.height}: PASS (${pages.length} halaman)`)
    } finally {
      await context.close()
    }
  }
} finally {
  await browser.close()
}
