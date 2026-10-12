import { describe, expect, it } from 'vitest'
import { dataUrlBytes, formatImageSize, MAX_IMAGE_SOURCE_BYTES, validateProductImage } from './productImage'

describe('product image helpers', () => {
  it('calculates decoded base64 size', () => expect(dataUrlBytes('data:image/webp;base64,YWJjZA==')).toBe(4))
  it('validates format and source size', () => {
    expect(() => validateProductImage(new File(['photo'], 'menu.jpg', { type: 'image/jpeg' }))).not.toThrow()
    expect(() => validateProductImage(new File(['svg'], 'menu.svg', { type: 'image/svg+xml' }))).toThrow(/JPG/)
    expect(() => validateProductImage({ type: 'image/png', size: MAX_IMAGE_SOURCE_BYTES + 1 } as File)).toThrow(/15 MB/)
  })
  it('formats storage size', () => expect(formatImageSize(2048)).toBe('2 KB'))
})
