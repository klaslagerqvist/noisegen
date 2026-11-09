/**
 * Convert a [0,1] Float32 volume to tightly packed R8 bytes (Z-major slices).
 * Uses the first (R) channel when the buffer is RGB-packed.
 *
 * @param {import('./types.js').NoiseBuffer} buffer
 * @returns {Uint8Array}
 */
export function bufferToR8(buffer) {
  const voxelCount = buffer.width * buffer.height * buffer.depth
  const out = new Uint8Array(voxelCount)
  for (let i = 0; i < voxelCount; i++) {
    out[i] = Math.round(buffer.data[i] * 255)
  }
  return out
}

/**
 * Convert planar RGB Float32 volumes to interleaved RGB8 bytes (Z-major).
 *
 * @param {import('./types.js').NoiseBuffer} buffer
 * @returns {Uint8Array}
 */
export function bufferToRgb8(buffer) {
  const { data, width, height, depth, channelCount } = buffer
  const voxelCount = width * height * depth
  const out = new Uint8Array(voxelCount * 3)

  if (channelCount === 1) {
    for (let i = 0; i < voxelCount; i++) {
      const v = Math.round(data[i] * 255)
      const o = i * 3
      out[o] = v
      out[o + 1] = v
      out[o + 2] = v
    }
    return out
  }

  const gBase = voxelCount
  const bBase = voxelCount * 2
  for (let i = 0; i < voxelCount; i++) {
    const o = i * 3
    out[o] = Math.round(data[i] * 255)
    out[o + 1] = Math.round(data[gBase + i] * 255)
    out[o + 2] = Math.round(data[bBase + i] * 255)
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
 * Export a 3D noise buffer as raw bytes with dims in the filename.
 * Mono → R8. RGB pack → interleaved RGB8.
 *
 * @param {import('./types.js').NoiseBuffer} buffer
 */
export function exportRaw3d(buffer) {
  const { width, height, depth, channelCount } = buffer
  if (channelCount === 3) {
    const bytes = bufferToRgb8(buffer)
    downloadRaw(bytes, `noise-${width}x${height}x${depth}-rgb8.raw`)
    return
  }
  const bytes = bufferToR8(buffer)
  downloadRaw(bytes, `noise-${width}x${height}x${depth}-r8.raw`)
}
