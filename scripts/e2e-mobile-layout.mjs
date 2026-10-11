import { chromium } from 'playwright-core'

const baseURL = process.env.E2E_URL || 'https://baksorhezeck.web.app'
const executablePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const browser = await chromium.launch({ executablePath, headless: true })

try {
  for (const viewport of [
    { width: 320, height: 700 },
    { width: 360, height: 800 },
    { width: 390, height: 844 },
    { width: 430, height: 932 },
  ]) {
    const context = await browser.newContext({ viewport, isMobile: true })
    const page = await context.newPage()
    try {
      await page.goto(baseURL, { waitUntil: 'domcontentloaded' })
      await page.getByPlaceholder('Masukkan PIN').waitFor()
      await page.getByPlaceholder('Masukkan PIN').fill('1234')
      await page.getByRole('button', { name: 'Masuk' }).click()
      await page.locator('.product-card').last().scrollIntoViewIfNeeded()
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))

      const emptyLayout = await page.evaluate(() => {
        const price = document.querySelector('.product-card:last-child b')?.getBoundingClientRect()
        const nav = document.querySelector('.mobile-nav')?.getBoundingClientRect()
        return price && nav ? { priceBottom: Math.round(price.bottom), navTop: Math.round(nav.top) } : null
      })
      if (!emptyLayout) throw new Error('Elemen mobile saat keranjang kosong tidak lengkap.')
      if (emptyLayout.priceBottom > emptyLayout.navTop - 12) throw new Error(`Harga kartu terakhir tertutup navigasi saat keranjang kosong: ${JSON.stringify(emptyLayout)}`)

      await page.locator('.product-card').first().click()
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))

      const layout = await page.evaluate(() => {
        const price = document.querySelector('.product-card:last-child b')?.getBoundingClientRect()
        const checkout = document.querySelector('.mobile-cart-trigger')?.getBoundingClientRect()
        const nav = document.querySelector('.mobile-nav')?.getBoundingClientRect()
        return price && checkout && nav ? {
          priceBottom: Math.round(price.bottom),
          checkoutTop: Math.round(checkout.top),
          checkoutBottom: Math.round(checkout.bottom),
          navTop: Math.round(nav.top),
        } : null
      })

      if (!layout) throw new Error('Elemen mobile tidak lengkap.')
      if (layout.priceBottom > layout.checkoutTop - 12) throw new Error(`Harga kartu terakhir tertutup checkout: ${JSON.stringify(layout)}`)
      if (layout.checkoutBottom > layout.navTop) throw new Error(`Floating checkout bertumpuk dengan navigasi: ${JSON.stringify(layout)}`)
      console.log(`mobile-layout ${viewport.width}x${viewport.height}: PASS (kosong ${JSON.stringify(emptyLayout)}, terisi ${JSON.stringify(layout)})`)
    } finally {
      await context.close()
    }
  }
} finally {
  await browser.close()
}
