import { collection, doc, getDoc, getDocs, onSnapshot, setDoc, updateDoc, writeBatch, type Unsubscribe } from 'firebase/firestore'
import { db } from './firebase'
import type { AppData, Order, Product, Settings, User } from '../types'

const productsRef = collection(db, 'pos_products')
const ordersRef = collection(db, 'pos_orders')
const usersRef = collection(db, 'pos_users')
const settingsRef = doc(db, 'pos_config', 'settings')

export type SyncPhase = 'connecting' | 'synced' | 'offline' | 'error'
export interface SyncStatus { phase: SyncPhase; message: string; fromCache?: boolean; pendingWrites?: boolean }
export type CloudPatch = Partial<Pick<AppData, 'products' | 'orders' | 'users' | 'settings'>>

async function seedCollection<T extends { id: string }>(reference: typeof productsRef, rows: T[]) {
  const existing = await getDocs(reference)
  if (!existing.empty || !rows.length) return
  const batch = writeBatch(db)
  rows.forEach(row => batch.set(doc(reference, row.id), row))
  await batch.commit()
}

async function ensureCloudSeed(local: AppData) {
  await Promise.all([
    seedCollection(productsRef, local.products),
    seedCollection(ordersRef, local.orders),
    seedCollection(usersRef, local.users),
    getDoc(settingsRef).then(snapshot => snapshot.exists() ? undefined : setDoc(settingsRef, local.settings)),
  ])
}

export async function subscribeToCloud(local: AppData, onPatch: (patch: CloudPatch) => void, onStatus: (status: SyncStatus) => void) {
  onStatus({ phase: navigator.onLine ? 'connecting' : 'offline', message: navigator.onLine ? 'Menghubungkan Firestore...' : 'Offline · memakai data perangkat' })
  await ensureCloudSeed(local)
  const subscriptions: Unsubscribe[] = []
  const metadataStatus = (fromCache: boolean, pendingWrites: boolean) => onStatus({
    phase: !navigator.onLine ? 'offline' : 'synced',
    message: pendingWrites ? 'Menyimpan perubahan...' : fromCache ? 'Data cache · menunggu koneksi' : 'Tersinkron antarperangkat',
    fromCache,
    pendingWrites,
  })

  subscriptions.push(onSnapshot(productsRef, { includeMetadataChanges: true }, snapshot => {
    onPatch({ products: snapshot.docs.map(item => item.data() as Product).sort((a, b) => a.name.localeCompare(b.name)) })
    metadataStatus(snapshot.metadata.fromCache, snapshot.metadata.hasPendingWrites)
  }))
  subscriptions.push(onSnapshot(ordersRef, { includeMetadataChanges: true }, snapshot => {
    onPatch({ orders: snapshot.docs.map(item => item.data() as Order).sort((a, b) => b.createdAt.localeCompare(a.createdAt)) })
    metadataStatus(snapshot.metadata.fromCache, snapshot.metadata.hasPendingWrites)
  }))
  subscriptions.push(onSnapshot(usersRef, { includeMetadataChanges: true }, snapshot => {
    onPatch({ users: snapshot.docs.map(item => item.data() as User) })
    metadataStatus(snapshot.metadata.fromCache, snapshot.metadata.hasPendingWrites)
  }))
  subscriptions.push(onSnapshot(settingsRef, { includeMetadataChanges: true }, snapshot => {
    if (snapshot.exists()) onPatch({ settings: snapshot.data() as Settings })
    metadataStatus(snapshot.metadata.fromCache, snapshot.metadata.hasPendingWrites)
  }))
  return () => subscriptions.forEach(unsubscribe => unsubscribe())
}

export const cloudWrites = {
  product: (product: Product) => setDoc(doc(productsRef, product.id), product),
  order: (order: Order) => setDoc(doc(ordersRef, order.id), order),
  voidOrder: (orderId: string) => updateDoc(doc(ordersRef, orderId), { status: 'void' }),
  settings: (settings: Settings) => setDoc(settingsRef, settings),
  user: (user: User) => setDoc(doc(usersRef, user.id), user),
  async import(data: AppData) {
    const operations = [
      ...data.products.map(product => () => cloudWrites.product(product)),
      ...data.orders.map(order => () => cloudWrites.order(order)),
      ...data.users.map(user => () => cloudWrites.user(user)),
      () => cloudWrites.settings(data.settings),
    ]
    for (const operation of operations) await operation()
  },
}
