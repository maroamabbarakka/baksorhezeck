const GS = 0x1d

export function packMonochromeRgba(rgba: ArrayLike<number>, width: number, height: number, threshold = 175) {
  const widthBytes = Math.ceil(width / 8)
  const data = new Uint8Array(widthBytes * height)
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const source = (y * width + x) * 4
      const alpha = rgba[source + 3] / 255
      const red = rgba[source] * alpha + 255 * (1 - alpha)
      const green = rgba[source + 1] * alpha + 255 * (1 - alpha)
      const blue = rgba[source + 2] * alpha + 255 * (1 - alpha)
      const luminance = red * 0.299 + green * 0.587 + blue * 0.114
      if (luminance < threshold) data[y * widthBytes + Math.floor(x / 8)] |= 0x80 >> (x % 8)
    }
  }
  const xLow = widthBytes & 0xff
  const xHigh = (widthBytes >> 8) & 0xff
  const yLow = height & 0xff
  const yHigh = (height >> 8) & 0xff
  return new Uint8Array([GS, 0x76, 0x30, 0x00, xLow, xHigh, yLow, yHigh, ...data])
}

export async function rasterizeLogo(url: string, paperWidth: 58 | 80) {
  const image = new Image()
  image.decoding = 'async'
  image.src = url
  await image.decode()
  const targetWidth = paperWidth === 80 ? 220 : 170
  const ratio = image.naturalHeight / image.naturalWidth
  const targetHeight = Math.max(1, Math.round(targetWidth * ratio))
  const canvas = document.createElement('canvas')
  canvas.width = targetWidth
  canvas.height = targetHeight
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) throw new Error('Canvas logo tidak tersedia.')
  context.fillStyle = '#fff'
  context.fillRect(0, 0, targetWidth, targetHeight)
  context.drawImage(image, 0, 0, targetWidth, targetHeight)
  return packMonochromeRgba(context.getImageData(0, 0, targetWidth, targetHeight).data, targetWidth, targetHeight)
}
