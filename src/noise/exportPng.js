/**
 * Download a grayscale RGBA buffer as a PNG.
 *
 * @param {Uint8Array} rgba
 * @param {number} width
 * @param {number} height
 * @param {string} filename
 */
export function downloadPng(rgba, width, height, filename) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  const imageData = new ImageData(new Uint8ClampedArray(rgba), width, height)
  ctx.putImageData(imageData, 0, 0)

  canvas.toBlob((blob) => {
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }, 'image/png')
}
