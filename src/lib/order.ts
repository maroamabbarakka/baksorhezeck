import type { CartItem, Settings } from '../types'

export function calculateTotals(items: CartItem[], discount: number, settings: Settings) {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0)
  const safeDiscount = Math.min(subtotal, Math.max(0, Math.round(discount)))
  const taxable = subtotal - safeDiscount
  const tax = Math.round(taxable * Math.max(0, settings.taxPercent) / 100)
  return { subtotal, discount: safeDiscount, tax, total: taxable + tax }
}

export function nextOrderNumber(orderCount: number, now = new Date()) {
  const stamp = `${String(now.getFullYear()).slice(-2)}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
  return `BR-${stamp}-${String(orderCount + 1).padStart(4, '0')}`
}
