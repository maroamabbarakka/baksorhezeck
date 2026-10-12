export const MAX_IMAGE_SOURCE_BYTES = 15 * 1024 * 1024
export const MAX_IMAGE_DATA_BYTES = 300 * 1024
export const MAX_IMAGE_EDGE = 960

const SUPPORTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

export function validateProductImage(file: File) {
  if (!SUPPORTED_IMAGE_TYPES.has(file.type)) throw new Error('Format foto harus JPG, PNG, atau WebP.')
  if (file.size > MAX_IMAGE_SOURCE_BYTES) throw new Error('Ukuran foto asli maksimal 15 MB.')
}

export function dataUrlBytes(dataUrl: string) {
  const payload = dataUrl.split(',', 2)[1] ?? ''
  const padding = payload.endsWith('==') ? 2 : payload.endsWith('=') ? 1 : 0
  return Math.max(0, Math.floor(payload.length * 3 / 4) - padding)
}

export function formatImageSize(bytes: number) {
  return bytes < 1024 ? `${bytes} B` : `${Math.round(bytes / 1024)} KB`
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => { URL.revokeObjectURL(url); resolve(image) }
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Foto tidak dapat dibaca. Coba simpan sebagai JPG, PNG, atau WebP.')) }
    image.src = url
  })
}

/** Converts an uploaded product photo into a compact, Firestore-safe data URL. */
export async function compressProductImage(file: File): Promise<string> {
  validateProductImage(file)
  const image = await loadImage(file)
  if (!image.naturalWidth || !image.naturalHeight) throw new Error('Dimensi foto tidak valid.')
  const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(image.naturalWidth, image.naturalHeight))
  let width = Math.max(1, Math.round(image.naturalWidth * scale))
  let height = Math.max(1, Math.round(image.naturalHeight * scale))
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d', { alpha: false })
  if (!context) throw new Error('Browser tidak mendukung pemrosesan foto.')
  const render = () => {
    canvas.width = width; canvas.height = height
    context.fillStyle = '#ffffff'; context.fillRect(0, 0, width, height)
    context.imageSmoothingEnabled = true; context.imageSmoothingQuality = 'high'
    context.drawImage(image, 0, 0, width, height)
  }
  const probe = document.createElement('canvas').toDataURL('image/webp', .8)
  const outputType = probe.startsWith('data:image/webp') ? 'image/webp' : 'image/jpeg'
  let quality = .82
  render()
  let result = canvas.toDataURL(outputType, quality)
  while (dataUrlBytes(result) > MAX_IMAGE_DATA_BYTES && quality > .46) {
    quality -= .08; result = canvas.toDataURL(outputType, quality)
  }
  while (dataUrlBytes(result) > MAX_IMAGE_DATA_BYTES && Math.max(width, height) > 480) {
    width = Math.max(1, Math.round(width * .82)); height = Math.max(1, Math.round(height * .82))
    quality = .68; render(); result = canvas.toDataURL(outputType, quality)
  }
  if (dataUrlBytes(result) > MAX_IMAGE_DATA_BYTES) throw new Error('Foto masih terlalu besar setelah dikompresi. Gunakan foto yang lebih sederhana.')
  return result
}
