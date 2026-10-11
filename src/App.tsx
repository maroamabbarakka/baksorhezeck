import { useEffect, useState, type FormEvent } from 'react'
import { usePosStore } from './context/PosStore'
import { DEFAULT_PIN } from './data/seed'
import { dateTime, localDateKey, roleLabel, rupiah } from './lib/format'
import { calculateTotals, nextOrderNumber } from './lib/order'
import { printReceipt } from './lib/receipt'
import { printOrderBluetooth, testPrintBluetooth } from './printing/printer'
import { disconnectPrinter, getSavedBinding, isBluetoothSupported, pairPrinter, printerStatus, restorePrinter } from './printing/webBluetooth'
import type { CartItem, Order, PageKey, PaymentMethod, Product, Settings, User } from './types'

const nav: { key: PageKey; label: string; icon: string; roles?: string[] }[] = [
  { key: 'cashier', label: 'Kasir', icon: '▦' },
  { key: 'orders', label: 'Transaksi', icon: '▤' },
  { key: 'products', label: 'Menu & Harga', icon: '◫', roles: ['owner', 'manager'] },
  { key: 'reports', label: 'Laporan', icon: '◒', roles: ['owner', 'manager'] },
  { key: 'printer', label: 'Printer', icon: '▣', roles: ['owner', 'manager'] },
  { key: 'users', label: 'Pengguna', icon: '♙', roles: ['owner', 'manager'] },
  { key: 'settings', label: 'Pengaturan', icon: '⚙', roles: ['owner', 'manager'] },
]

function LoginPage() {
  const { data, login } = usePosStore()
  const activeUsers = data.users.filter(user => user.active)
  const [selected, setSelected] = useState(activeUsers[0]?.id ?? '')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!login(selected, pin)) {
      setError('PIN tidak sesuai. Silakan periksa dan coba lagi.')
      setPin('')
    }
  }

  return <main className="login-page">
    <section className="login-brand">
      <img src="/brand/logo.webp" alt="Logo Bakso Rhezeck" />
      <div><span>Point of Sale</span><h1>{data.settings.outletName}</h1><p>Kasir cepat, sederhana, dan siap digunakan.</p></div>
    </section>
    <section className="login-card">
      <div className="login-heading"><span className="brand-mark">BR</span><div><h2>Masuk ke kasir</h2><p>Pilih akun dan masukkan PIN.</p></div></div>
      <form onSubmit={submit}>
        <label className="field"><span>Akun</span><select value={selected} onChange={event => { setSelected(event.target.value); setError('') }}>{activeUsers.map(user => <option value={user.id} key={user.id}>{user.name} · {roleLabel(user.role)}</option>)}</select></label>
        <label className="field"><span>PIN</span><input autoFocus inputMode="numeric" type="password" maxLength={6} value={pin} onChange={event => { setPin(event.target.value.replace(/\D/g, '')); setError('') }} placeholder="Masukkan PIN" /></label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="button primary full" disabled={!selected || pin.length < 4}>Masuk</button>
      </form>
      <p className="login-help">PIN awal seluruh akun: <strong>{DEFAULT_PIN}</strong></p>
    </section>
  </main>
}

function Sidebar({ page, setPage, mobileOpen, close }: { page: PageKey; setPage: (page: PageKey) => void; mobileOpen: boolean; close: () => void }) {
  const { data, currentUser, logout } = usePosStore()
  const items = nav.filter(item => !item.roles || item.roles.includes(currentUser!.role))
  return <>
    <button className={`sidebar-backdrop ${mobileOpen ? 'open' : ''}`} onClick={close} aria-label="Tutup menu" />
    <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
      <div className="sidebar-brand"><img src="/brand/logo.webp" alt="" /><div><strong>{data.settings.outletName}</strong><span>Point of Sale</span></div></div>
      <nav>{items.map(item => <button key={item.key} className={page === item.key ? 'active' : ''} onClick={() => { setPage(item.key); close() }}><span>{item.icon}</span>{item.label}</button>)}</nav>
      <div className="sidebar-user"><span className="avatar">{currentUser!.name.slice(0, 2).toUpperCase()}</span><div><strong>{currentUser!.name}</strong><span>{roleLabel(currentUser!.role)}</span></div><button onClick={logout} title="Keluar">↪</button></div>
    </aside>
  </>
}

function Topbar({ title, openMenu }: { title: string; openMenu: () => void }) {
  const { currentUser, syncStatus } = usePosStore()
  return <header className="topbar"><button className="menu-button" onClick={openMenu}>☰</button><div><h1>{title}</h1><p>{new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())}</p></div><div className={`cloud-status ${syncStatus.phase}`} title={syncStatus.message} data-testid="cloud-status"><span />{syncStatus.phase === 'synced' ? 'Cloud aktif' : syncStatus.phase === 'offline' ? 'Offline' : syncStatus.phase === 'error' ? 'Sync gagal' : 'Sinkronisasi'}</div><div className="top-user">{currentUser!.name}</div></header>
}

function CashierPage() {
  const { data, currentUser, saveOrder } = usePosStore()
  const [cart, setCart] = useState<CartItem[]>([])
  const [category, setCategory] = useState('Semua')
  const [query, setQuery] = useState('')
  const [discount, setDiscount] = useState(0)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [received, setReceived] = useState(0)
  const [success, setSuccess] = useState<Order | null>(null)
  const [mobileCart, setMobileCart] = useState(false)
  const [printNotice, setPrintNotice] = useState('')
  const categories = ['Semua', ...new Set(data.products.filter(product => product.active).map(product => product.category))]
  const products = data.products.filter(product => product.active && (category === 'Semua' || product.category === category) && `${product.name} ${product.sku}`.toLowerCase().includes(query.toLowerCase()))
  const totals = calculateTotals(cart, discount, data.settings)

  const add = (product: Product) => setCart(current => {
    const found = current.find(item => item.id === product.id)
    return found ? current.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item) : [...current, { ...product, qty: 1 }]
  })
  const qty = (id: string, change: number) => setCart(current => current.map(item => item.id === id ? { ...item, qty: item.qty + change } : item).filter(item => item.qty > 0))
  const reset = () => { setCart([]); setDiscount(0); setPaymentOpen(false); setReceived(0); setPaymentMethod('cash'); setMobileCart(false) }
  const pay = () => {
    const amountReceived = paymentMethod === 'cash' ? received : totals.total
    if (paymentMethod === 'cash' && amountReceived < totals.total) return
    const order: Order = {
      id: crypto.randomUUID(), number: nextOrderNumber(data.orders.length), createdAt: new Date().toISOString(), cashierId: currentUser!.id, cashierName: currentUser!.name,
      items: cart.map(item => ({ ...item })), ...totals, paymentMethod, amountReceived, change: Math.max(0, amountReceived - totals.total), status: 'paid',
    }
    saveOrder(order); setSuccess(order); reset()
    if (data.settings.autoPrint) {
      setPrintNotice('Mencetak struk melalui Bluetooth...')
      void printOrderBluetooth(order, data.settings).then(() => setPrintNotice('Struk berhasil dicetak.')).catch(error => setPrintNotice(`Transaksi tersimpan, tetapi cetak gagal: ${error instanceof Error ? error.message : String(error)}`))
    } else setPrintNotice('')
  }

  return <div className="cashier-layout">
    <section className={`catalog-panel ${cart.length ? 'has-mobile-cart' : ''}`}>
      <div className="catalog-tools"><label className="search"><span>⌕</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Cari menu atau SKU..." /></label><div className="chips">{categories.map(item => <button key={item} className={category === item ? 'active' : ''} onClick={() => setCategory(item)}>{item}</button>)}</div></div>
      <div className="product-grid">{products.map(product => <button className="product-card" key={product.id} onClick={() => add(product)}><img src={product.image} alt={product.name} /><span className="add-badge">+</span><div><small>{product.category}</small><strong>{product.name}</strong><b>{rupiah(product.price)}</b></div></button>)}</div>
      {!products.length && <Empty title="Menu tidak ditemukan" detail="Ubah kata pencarian atau kategori." />}
      <button className="mobile-cart-trigger" disabled={!cart.length} onClick={() => setMobileCart(true)}><span>▤</span><b>Lihat Pesanan</b><i>{cart.reduce((sum, item) => sum + item.qty, 0)}</i><strong>{rupiah(totals.total)}</strong></button>
    </section>
    <button className={`cart-backdrop ${mobileCart ? 'open' : ''}`} onClick={() => setMobileCart(false)} aria-label="Tutup keranjang" />
    <aside className={`cart-panel ${mobileCart ? 'mobile-open' : ''}`}>
      <button className="mobile-cart-close" onClick={() => setMobileCart(false)} aria-label="Tutup keranjang">×</button>
      <div className="panel-heading"><div><h2>Pesanan</h2><p>{cart.reduce((sum, item) => sum + item.qty, 0)} item</p></div>{cart.length > 0 && <button className="text-danger" onClick={() => setCart([])}>Kosongkan</button>}</div>
      <div className="cart-items">{cart.map(item => <div className="cart-item" key={item.id}><img src={item.image} alt="" /><div><strong>{item.name}</strong><span>{rupiah(item.price)}</span><div className="qty"><button onClick={() => qty(item.id, -1)}>−</button><b>{item.qty}</b><button onClick={() => qty(item.id, 1)}>+</button></div></div><b>{rupiah(item.price * item.qty)}</b></div>)}{!cart.length && <Empty title="Keranjang masih kosong" detail="Pilih menu untuk menambahkan pesanan." />}</div>
      <div className="cart-totals"><label><span>Diskon</span><div className="money-field"><span>Rp</span><input type="number" min="0" max={totals.subtotal} value={discount || ''} onChange={event => setDiscount(Number(event.target.value) || 0)} placeholder="0" /></div></label><div><span>Subtotal</span><b>{rupiah(totals.subtotal)}</b></div>{totals.discount > 0 && <div><span>Diskon</span><b>−{rupiah(totals.discount)}</b></div>}{totals.tax > 0 && <div><span>Pajak {data.settings.taxPercent}%</span><b>{rupiah(totals.tax)}</b></div>}<div className="grand-total"><span>Total</span><b>{rupiah(totals.total)}</b></div><button className="button primary full pay-button" disabled={!cart.length} onClick={() => { setReceived(totals.total); setPaymentOpen(true) }}>Bayar</button></div>
      {paymentOpen && <Modal title="Pembayaran" close={() => setPaymentOpen(false)}><div className="payment-total"><span>Total pembayaran</span><strong>{rupiah(totals.total)}</strong></div><div className="payment-methods">{([['cash', 'Tunai'], ['qris', 'QRIS'], ['transfer', 'Transfer']] as [PaymentMethod, string][]).map(([value, label]) => <button key={value} className={paymentMethod === value ? 'active' : ''} onClick={() => { setPaymentMethod(value); setReceived(value === 'cash' ? totals.total : totals.total) }}>{label}</button>)}</div>{paymentMethod === 'cash' && <><label className="field"><span>Uang diterima</span><input autoFocus type="number" min={totals.total} value={received || ''} onChange={event => setReceived(Number(event.target.value) || 0)} /></label><div className="quick-money">{[totals.total, 20000, 50000, 100000].filter((v, i, a) => v >= totals.total && a.indexOf(v) === i).map(value => <button key={value} onClick={() => setReceived(value)}>{rupiah(value)}</button>)}</div><div className="change-row"><span>Kembalian</span><strong>{rupiah(Math.max(0, received - totals.total))}</strong></div></>}<button className="button primary full" disabled={paymentMethod === 'cash' && received < totals.total} onClick={pay}>Selesaikan transaksi</button></Modal>}
      {success && <Modal title="Transaksi berhasil" close={() => setSuccess(null)}><div className="success-state"><span>✓</span><h3>{success.number}</h3><p>Pembayaran telah tersimpan.</p><strong>{rupiah(success.total)}</strong>{success.change > 0 && <p>Kembalian {rupiah(success.change)}</p>}</div>{printNotice && <div className="print-notice">{printNotice}</div>}<div className="modal-actions stack-mobile"><button className="button secondary full" onClick={() => { setPrintNotice('Mengirim ke printer...'); void printOrderBluetooth(success, data.settings).then(() => setPrintNotice('Struk berhasil dicetak.')).catch(error => setPrintNotice(error instanceof Error ? error.message : String(error))) }}>Cetak Bluetooth</button><button className="button ghost full" onClick={() => printReceipt(success, data.settings)}>Cetak via browser/PDF</button><button className="button primary full" onClick={() => setSuccess(null)}>Transaksi baru</button></div></Modal>}
    </aside>
  </div>
}

function OrdersPage() {
  const { data, currentUser, voidOrder } = usePosStore()
  const [selected, setSelected] = useState<Order | null>(null)
  const [query, setQuery] = useState('')
  const orders = data.orders.filter(order => `${order.number} ${order.cashierName}`.toLowerCase().includes(query.toLowerCase()))
  return <section className="page-card"><div className="section-header"><div><h2>Riwayat Transaksi</h2><p>Semua penjualan yang tersimpan di perangkat ini.</p></div><label className="search compact"><span>⌕</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Cari transaksi..." /></label></div>
    <div className="table-wrap"><table><thead><tr><th>Nomor</th><th>Waktu</th><th>Kasir</th><th>Pembayaran</th><th>Status</th><th className="right">Total</th></tr></thead><tbody>{orders.map(order => <tr key={order.id} onClick={() => setSelected(order)}><td><strong>{order.number}</strong></td><td>{dateTime(order.createdAt)}</td><td>{order.cashierName}</td><td>{order.paymentMethod.toUpperCase()}</td><td><span className={`status ${order.status}`}>{order.status === 'paid' ? 'Selesai' : 'Dibatalkan'}</span></td><td className="right"><strong>{rupiah(order.total)}</strong></td></tr>)}</tbody></table></div>
    {!orders.length && <Empty title="Belum ada transaksi" detail="Transaksi selesai akan tampil di halaman ini." />}
    {selected && <Modal title={selected.number} close={() => setSelected(null)}><div className="order-detail"><p>{dateTime(selected.createdAt)} · {selected.cashierName}</p>{selected.items.map(item => <div key={item.id}><span>{item.qty}× {item.name}</span><b>{rupiah(item.qty * item.price)}</b></div>)}<hr /><div><span>Total</span><strong>{rupiah(selected.total)}</strong></div></div><div className="modal-actions stack-mobile"><button className="button secondary full" onClick={() => void printOrderBluetooth(selected, data.settings).catch(error => alert(error instanceof Error ? error.message : String(error)))}>Cetak Bluetooth</button><button className="button ghost full" onClick={() => printReceipt(selected, data.settings)}>Browser/PDF</button>{selected.status === 'paid' && currentUser!.role !== 'cashier' && <button className="button danger full" onClick={() => { voidOrder(selected.id); setSelected(null) }}>Batalkan</button>}</div></Modal>}
  </section>
}

const blankProduct: Product = { id: '', sku: '', name: '', category: 'Bakso', price: 0, image: '/products/bakso-komplit.webp', active: true }

function ProductsPage() {
  const { data, saveProduct, toggleProduct } = usePosStore()
  const [editing, setEditing] = useState<Product | null>(null)
  const [query, setQuery] = useState('')
  const products = data.products.filter(product => `${product.name} ${product.sku}`.toLowerCase().includes(query.toLowerCase()))
  const save = () => {
    if (!editing?.name.trim() || editing.price < 0) return
    saveProduct({ ...editing, id: editing.id || crypto.randomUUID(), sku: editing.sku.trim() || `BR-${Date.now().toString().slice(-5)}`, name: editing.name.trim(), price: Math.round(editing.price) })
    setEditing(null)
  }
  return <section className="page-card"><div className="section-header"><div><h2>Menu & Harga</h2><p>Kelola produk yang tampil pada halaman kasir.</p></div><button className="button primary" onClick={() => setEditing({ ...blankProduct })}>+ Tambah menu</button></div><label className="search page-search"><span>⌕</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Cari menu atau SKU..." /></label>
    <div className="manage-grid">{products.map(product => <article key={product.id} className={!product.active ? 'inactive' : ''}><img src={product.image} alt={product.name} /><div><small>{product.sku} · {product.category}</small><h3>{product.name}</h3><strong>{rupiah(product.price)}</strong><div><button className={`switch ${product.active ? 'on' : ''}`} onClick={() => toggleProduct(product.id)}>{product.active ? 'Aktif' : 'Nonaktif'}</button><button className="button secondary small" onClick={() => setEditing({ ...product })}>Edit</button></div></div></article>)}</div>
    {editing && <Modal title={editing.id ? 'Edit menu' : 'Tambah menu'} close={() => setEditing(null)}><div className="form-grid"><label className="field"><span>Nama menu</span><input value={editing.name} onChange={event => setEditing({ ...editing, name: event.target.value })} /></label><label className="field"><span>SKU</span><input value={editing.sku} onChange={event => setEditing({ ...editing, sku: event.target.value.toUpperCase() })} placeholder="Otomatis" /></label><label className="field"><span>Kategori</span><input value={editing.category} onChange={event => setEditing({ ...editing, category: event.target.value })} /></label><label className="field"><span>Harga</span><input type="number" min="0" value={editing.price || ''} onChange={event => setEditing({ ...editing, price: Number(event.target.value) || 0 })} /></label><label className="field span-2"><span>Path gambar</span><input value={editing.image} onChange={event => setEditing({ ...editing, image: event.target.value })} /></label></div><button className="button primary full" disabled={!editing.name.trim()} onClick={save}>Simpan menu</button></Modal>}
  </section>
}

function ReportsPage() {
  const { data } = usePosStore()
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today')
  const start = new Date(); start.setHours(0, 0, 0, 0)
  if (period === 'week') start.setDate(start.getDate() - ((start.getDay() + 6) % 7))
  if (period === 'month') start.setDate(1)
  const paid = data.orders.filter(order => order.status === 'paid' && new Date(order.createdAt).getTime() >= start.getTime())
  const sales = paid.reduce((sum, order) => sum + order.total, 0)
  const items = paid.reduce((sum, order) => sum + order.items.reduce((count, item) => count + item.qty, 0), 0)
  const productMap = new Map<string, { name: string; qty: number; sales: number }>()
  paid.forEach(order => order.items.forEach(item => { const row = productMap.get(item.id) ?? { name: item.name, qty: 0, sales: 0 }; row.qty += item.qty; row.sales += item.qty * item.price; productMap.set(item.id, row) }))
  const top = [...productMap.values()].sort((a, b) => b.qty - a.qty).slice(0, 5)
  const days = Array.from({ length: 7 }, (_, index) => { const day = new Date(); day.setHours(0,0,0,0); day.setDate(day.getDate() - (6-index)); const value = data.orders.filter(order => order.status === 'paid' && order.createdAt.slice(0,10) === localDateKey(day)).reduce((sum, order) => sum + order.total, 0); return { label: day.toLocaleDateString('id-ID',{weekday:'short'}), value } })
  const maxDay = Math.max(...days.map(day => day.value), 1)
  return <div className="report-page"><div className="section-header"><div><h2>Ringkasan Penjualan</h2><p>Data transaksi selesai pada perangkat ini.</p></div><div className="segmented"><button className={period === 'today' ? 'active' : ''} onClick={() => setPeriod('today')}>Harian</button><button className={period === 'week' ? 'active' : ''} onClick={() => setPeriod('week')}>Mingguan</button><button className={period === 'month' ? 'active' : ''} onClick={() => setPeriod('month')}>Bulanan</button></div></div><div className="kpi-grid"><Kpi label="Omzet" value={rupiah(sales)} detail={`${paid.length} transaksi`} /><Kpi label="Rata-rata transaksi" value={rupiah(paid.length ? sales / paid.length : 0)} detail="Per transaksi" /><Kpi label="Produk terjual" value={String(items)} detail="Total item" /><Kpi label="Transaksi batal" value={String(data.orders.filter(order => order.status === 'void').length)} detail="Seluruh periode" /></div><section className="page-card sales-chart"><h3>Omzet 7 Hari Terakhir</h3><div>{days.map(day => <span key={day.label}><i style={{height:`${Math.max(4,day.value/maxDay*100)}%`}} title={rupiah(day.value)} /><small>{day.label}</small></span>)}</div></section><div className="report-columns"><section className="page-card"><h3>Produk terlaris</h3>{top.map((item, index) => <div className="rank-row" key={item.name}><span>{index + 1}</span><div><strong>{item.name}</strong><small>{item.qty} terjual</small></div><b>{rupiah(item.sales)}</b></div>)}{!top.length && <Empty title="Belum ada data" detail="Selesaikan transaksi untuk melihat laporan." />}</section><section className="page-card"><h3>Metode pembayaran</h3>{(['cash', 'qris', 'transfer'] as PaymentMethod[]).map(method => { const rows = paid.filter(order => order.paymentMethod === method); return <div className="payment-row" key={method}><span>{method.toUpperCase()}</span><div><i style={{ width: `${paid.length ? rows.length / paid.length * 100 : 0}%` }} /></div><b>{rupiah(rows.reduce((sum, order) => sum + order.total, 0))}</b></div> })}</section></div></div>
}

function PrinterPage() {
  const { data, saveSettings } = usePosStore()
  const [message, setMessage] = useState('')
  const [phase, setPhase] = useState<'idle'|'connecting'|'printing'>('idle')
  const [connected, setConnected] = useState(printerStatus().connected)
  const [binding, setBinding] = useState(getSavedBinding())
  useEffect(() => {
    if (!getSavedBinding()) return
    setPhase('connecting')
    void restorePrinter().then(restored => { setBinding(restored ?? getSavedBinding()); setConnected(Boolean(restored)); setMessage(restored ? 'Printer dipulihkan dan siap digunakan.' : 'Printer pernah dipilih. Tekan Hubungkan untuk menyambungkan kembali.') }).catch(() => setMessage('Printer tersimpan, tetapi belum dapat dihubungkan. Pastikan printer menyala.')).finally(() => setPhase('idle'))
  }, [])
  useEffect(() => {
    const updateStatus = () => setConnected(printerStatus().connected)
    window.addEventListener('pos-printer-status', updateStatus)
    const timer = window.setInterval(updateStatus, 3000)
    return () => { window.removeEventListener('pos-printer-status', updateStatus); window.clearInterval(timer) }
  }, [])
  const pair = async () => {
    setPhase('connecting'); setMessage('Mencari service dan characteristic printer...')
    try { const next = await pairPrinter(); setBinding(next); setConnected(true); saveSettings({ ...data.settings, printerName: next.deviceName }); setMessage('Printer benar-benar terhubung ke GATT dan siap menerima data.') } catch (error) { setConnected(false); setMessage(error instanceof Error ? error.message : 'Printer tidak dapat dihubungkan.') } finally { setPhase('idle') }
  }
  const testOrder: Order = { id:'test', number:'TEST-PRINT', createdAt:new Date().toISOString(), cashierId:'test', cashierName:'Operator', items:[{...data.products[0],qty:1}], subtotal:data.products[0]?.price ?? 0, discount:0, tax:0, total:data.products[0]?.price ?? 0, paymentMethod:'cash', amountReceived:data.products[0]?.price ?? 0, change:0, status:'paid' }
  const testBluetooth = async () => { setPhase('printing'); setMessage('Membentuk logo dan struk lengkap, lalu mengirim ESC/POS...'); try { await testPrintBluetooth(data.settings); setConnected(true); setMessage('Struk uji lengkap beserta logo berhasil dikirim langsung ke printer Bluetooth.') } catch (error) { setConnected(false); setMessage(error instanceof Error ? error.message : String(error)) } finally { setPhase('idle') } }
  const forget = async () => { await disconnectPrinter(true); setBinding(null); setConnected(false); saveSettings({ ...data.settings, printerName:'' }); setMessage('Binding printer dihapus. Silakan hubungkan kembali.') }
  return <div className="settings-grid"><section className="page-card"><div className="section-header"><div><h2>Pengaturan Printer</h2><p>ESC/POS langsung melalui Web Bluetooth BLE.</p></div><span className={`status ${connected ? 'paid' : 'void'}`}>{connected ? 'Terhubung' : binding ? 'Tersimpan · Offline' : 'Belum terhubung'}</span></div>{!isBluetoothSupported() && <div className="print-warning">Browser ini tidak mendukung Web Bluetooth. Gunakan Chrome/Edge Android atau desktop.</div>}{message && <div className="notice">{message}</div>}{binding && <div className="binding-detail"><strong>{binding.deviceName}</strong><span>Service: {binding.serviceUuid}</span><span>Characteristic: {binding.characteristicUuid}</span></div>}<div className="printer-options"><button disabled={phase !== 'idle'} onClick={() => void pair()}><span>ᛒ</span><div><strong>{binding ? 'Hubungkan / Ganti Printer' : 'Hubungkan Bluetooth'}</strong><small>{phase === 'connecting' ? 'Menyambungkan GATT...' : 'Pilih dan verifikasi printer BLE'}</small></div><b>›</b></button><button disabled={phase !== 'idle' || !binding} onClick={() => void testBluetooth()}><span>▣</span><div><strong>Test cetak Bluetooth</strong><small>{phase === 'printing' ? 'Sedang mengirim...' : 'Kirim ESC/POS langsung, tanpa PDF'}</small></div><b>›</b></button><button onClick={() => printReceipt(testOrder, data.settings)}><span>↗</span><div><strong>Cetak melalui browser</strong><small>Fallback dialog sistem / PDF</small></div><b>›</b></button>{binding && <button disabled={phase !== 'idle'} onClick={() => void forget()}><span>×</span><div><strong>Lupakan printer</strong><small>Hapus binding perangkat ini</small></div><b>›</b></button>}<label><span>▤</span><div><strong>Ukuran kertas</strong><small>Lebar kertas thermal</small></div><select value={data.settings.paperWidth} onChange={event => saveSettings({ ...data.settings, paperWidth: Number(event.target.value) as 58|80 })}><option value="58">58 mm</option><option value="80">80 mm</option></select></label><label><span>⚡</span><div><strong>Auto print Bluetooth</strong><small>Cetak langsung setelah pembayaran</small></div><input type="checkbox" checked={data.settings.autoPrint} onChange={event => saveSettings({ ...data.settings, autoPrint:event.target.checked })} /></label></div></section><section className="page-card receipt-preview"><img src="/brand/logo.webp" alt="" /><h3>{data.settings.outletName}</h3><p>{data.settings.tagline}</p><hr/><strong>NOTA PEMBELIAN</strong><div><span>Bakso Komplit</span><b>{rupiah(15000)}</b></div><hr/><div><strong>Total</strong><strong>{rupiah(15000)}</strong></div><small>{data.settings.receiptFooter}</small></section></div>
}

function UsersPage() {
  const { data, currentUser, changePin, toggleUser } = usePosStore()
  const [editing, setEditing] = useState<User | null>(null)
  const [pin, setPin] = useState('')
  const [confirm, setConfirm] = useState('')
  const [message, setMessage] = useState('')
  const canManage = (user: User) => currentUser!.role === 'owner' || user.role !== 'owner'
  const savePin = () => {
    if (!editing || pin.length < 4 || pin !== confirm) { setMessage(pin !== confirm ? 'Konfirmasi PIN tidak sama.' : 'PIN minimal 4 angka.'); return }
    changePin(editing.id, pin); setEditing(null); setPin(''); setConfirm(''); setMessage('PIN berhasil diperbarui.')
  }
  return <section className="page-card"><div className="section-header"><div><h2>Pengguna</h2><p>Kelola akses Owner, Manager, dan Kasir.</p></div></div>{message && <div className="notice">{message}</div>}<div className="user-grid">{data.users.map(user => <article key={user.id}><span className={`avatar large ${user.role}`}>{user.name.slice(0, 2).toUpperCase()}</span><div><h3>{user.name}</h3><p>{roleLabel(user.role)}</p><span className={`status ${user.active ? 'paid' : 'void'}`}>{user.active ? 'Aktif' : 'Nonaktif'}</span></div><div className="user-actions"><button className="button secondary small" disabled={!canManage(user)} onClick={() => { setEditing(user); setMessage('') }}>Ganti PIN</button><button className="button ghost small" disabled={!canManage(user) || user.id === currentUser!.id} onClick={() => toggleUser(user.id)}>{user.active ? 'Nonaktifkan' : 'Aktifkan'}</button></div></article>)}</div>
    {editing && <Modal title={`Ganti PIN ${editing.name}`} close={() => setEditing(null)}><p className="modal-copy">Masukkan PIN baru untuk akun {editing.name}. Gunakan minimal 4 angka.</p><label className="field"><span>PIN baru</span><input autoFocus type="password" inputMode="numeric" maxLength={6} value={pin} onChange={event => setPin(event.target.value.replace(/\D/g, ''))} /></label><label className="field"><span>Ulangi PIN baru</span><input type="password" inputMode="numeric" maxLength={6} value={confirm} onChange={event => setConfirm(event.target.value.replace(/\D/g, ''))} /></label>{message && <p className="form-error">{message}</p>}<button className="button primary full" onClick={savePin}>Simpan PIN</button></Modal>}
  </section>
}

function SettingsPage() {
  const { data, saveSettings, exportData, importData } = usePosStore()
  const [form, setForm] = useState<Settings>({ ...data.settings })
  const [saved, setSaved] = useState(false)
  const update = <K extends keyof Settings>(key: K, value: Settings[K]) => { setForm(current => ({ ...current, [key]: value })); setSaved(false) }
  return <div className="settings-grid"><section className="page-card"><div className="section-header"><div><h2>Profil Outlet & Struk</h2><p>Informasi utama dan identitas pada nota.</p></div></div><div className="form-grid"><label className="field"><span>Nama outlet</span><input value={form.outletName} onChange={event => update('outletName', event.target.value)} /></label><label className="field"><span>Tagline</span><input value={form.tagline} onChange={event => update('tagline', event.target.value)} /></label><label className="field span-2"><span>Alamat</span><textarea value={form.address} onChange={event => update('address', event.target.value)} /></label><label className="field"><span>Nomor telepon</span><input value={form.phone} onChange={event => update('phone', event.target.value)} /></label><label className="field"><span>Pajak (%)</span><input type="number" min="0" max="100" value={form.taxPercent} onChange={event => update('taxPercent', Math.max(0, Number(event.target.value) || 0))} /></label><label className="field span-2"><span>Footer struk</span><input value={form.receiptFooter} onChange={event => update('receiptFooter', event.target.value)} /></label><label className="check-field span-2"><input type="checkbox" checked={form.showLogo} onChange={event => update('showLogo',event.target.checked)} /><span>Tampilkan logo pada struk</span></label></div><button className="button primary" onClick={() => { saveSettings(form); setSaved(true) }}>Simpan pengaturan</button>{saved && <span className="saved-label">✓ Tersimpan</span>}</section><section className="page-card backup-card"><div className="backup-icon">⇩</div><h3>Cadangan data</h3><p>Unduh atau pulihkan seluruh data aplikasi melalui file JSON.</p><button className="button secondary full" onClick={exportData}>Unduh backup</button><label className="button ghost full import-button">Pulihkan backup<input type="file" accept="application/json" onChange={event => { const file=event.target.files?.[0]; if(file) void importData(file).then(()=>setSaved(true)).catch(error=>alert(error instanceof Error?error.message:'Gagal memulihkan backup')) }} /></label><small>Backup secara berkala sebelum membersihkan data browser.</small></section></div>
}

function Modal({ title, close, children }: { title: string; close: () => void; children: React.ReactNode }) {
  return <div className="modal-backdrop" onMouseDown={event => event.target === event.currentTarget && close()}><section className="modal" role="dialog" aria-modal="true"><header><h2>{title}</h2><button onClick={close} aria-label="Tutup">×</button></header><div className="modal-body">{children}</div></section></div>
}

function Empty({ title, detail }: { title: string; detail: string }) { return <div className="empty"><span>◎</span><strong>{title}</strong><p>{detail}</p></div> }
function Kpi({ label, value, detail }: { label: string; value: string; detail: string }) { return <article className="kpi"><span>{label}</span><strong>{value}</strong><small>{detail}</small></article> }

export default function App() {
  const { currentUser } = usePosStore()
  const [page, setPage] = useState<PageKey>('cashier')
  const [mobileOpen, setMobileOpen] = useState(false)
  if (!currentUser) return <LoginPage />
  const allowedPage = nav.find(item => item.key === page)
  const effectivePage = allowedPage?.roles && !allowedPage.roles.includes(currentUser.role) ? 'cashier' : page
  const title = nav.find(item => item.key === effectivePage)?.label ?? 'Kasir'
  const content = { cashier: <CashierPage />, orders: <OrdersPage />, products: <ProductsPage />, reports: <ReportsPage />, printer: <PrinterPage />, users: <UsersPage />, settings: <SettingsPage /> }[effectivePage]
  return <div className="app-shell"><Sidebar page={effectivePage} setPage={setPage} mobileOpen={mobileOpen} close={() => setMobileOpen(false)} /><main className="app-main"><Topbar title={title} openMenu={() => setMobileOpen(true)} /><div className="page-content">{content}</div><nav className="mobile-nav">{nav.filter(item => ['cashier','orders','reports','settings'].includes(item.key) && (!item.roles || item.roles.includes(currentUser.role))).map(item => <button key={item.key} className={effectivePage===item.key?'active':''} onClick={()=>setPage(item.key)}><span>{item.icon}</span>{item.label}</button>)}</nav></main></div>
}
