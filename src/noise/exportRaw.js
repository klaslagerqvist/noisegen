/**
 * Convert a [0,1] Float32 volume to tightly packed R8 bytes (Z-major slices).
 *
 * @param {import('./types.js').NoiseBuffer} buffer
 * @returns {Uint8Array}
 */
export function bufferToR8(buffer) {
  const { data } = buffer
  const out = new Uint8Array(data.length)
  for (let i = 0; i < data.length; i++) {
    out[i] = Math.round(data[i] * 255)
  }
  return out
}

/**
 * Download raw bytes as a file.
 *
 * @param {Uint8Array} bytes
 * @param {string} filename
 */
export function downloadRaw(bytes, filename) {
  const blob = new Blob([bytes], { type: 'application/octet-stream' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Export a 3D noise buffer as R8 raw with dims in the filename.
 *
 * @param {import('./types.js').NoiseBuffer} buffer
 */
export function exportRaw3d(buffer) {
  const { width, height, depth } = buffer
  const bytes = bufferToR8(buffer)
  downloadRaw(bytes, `noise-${width}x${height}x${depth}-r8.raw`)
}
