/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { createSeedData } from '../data/seed'
import { cloudWrites, subscribeToCloud, type SyncStatus } from '../lib/cloudStore'
import type { AppData, Order, Product, Settings, User } from '../types'

const STORAGE_KEY = 'bakso-rhezeck-pos.v1'
const SESSION_KEY = 'bakso-rhezeck-session.v1'

interface StoreValue {
  data: AppData
  currentUser: User | null
  syncStatus: SyncStatus
  login: (userId: string, pin: string) => boolean
  logout: () => void
  saveOrder: (order: Order) => void
  voidOrder: (orderId: string) => void
  saveProduct: (product: Product) => void
  toggleProduct: (productId: string) => void
  saveSettings: (settings: Settings) => void
  changePin: (userId: string, pin: string) => void
  toggleUser: (userId: string) => void
  exportData: () => void
  importData: (file: File) => Promise<void>
}

const StoreContext = createContext<StoreValue | null>(null)

function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return createSeedData()
    const parsed = JSON.parse(raw) as AppData
    if (!parsed.users?.length || !parsed.products || !parsed.orders || !parsed.settings) return createSeedData()
    const seed = createSeedData()
    const settings = { ...seed.settings, ...parsed.settings }
    if (settings.outletName === 'Bakso Rhezeck') settings.outletName = 'Bakso Umum'
    return { ...seed, ...parsed, settings }
  } catch {
    return createSeedData()
  }
}

export function PosStoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(loadData)
  const [sessionId, setSessionId] = useState(() => sessionStorage.getItem(SESSION_KEY))
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({ phase: navigator.onLine ? 'connecting' : 'offline', message: 'Menyiapkan sinkronisasi...' })
  const currentUser = data.users.find(user => user.id === sessionId && user.active) ?? null

  useEffect(() => localStorage.setItem(STORAGE_KEY, JSON.stringify(data)), [data])
  useEffect(() => {
    let unsubscribe: (() => void) | undefined
    let active = true
    void subscribeToCloud(data, patch => {
      if (!active) return
      setData(current => ({ ...current, ...patch, settings: patch.settings ? { ...createSeedData().settings, ...patch.settings } : current.settings }))
    }, status => active && setSyncStatus(status)).then(cleanup => { if (active) unsubscribe = cleanup; else cleanup() }).catch(error => {
      if (active) setSyncStatus({ phase: navigator.onLine ? 'error' : 'offline', message: error instanceof Error ? error.message : 'Sinkronisasi Firestore gagal.' })
    })
    const online = () => setSyncStatus({ phase:'connecting', message:'Internet kembali · menyinkronkan...' })
    const offline = () => setSyncStatus({ phase:'offline', message:'Offline · perubahan akan dikirim saat online' })
    window.addEventListener('online', online)
    window.addEventListener('offline', offline)
    return () => { active = false; unsubscribe?.(); window.removeEventListener('online', online); window.removeEventListener('offline', offline) }
    // Sinkronisasi hanya dipasang sekali; perubahan berikutnya datang melalui listener Firestore.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const trackWrite = (operation: Promise<unknown>) => {
    setSyncStatus(current => ({ ...current, phase: navigator.onLine ? 'connecting' : 'offline', message: navigator.onLine ? 'Menyimpan perubahan...' : 'Tersimpan offline · menunggu internet' }))
    void operation.catch(error => setSyncStatus({ phase: navigator.onLine ? 'error' : 'offline', message: error instanceof Error ? error.message : 'Perubahan belum tersinkron.' }))
  }

  const value = useMemo<StoreValue>(() => ({
    data,
    currentUser,
    syncStatus,
    login(userId, pin) {
      const user = data.users.find(item => item.id === userId && item.active && item.pin === pin)
      if (!user) return false
      sessionStorage.setItem(SESSION_KEY, user.id)
      setSessionId(user.id)
      return true
    },
    logout() {
      sessionStorage.removeItem(SESSION_KEY)
      setSessionId(null)
    },
    saveOrder(order) {
      setData(current => ({ ...current, orders: [order, ...current.orders] }))
      trackWrite(cloudWrites.order(order))
    },
    voidOrder(orderId) {
      setData(current => ({ ...current, orders: current.orders.map(order => order.id === orderId ? { ...order, status: 'void' } : order) }))
      trackWrite(cloudWrites.voidOrder(orderId))
    },
    saveProduct(product) {
      setData(current => {
        const exists = current.products.some(item => item.id === product.id)
        return { ...current, products: exists ? current.products.map(item => item.id === product.id ? product : item) : [...current.products, product] }
      })
      trackWrite(cloudWrites.product(product))
    },
    toggleProduct(productId) {
      setData(current => ({ ...current, products: current.products.map(product => product.id === productId ? { ...product, active: !product.active } : product) }))
      const product = data.products.find(item => item.id === productId)
      if (product) trackWrite(cloudWrites.product({ ...product, active: !product.active }))
    },
    saveSettings(settings) {
      setData(current => ({ ...current, settings }))
      trackWrite(cloudWrites.settings(settings))
    },
    changePin(userId, pin) {
      setData(current => ({ ...current, users: current.users.map(user => user.id === userId ? { ...user, pin } : user) }))
      const user = data.users.find(item => item.id === userId)
      if (user) trackWrite(cloudWrites.user({ ...user, pin }))
    },
    toggleUser(userId) {
      setData(current => ({ ...current, users: current.users.map(user => user.id === userId ? { ...user, active: !user.active } : user) }))
      const user = data.users.find(item => item.id === userId)
      if (user) trackWrite(cloudWrites.user({ ...user, active: !user.active }))
    },
    exportData() {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `bakso-rhezeck-backup-${new Date().toISOString().slice(0, 10)}.json`
      link.click()
      URL.revokeObjectURL(link.href)
    },
    async importData(file) {
      const parsed = JSON.parse(await file.text()) as AppData
      if (!parsed.users?.length || !Array.isArray(parsed.products) || !Array.isArray(parsed.orders) || !parsed.settings) throw new Error('Format file backup tidak valid.')
      const seed = createSeedData()
      const imported = { ...seed, ...parsed, settings: { ...seed.settings, ...parsed.settings }, version: seed.version }
      setData(imported)
      await cloudWrites.import(imported)
    },
  }), [data, currentUser, syncStatus])

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function usePosStore() {
  const value = useContext(StoreContext)
  if (!value) throw new Error('usePosStore harus digunakan di dalam PosStoreProvider')
  return value
}
