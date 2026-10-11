import { describe, expect, it } from 'vitest'
import { calculateTotals, nextOrderNumber } from './order'
import type { CartItem, Settings } from '../types'

const settings: Settings = {
  outletName: 'Test', tagline: '', address: '', phone: '', taxPercent: 10, receiptFooter: '', paperWidth: 58, autoPrint: false, showLogo: true, printerName: '',
}

const item: CartItem = {
  id: '1', sku: 'T-1', name: 'Produk', category: 'Test', price: 15000, image: '', active: true, qty: 2,
}

describe('calculateTotals', () => {
  it('menghitung subtotal, diskon, pajak, dan total secara konsisten', () => {
    expect(calculateTotals([item], 5000, settings)).toEqual({ subtotal: 30000, discount: 5000, tax: 2500, total: 27500 })
  })

  it('membatasi diskon agar tidak melebihi subtotal', () => {
    expect(calculateTotals([item], 50000, { ...settings, taxPercent: 0 })).toEqual({ subtotal: 30000, discount: 30000, tax: 0, total: 0 })
  })

  it('menolak diskon dan pajak negatif', () => {
    expect(calculateTotals([item], -1000, { ...settings, taxPercent: -5 })).toEqual({ subtotal: 30000, discount: 0, tax: 0, total: 30000 })
  })
})

describe('nextOrderNumber', () => {
  it('membuat nomor transaksi berdasarkan tanggal dan urutan', () => {
    expect(nextOrderNumber(8, new Date(2026, 9, 11))).toBe('BR-261011-0009')
  })
})
