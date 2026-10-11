const SERVICE_UUIDS = [
  '000018f0-0000-1000-8000-00805f9b34fb',
  '49535343-fe7d-4ae5-8fa9-9fafd205e455',
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
  '0000fee7-0000-1000-8000-00805f9b34fb',
  '0000ff00-0000-1000-8000-00805f9b34fb',
  '0000ffe0-0000-1000-8000-00805f9b34fb',
  '0000ffb0-0000-1000-8000-00805f9b34fb',
  '0000fff0-0000-1000-8000-00805f9b34fb',
  '0000ae30-0000-1000-8000-00805f9b34fb',
]

const STORAGE_KEY = 'bakso-umum-printer.v1'

interface BluetoothCharacteristicLike {
  uuid: string
  properties: { write: boolean; writeWithoutResponse: boolean }
  writeValueWithResponse?: (value: BufferSource) => Promise<void>
  writeValueWithoutResponse?: (value: BufferSource) => Promise<void>
  writeValue?: (value: BufferSource) => Promise<void>
}

interface BluetoothServiceLike {
  uuid: string
  getCharacteristics: () => Promise<BluetoothCharacteristicLike[]>
}

interface BluetoothServerLike {
  connected: boolean
  connect: () => Promise<BluetoothServerLike>
  getPrimaryService: (uuid: string) => Promise<BluetoothServiceLike>
  disconnect?: () => void
}

interface BluetoothDeviceLike extends EventTarget {
  id: string
  name?: string
  gatt?: BluetoothServerLike
}

interface BluetoothApiLike {
  requestDevice: (options: { acceptAllDevices: boolean; optionalServices: string[] }) => Promise<BluetoothDeviceLike>
  getDevices?: () => Promise<BluetoothDeviceLike[]>
}

export interface PrinterBinding {
  deviceId: string
  deviceName: string
  serviceUuid: string
  characteristicUuid: string
  chunkSize: number
}

let activeDevice: BluetoothDeviceLike | null = null
let activeCharacteristic: BluetoothCharacteristicLike | null = null

const bluetoothApi = () => (navigator as Navigator & { bluetooth?: BluetoothApiLike }).bluetooth

export function isBluetoothSupported() {
  return Boolean(bluetoothApi())
}

export function getSavedBinding(): PrinterBinding | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) as PrinterBinding : null
  } catch {
    return null
  }
}

function saveBinding(binding: PrinterBinding) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(binding))
}

function onDisconnected() {
  activeCharacteristic = null
  window.dispatchEvent(new Event('pos-printer-status'))
}

async function discoverWritable(device: BluetoothDeviceLike, preferred?: PrinterBinding) {
  if (!device.gatt) throw new Error('Perangkat ini tidak menyediakan koneksi Bluetooth GATT.')
  const server = device.gatt.connected ? device.gatt : await device.gatt.connect()
  const services = preferred?.serviceUuid
    ? [preferred.serviceUuid, ...SERVICE_UUIDS.filter(uuid => uuid !== preferred.serviceUuid)]
    : SERVICE_UUIDS

  for (const serviceUuid of services) {
    try {
      const service = await server.getPrimaryService(serviceUuid)
      const characteristics = await service.getCharacteristics()
      const characteristic = characteristics.find(item => item.uuid === preferred?.characteristicUuid && (item.properties.writeWithoutResponse || item.properties.write))
        ?? characteristics.find(item => item.properties.writeWithoutResponse)
        ?? characteristics.find(item => item.properties.write)
      if (characteristic) return { characteristic, serviceUuid: service.uuid || serviceUuid }
    } catch {
      // Printer thermal generik sering hanya mendukung satu UUID dari daftar ini.
    }
  }
  throw new Error('Characteristic tulis printer tidak ditemukan. Pastikan printer menggunakan Bluetooth Low Energy (BLE), bukan Bluetooth Classic saja.')
}

async function connectDevice(device: BluetoothDeviceLike, preferred?: PrinterBinding) {
  const found = await discoverWritable(device, preferred)
  activeDevice?.removeEventListener('gattserverdisconnected', onDisconnected)
  activeDevice = device
  activeCharacteristic = found.characteristic
  device.addEventListener('gattserverdisconnected', onDisconnected)
  const binding: PrinterBinding = {
    deviceId: device.id,
    deviceName: device.name || preferred?.deviceName || 'Printer Thermal BLE',
    serviceUuid: found.serviceUuid,
    characteristicUuid: found.characteristic.uuid,
    chunkSize: preferred?.chunkSize || 64,
  }
  saveBinding(binding)
  window.dispatchEvent(new Event('pos-printer-status'))
  return binding
}

export async function pairPrinter() {
  const bluetooth = bluetoothApi()
  if (!bluetooth) throw new Error('Web Bluetooth tidak tersedia. Gunakan Chrome atau Edge pada Android/desktop dengan HTTPS.')
  const device = await bluetooth.requestDevice({ acceptAllDevices: true, optionalServices: SERVICE_UUIDS })
  return connectDevice(device)
}

export async function restorePrinter() {
  const binding = getSavedBinding()
  const bluetooth = bluetoothApi()
  if (!binding || !bluetooth?.getDevices) return null
  const devices = await bluetooth.getDevices()
  const device = devices.find(item => item.id === binding.deviceId)
  return device ? connectDevice(device, binding) : null
}

async function ensureConnected() {
  if (activeDevice?.gatt?.connected && activeCharacteristic) return { device: activeDevice, characteristic: activeCharacteristic, binding: getSavedBinding() }
  const restored = await restorePrinter()
  if (!restored || !activeDevice || !activeCharacteristic) throw new Error('Printer belum siap. Buka menu Printer lalu pilih Hubungkan Bluetooth.')
  return { device: activeDevice, characteristic: activeCharacteristic, binding: restored }
}

async function writeChunk(characteristic: BluetoothCharacteristicLike, chunk: Uint8Array) {
  const copy = new Uint8Array(chunk.length)
  copy.set(chunk)
  const buffer = copy.buffer as ArrayBuffer
  if (characteristic.properties.writeWithoutResponse && characteristic.writeValueWithoutResponse) return characteristic.writeValueWithoutResponse(buffer)
  if (characteristic.writeValueWithResponse) return characteristic.writeValueWithResponse(buffer)
  if (characteristic.writeValue) return characteristic.writeValue(buffer)
  throw new Error('Characteristic printer tidak dapat menerima data.')
}

export async function writePrinter(bytes: Uint8Array) {
  const { characteristic, binding } = await ensureConnected()
  let offset = 0
  let chunkSize = binding?.chunkSize || 64
  while (offset < bytes.length) {
    const chunk = bytes.slice(offset, Math.min(offset + chunkSize, bytes.length))
    try {
      await writeChunk(characteristic, chunk)
      offset += chunk.length
      await new Promise(resolve => setTimeout(resolve, 18))
    } catch (error) {
      if (chunkSize > 20) {
        chunkSize = chunkSize > 40 ? 40 : 20
        continue
      }
      activeCharacteristic = null
      throw new Error(`Pengiriman ke printer gagal pada byte ${offset}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
}

export async function disconnectPrinter(forget = false) {
  if (activeDevice?.gatt?.connected) activeDevice.gatt.disconnect?.()
  activeDevice = null
  activeCharacteristic = null
  if (forget) localStorage.removeItem(STORAGE_KEY)
  window.dispatchEvent(new Event('pos-printer-status'))
}

export function printerStatus() {
  const binding = getSavedBinding()
  return { binding, connected: Boolean(activeDevice?.gatt?.connected && activeCharacteristic) }
}
