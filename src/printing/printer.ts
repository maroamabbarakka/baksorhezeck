import type { Order, Settings } from '../types'
import { encodeReceipt, encodeTestPrint } from './escpos'
import { writePrinter } from './webBluetooth'

export const printOrderBluetooth = (order: Order, settings: Settings) => writePrinter(encodeReceipt(order, settings))
export const testPrintBluetooth = (settings: Settings) => writePrinter(encodeTestPrint(settings))
