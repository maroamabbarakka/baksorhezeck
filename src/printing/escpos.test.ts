import { describe, expect, it } from 'vitest'
import { encodeReceipt, encodeTestPrint } from './escpos'
import type { Order, Settings } from '../types'

const settings: Settings = { outletName:'Bakso Umum', tagline:'Khas Makassar', address:'Makassar', phone:'', taxPercent:0, receiptFooter:'Terima kasih', paperWidth:58, autoPrint:false, showLogo:true, printerName:'Test' }
const order: Order = { id:'1', number:'BR-001', createdAt:'2026-10-11T10:00:00.000Z', cashierId:'cashier', cashierName:'Kasir', items:[{ id:'p1', sku:'P1', name:'Bakso Komplit', category:'Bakso', price:15000, image:'', active:true, qty:2 }], subtotal:30000, discount:0, tax:0, total:30000, paymentMethod:'cash', amountReceived:50000, change:20000, status:'paid' }

describe('ESC/POS encoder', () => {
  it('menghasilkan init command dan isi transaksi ASCII', () => {
    const result = encodeReceipt(order, settings)
    expect([...result.slice(0, 2)]).toEqual([0x1b, 0x40])
    const text = new TextDecoder().decode(result)
    expect(text).toContain('BAKSO UMUM')
    expect(text).toContain('Bakso Komplit')
    expect(text).toContain('Rp 30.000')
  })

  it('menghasilkan payload test printer yang dapat dikirim', () => {
    const result = encodeTestPrint(settings)
    expect(result.length).toBeGreaterThan(80)
    expect(new TextDecoder().decode(result)).toContain('TEST PRINTER BERHASIL')
  })
})
