import { dateTime, rupiah } from './format'
import type { Order, Settings } from '../types'

const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]!))

export function printReceipt(order: Order, settings: Settings) {
  const popup = window.open('', '_blank', 'width=420,height=720')
  if (!popup) throw new Error('Popup cetak diblokir browser.')
  const items = order.items.map(item => `<tr><td>${item.qty}× ${escapeHtml(item.name)}</td><td>${rupiah(item.qty * item.price)}</td></tr>`).join('')
  popup.document.write(`<!doctype html><html><head><title>${escapeHtml(order.number)}</title><style>
    @page{size:${settings.paperWidth}mm auto;margin:3mm}*{box-sizing:border-box}body{width:${settings.paperWidth - 8}mm;margin:0 auto;font:12px ui-monospace,monospace;color:#000}.center{text-align:center}.logo{width:24mm;height:24mm;object-fit:contain}h1{font-size:18px;margin:4px 0;text-transform:uppercase}p{margin:2px 0}.rule{border-top:1px dashed #000;margin:9px 0}table{width:100%;border-collapse:collapse}td{padding:3px 0;vertical-align:top}td:last-child{text-align:right;white-space:nowrap}.total{font-size:14px;font-weight:bold}.footer{margin-top:14px}@media print{button{display:none}}
  </style></head><body><header class="center">${settings.showLogo ? '<img class="logo" src="/brand/logo.webp" />' : ''}<h1>${escapeHtml(settings.outletName)}</h1><strong>${escapeHtml(settings.tagline)}</strong>${settings.address ? `<p>${escapeHtml(settings.address)}</p>` : ''}${settings.phone ? `<p>${escapeHtml(settings.phone)}</p>` : ''}</header><div class="rule"></div><p>No: ${escapeHtml(order.number)}</p><p>${escapeHtml(dateTime(order.createdAt))}</p><p>Kasir: ${escapeHtml(order.cashierName)}</p><div class="rule"></div><table>${items}</table><div class="rule"></div><table><tr><td>Subtotal</td><td>${rupiah(order.subtotal)}</td></tr>${order.discount ? `<tr><td>Diskon</td><td>-${rupiah(order.discount)}</td></tr>` : ''}${order.tax ? `<tr><td>Pajak</td><td>${rupiah(order.tax)}</td></tr>` : ''}<tr class="total"><td>TOTAL</td><td>${rupiah(order.total)}</td></tr><tr><td>${order.paymentMethod.toUpperCase()}</td><td>${rupiah(order.amountReceived)}</td></tr>${order.change ? `<tr><td>Kembali</td><td>${rupiah(order.change)}</td></tr>` : ''}</table><div class="rule"></div><div class="center footer"><p>${escapeHtml(settings.receiptFooter)}</p><button onclick="window.print()">Cetak Struk</button></div><script>window.onload=()=>setTimeout(()=>window.print(),300)</script></body></html>`)
  popup.document.close()
}
