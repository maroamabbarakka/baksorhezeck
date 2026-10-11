import type { Order, Settings } from '../types'

const ESC = 0x1b
const GS = 0x1d
const encoder = new TextEncoder()

const clean = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\x20-\x7E]/g, '')
const money = (value: number) => `Rp ${Math.round(value).toLocaleString('id-ID')}`

function line(left: string, right: string, width: number) {
  const safeLeft = clean(left)
  const safeRight = clean(right)
  const available = Math.max(1, width - safeRight.length - 1)
  const clipped = safeLeft.slice(0, available)
  return `${clipped}${' '.repeat(Math.max(1, width - clipped.length - safeRight.length))}${safeRight}\n`
}

function center(value: string, width: number) {
  const text = clean(value).slice(0, width)
  return `${' '.repeat(Math.max(0, Math.floor((width - text.length) / 2)))}${text}\n`
}

function bytes(...parts: (number[] | Uint8Array | string)[]) {
  const output: number[] = []
  parts.forEach(part => output.push(...(typeof part === 'string' ? encoder.encode(part) : part)))
  return new Uint8Array(output)
}

export function encodeReceipt(order: Order, settings: Settings) {
  const width = settings.paperWidth === 80 ? 48 : 32
  const rule = `${'-'.repeat(width)}\n`
  const itemRows = order.items.flatMap(item => {
    const name = `${item.qty}x ${clean(item.name)}`
    return [line(name, money(item.qty * item.price), width)]
  }).join('')
  const date = new Date(order.createdAt).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })
  const body = center(settings.outletName.toUpperCase(), width)
    + center(settings.tagline, width)
    + (settings.address ? center(settings.address, width) : '')
    + (settings.phone ? center(settings.phone, width) : '')
    + rule
    + `No: ${clean(order.number)}\n${clean(date)}\nKasir: ${clean(order.cashierName)}\n`
    + rule + itemRows + rule
    + line('Subtotal', money(order.subtotal), width)
    + (order.discount ? line('Diskon', `-${money(order.discount)}`, width) : '')
    + (order.tax ? line('Pajak', money(order.tax), width) : '')
    + line('TOTAL', money(order.total), width)
    + line(order.paymentMethod.toUpperCase(), money(order.amountReceived), width)
    + (order.change ? line('Kembali', money(order.change), width) : '')
    + rule + center(settings.receiptFooter, width) + '\n\n\n'
  return bytes([ESC, 0x40], [ESC, 0x61, 0x00], body, [GS, 0x56, 0x00])
}

export function encodeTestPrint(settings: Settings) {
  const width = settings.paperWidth === 80 ? 48 : 32
  const rule = `${'-'.repeat(width)}\n`
  const body = center(settings.outletName.toUpperCase(), width)
    + center('TEST PRINTER BERHASIL', width)
    + rule
    + 'Koneksi : Web Bluetooth BLE\n'
    + `Kertas  : ${settings.paperWidth} mm\n`
    + `Waktu   : ${new Date().toLocaleString('id-ID')}\n`
    + rule
    + center('Printer siap digunakan', width)
    + '\n\n\n'
  return bytes([ESC, 0x40], body, [GS, 0x56, 0x00])
}
