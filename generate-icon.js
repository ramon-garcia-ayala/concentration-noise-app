// Generate a 256x256 ICO from the orange sleeping cat sprite
const fs = require('fs')
const path = require('path')

// Sprite tokens
const F = 'F', Fd = 'Fd', Fw = 'Fw', Fp = 'Fp', E = 'E', Ep = 'Ep'
const _ = null

// Orange cat colors
const colors = {
  F: [0xD4, 0x84, 0x3E],   // fur
  Fd: [0xA8, 0x65, 0x2A],  // furDark
  Fw: [0xF5, 0xDC, 0xC0],  // belly
  Fp: [0xFF, 0xB6, 0xC1],  // pink
  E: [0xFF, 0xFF, 0xFF],   // eyeWhite
  Ep: [0x2D, 0x50, 0x16],  // pupil (green)
}

const sleeping = [
  [_,F,_,_,_,_,_,_,F,_],
  [F,Fp,F,F,F,F,F,F,Fp,F],
  [F,Fw,Fw,Fw,Fw,Fw,Fw,Fw,Fw,F],
  [F,Fw,Fw,Fw,Fw,Fw,Fw,Fw,Fw,F],
  [F,Fw,Fd,Fd,Fw,Fw,Fd,Fd,Fw,F],
  [F,Fw,Fw,Fw,Fp,Fp,Fw,Fw,Fw,F],
  [_,F,Fw,Fw,Fw,Fw,Fw,Fw,F,_],
  [_,F,F,Fw,Fw,Fw,Fw,F,F,_],
  [_,F,Fw,Fw,Fw,Fw,Fw,Fw,F,_],
  [_,F,F,_,_,_,_,F,F,_],
  [_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_],
]

// Create raw RGBA pixel data for a given size
function renderSprite(size) {
  const spriteW = 10, spriteH = 12
  const px = Math.floor(size / spriteW)
  const offsetX = Math.floor((size - spriteW * px) / 2)
  const offsetY = Math.floor((size - spriteH * px) / 2)

  const data = Buffer.alloc(size * size * 4, 0) // all transparent

  for (let r = 0; r < spriteH; r++) {
    for (let c = 0; c < spriteW; c++) {
      const tok = sleeping[r][c]
      if (!tok) continue
      const rgb = colors[tok]
      if (!rgb) continue

      // Fill px × px block
      for (let dy = 0; dy < px; dy++) {
        for (let dx = 0; dx < px; dx++) {
          const x = offsetX + c * px + dx
          const y = offsetY + r * px + dy
          if (x >= size || y >= size) continue
          const idx = (y * size + x) * 4
          data[idx] = rgb[0]     // R
          data[idx+1] = rgb[1]   // G
          data[idx+2] = rgb[2]   // B
          data[idx+3] = 255      // A
        }
      }
    }
  }
  return data
}

// Create a minimal BMP for ICO entry (BITMAPINFOHEADER + pixel data)
function createBmpEntry(size) {
  const rgba = renderSprite(size)

  // BMP in ICO uses double height (includes AND mask)
  const headerSize = 40
  const rowBytes = size * 4
  const andRowBytes = Math.ceil(size / 32) * 4
  const andMaskSize = andRowBytes * size
  const pixelDataSize = rowBytes * size
  const totalSize = headerSize + pixelDataSize + andMaskSize

  const buf = Buffer.alloc(totalSize, 0)

  // BITMAPINFOHEADER
  buf.writeUInt32LE(40, 0)           // biSize
  buf.writeInt32LE(size, 4)          // biWidth
  buf.writeInt32LE(size * 2, 8)      // biHeight (doubled for ICO)
  buf.writeUInt16LE(1, 12)           // biPlanes
  buf.writeUInt16LE(32, 14)          // biBitCount
  buf.writeUInt32LE(0, 16)           // biCompression
  buf.writeUInt32LE(pixelDataSize + andMaskSize, 20) // biSizeImage
  // rest is 0

  // Pixel data (bottom-up, BGRA)
  for (let y = 0; y < size; y++) {
    const srcRow = size - 1 - y // flip vertically
    for (let x = 0; x < size; x++) {
      const srcIdx = (srcRow * size + x) * 4
      const dstIdx = headerSize + (y * size + x) * 4
      buf[dstIdx] = rgba[srcIdx + 2]     // B
      buf[dstIdx + 1] = rgba[srcIdx + 1] // G
      buf[dstIdx + 2] = rgba[srcIdx]     // R
      buf[dstIdx + 3] = rgba[srcIdx + 3] // A
    }
  }

  // AND mask (all 0 = opaque, alpha handles transparency)
  // Already zero-filled

  return buf
}

// Build ICO file with multiple sizes
function buildIco(sizes) {
  const entries = sizes.map(s => createBmpEntry(s))

  // ICO header: 6 bytes
  // Directory entries: 16 bytes each
  const headerSize = 6
  const dirSize = sizes.length * 16
  let dataOffset = headerSize + dirSize

  const parts = [Buffer.alloc(headerSize + dirSize)]
  const header = parts[0]

  // ICONDIR
  header.writeUInt16LE(0, 0)           // reserved
  header.writeUInt16LE(1, 2)           // type (1 = ICO)
  header.writeUInt16LE(sizes.length, 4) // count

  // ICONDIRENTRY for each size
  for (let i = 0; i < sizes.length; i++) {
    const off = 6 + i * 16
    const s = sizes[i]
    header[off] = s >= 256 ? 0 : s     // width (0 = 256)
    header[off + 1] = s >= 256 ? 0 : s // height
    header[off + 2] = 0                 // color palette
    header[off + 3] = 0                 // reserved
    header.writeUInt16LE(1, off + 4)    // color planes
    header.writeUInt16LE(32, off + 6)   // bits per pixel
    header.writeUInt32LE(entries[i].length, off + 8)  // data size
    header.writeUInt32LE(dataOffset, off + 12)        // data offset
    dataOffset += entries[i].length
  }

  return Buffer.concat([header, ...entries])
}

const ico = buildIco([16, 32, 48, 64, 128, 256])
const outPath = path.join(__dirname, 'resources', 'icon.ico')
fs.writeFileSync(outPath, ico)
console.log(`Icon written to ${outPath} (${ico.length} bytes)`)
