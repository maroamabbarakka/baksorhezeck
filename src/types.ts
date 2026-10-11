export type Role = 'owner' | 'manager' | 'cashier'

export interface User {
  id: string
  name: string
  role: Role
  pin: string
  active: boolean
}

export interface Product {
  id: string
  sku: string
  name: string
  category: string
  price: number
  image: string
  active: boolean
}

export interface CartItem extends Product {
  qty: number
}

export type PaymentMethod = 'cash' | 'qris' | 'transfer'
export type OrderStatus = 'paid' | 'void'

export interface Order {
  id: string
  number: string
  createdAt: string
  cashierId: string
  cashierName: string
  items: CartItem[]
  subtotal: number
  discount: number
  tax: number
  total: number
  paymentMethod: PaymentMethod
  amountReceived: number
  change: number
  status: OrderStatus
}

export interface Settings {
  outletName: string
  tagline: string
  address: string
  phone: string
  taxPercent: number
  receiptFooter: string
  paperWidth: 58 | 80
  autoPrint: boolean
  showLogo: boolean
  printerName: string
}

export interface AppData {
  version: number
  users: User[]
  products: Product[]
  orders: Order[]
  settings: Settings
}

export type PageKey = 'cashier' | 'orders' | 'products' | 'reports' | 'printer' | 'users' | 'settings'
