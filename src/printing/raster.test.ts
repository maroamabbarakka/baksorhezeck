import { describe, expect, it } from 'vitest'
import { packMonochromeRgba } from './raster'

describe('thermal logo raster', () => {
  it('mengemas delapan piksel hitam/putih menjadi satu byte ESC/POS', () => {
    const pixels = [
      0,0,0,255, 255,255,255,255, 0,0,0,255, 255,255,255,255,
      0,0,0,255, 255,255,255,255, 0,0,0,255, 255,255,255,255,
    ]
    const result = packMonochromeRgba(pixels, 8, 1)
    expect([...result.slice(0, 8)]).toEqual([0x1d,0x76,0x30,0x00,1,0,1,0])
    expect(result[8]).toBe(0b10101010)
  })
})
