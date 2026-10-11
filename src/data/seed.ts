import type { AppData, Product, User } from '../types'

export const DEFAULT_PIN = '1234'

export const seedUsers: User[] = [
  { id: 'owner', name: 'Owner', role: 'owner', pin: DEFAULT_PIN, active: true },
  { id: 'manager', name: 'Manager', role: 'manager', pin: DEFAULT_PIN, active: true },
  { id: 'cashier', name: 'Kasir', role: 'cashier', pin: DEFAULT_PIN, active: true },
]

export const seedProducts: Product[] = [
  { id: 'bakso-komplit', sku: 'BR-001', name: 'Bakso Komplit', category: 'Bakso', price: 15000, image: '/products/bakso-komplit.webp', active: true },
  { id: 'bakso-mie-instan', sku: 'BR-002', name: 'Bakso Mie Instan', category: 'Bakso', price: 17000, image: '/products/bakso-mie-instan.webp', active: true },
  { id: 'bakso-kasar', sku: 'BR-003', name: 'Bakso Kasar (3 biji)', category: 'Tambahan', price: 5000, image: '/products/bakso-tambahan.webp', active: true },
  { id: 'bakso-halus', sku: 'BR-004', name: 'Bakso Halus (3 biji)', category: 'Tambahan', price: 5000, image: '/products/bakso-tambahan.webp', active: true },
  { id: 'bakso-kotak', sku: 'BR-005', name: 'Bakso Kotak (3 biji)', category: 'Tambahan', price: 5000, image: '/products/bakso-tambahan.webp', active: true },
  { id: 'bakso-tahu', sku: 'BR-006', name: 'Bakso Tahu (3 biji)', category: 'Tambahan', price: 5000, image: '/products/bakso-tambahan.webp', active: true },
  { id: 'bakso-pangait', sku: 'BR-007', name: 'Bakso Pangait (3 biji)', category: 'Tambahan', price: 5000, image: '/products/bakso-tambahan.webp', active: true },
  { id: 'buras', sku: 'PD-001', name: 'Buras', category: 'Pendamping', price: 3000, image: '/products/buras.webp', active: true },
  { id: 'ketupat', sku: 'PD-002', name: 'Ketupat', category: 'Pendamping', price: 3000, image: '/products/ketupat.webp', active: true },
  { id: 'kacang', sku: 'PD-003', name: 'Kacang', category: 'Pendamping', price: 2000, image: '/products/kacang.webp', active: true },
  { id: 'kerupuk-pangsit', sku: 'PD-004', name: 'Kerupuk Pangsit (4 biji)', category: 'Pendamping', price: 5000, image: '/products/kerupuk-pangsit.webp', active: true },
  { id: 'air-botol', sku: 'MN-001', name: 'Air Botol', category: 'Minuman', price: 5000, image: '/products/air-botol.webp', active: true },
  { id: 'air-gelas', sku: 'MN-002', name: 'Air Gelas', category: 'Minuman', price: 500, image: '/products/air-gelas.webp', active: true },
  { id: 'es-teh', sku: 'MN-003', name: 'Es Teh', category: 'Minuman', price: 5000, image: '/products/es-teh.webp', active: true },
]

export function createSeedData(): AppData {
  return {
    version: 1,
    users: seedUsers.map(user => ({ ...user })),
    products: seedProducts.map(product => ({ ...product })),
    orders: [],
    settings: {
      outletName: 'Bakso Umum',
      tagline: 'Khas Makassar',
      address: '',
      phone: '',
      taxPercent: 0,
      receiptFooter: 'Terima kasih. Selamat menikmati!',
      paperWidth: 58,
      autoPrint: false,
      showLogo: true,
      printerName: '',
    },
  }
}
