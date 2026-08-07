import { getAlgorithm } from './registry.js'
import { fbm } from './fbm.js'

/**
 * Remap a value from [lo, hi] into [0, 1].
 * @param {number} value
 * @param {number} lo
 * @param {number} hi
 */
function normalize(value, lo, hi) {
  if (hi === lo) return 0.5
  return Math.min(1, Math.max(0, (value - lo) / (hi - lo)))
}

/**
 * Generate a noise volume / image into a Float32Array in [0, 1].
 *
 * @param {import('./types.js').GenerateSettings} settings
 * @returns {import('./types.js').NoiseBuffer}
 */
export function generateNoise(settings) {
  const algorithm = getAlgorithm(settings.algorithmId)
  if (!algorithm) {
    throw new Error(`Unknown algorithm: ${settings.algorithmId}`)
  }

  const {
    seed,
    dimensions,
    width,
    height,
    depth,
    tileable,
    useFbm,
    octaves,
    persistence,
    lacunarity,
    algorithmParams,
  } = settings

  const scale = Number(algorithmParams.scale ?? 4)
  const period = tileable ? Math.max(1, Math.round(scale)) : undefined
  const domain = tileable ? period : scale

  const sampler = algorithm.create({ seed, params: algorithmParams })
  const [lo, hi] = algorithm.outputRange

  const slices = dimensions === 3 ? depth : 1
  const data = new Float32Array(width * height * slices)

  const sampleAt = (x, y, z) => {
    if (useFbm && algorithm.supports.fbm) {
      return fbm(sampler, x, y, z, dimensions, {
        octaves,
        persistence,
        lacunarity,
        period,
      })
    }
    return dimensions === 3
      ? sampler.sample3(x, y, z, period)
      : sampler.sample2(x, y, period)
  }

  for (let z = 0; z < slices; z++) {
    const nz = dimensions === 3 ? (z / depth) * domain : 0
    for (let y = 0; y < height; y++) {
      const ny = (y / height) * domain
      for (let x = 0; x < width; x++) {
        const nx = (x / width) * domain
        const raw = sampleAt(nx, ny, nz)
        const idx = x + y * width + z * width * height
        data[idx] = normalize(raw, lo, hi)
      }
    }
  }

  return { data, width, height, depth: slices, dimensions }
}

/**
 * Extract a Z-slice as RGBA bytes for canvas / Three.js DataTexture.
 *
 * @param {import('./types.js').NoiseBuffer} buffer
 * @param {number} [sliceZ]
 * @returns {Uint8Array}
 */
export function bufferToRgba(buffer, sliceZ = 0) {
  const { data, width, height, depth } = buffer
  const z = Math.min(Math.max(0, sliceZ | 0), depth - 1)
  const offset = z * width * height
  const rgba = new Uint8Array(width * height * 4)

  for (let i = 0; i < width * height; i++) {
    const v = Math.round(data[offset + i] * 255)
    const o = i * 4
    rgba[o] = v
    rgba[o + 1] = v
    rgba[o + 2] = v
    rgba[o + 3] = 255
  }

  return rgba
}
