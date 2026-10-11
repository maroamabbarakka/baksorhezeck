import type { Order, Settings } from '../types'
import { encodeReceipt, encodeTestPrint } from './escpos'
import { writePrinter } from './webBluetooth'
import { rasterizeLogo } from './raster'

function concat(...parts: Uint8Array[]) {
  const result = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0))
  let offset = 0
  parts.forEach(part => { result.set(part, offset); offset += part.length })
  return result
}

async function receiptPayload(order: Order, settings: Settings) {
  const receipt = encodeReceipt(order, settings)
  if (!settings.showLogo) return receipt
  try {
    const logo = await rasterizeLogo('/brand/logo.webp', settings.paperWidth)
    return concat(new Uint8Array([0x1b, 0x40, 0x1b, 0x61, 0x01]), logo, new Uint8Array([0x0a]), receipt)
  } catch {
    return receipt
  }
}

export const printOrderBluetooth = async (order: Order, settings: Settings) => writePrinter(await receiptPayload(order, settings))

export const testPrintBluetooth = async (settings: Settings) => {
  const now = new Date().toISOString()
  const order: Order = {
    id:'test-print', number:'TEST-PRINT', createdAt:now, cashierId:'system', cashierName:'Test Printer', status:'paid', paymentMethod:'cash',
    items:[
      { id:'test-1', sku:'TEST-1', name:'Bakso Komplit', category:'Bakso', price:15000, image:'', active:true, qty:1 },
      { id:'test-2', sku:'TEST-2', name:'Es Teh', category:'Minuman', price:5000, image:'', active:true, qty:1 },
      { id:'test-3', sku:'TEST-3', name:'Kerupuk Pangsit', category:'Pendamping', price:5000, image:'', active:true, qty:1 },
    ],
    subtotal:25000, discount:0, tax:0, total:25000, amountReceived:50000, change:25000,
  }
  const diagnostic = encodeTestPrint({ ...settings, showLogo:false })
  await writePrinter(concat(await receiptPayload(order, settings), diagnostic))
}
