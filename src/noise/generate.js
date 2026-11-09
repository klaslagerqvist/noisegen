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
 * Stretch an entire buffer to fill [0, 1] using its actual min/max.
 * @param {Float32Array} data
 */
function remapMinMax(data) {
  let minV = Infinity
  let maxV = -Infinity
  for (let i = 0; i < data.length; i++) {
    const v = data[i]
    if (v < minV) minV = v
    if (v > maxV) maxV = v
  }
  if (!(maxV > minV)) {
    data.fill(0.5)
    return
  }
  const scale = 1 / (maxV - minV)
  for (let i = 0; i < data.length; i++) {
    data[i] = (data[i] - minV) * scale
  }
}

/**
 * Generate one scalar noise volume in [0, 1].
 *
 * @param {import('./types.js').ChannelSettings & {
 *   dimensions: 2|3,
 *   width: number,
 *   height: number,
 *   depth: number,
 *   tileable: boolean,
 * }} settings
 * @returns {Float32Array}
 */
function generateChannel(settings) {
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
    invert,
    normalizeMode = 'range',
    useFbm,
    octaves,
    persistence,
    lacunarity,
    algorithmParams,
  } = settings

  const slices = dimensions === 3 ? depth : 1
  const [lo, hi] = algorithm.outputRange
  /** @type {Float32Array} */
  let data

  if (typeof algorithm.bake === 'function') {
    data = algorithm.bake({
      seed,
      params: algorithmParams,
      width,
      height,
      depth: slices,
    })
    if (!(data instanceof Float32Array) || data.length !== width * height * slices) {
      throw new Error(
        `Algorithm "${algorithm.id}" bake() returned unexpected buffer size`,
      )
    }
    for (let i = 0; i < data.length; i++) {
      let v = normalize(data[i], lo, hi)
      if (invert) v = 1 - v
      data[i] = v
    }
  } else {
    const scale = Number(algorithmParams.scale ?? 4)
    const period = tileable ? Math.max(1, Math.round(scale)) : undefined
    const domain = tileable ? period : scale

    const sampler = algorithm.create({ seed, params: algorithmParams })
    data = new Float32Array(width * height * slices)

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
          let v = normalize(raw, lo, hi)
          if (invert) v = 1 - v
          data[idx] = v
        }
      }
    }
  }

  if (normalizeMode === 'minmax') {
    remapMinMax(data)
  }

  return data
}

/**
 * Generate a noise volume / image into a Float32Array in [0, 1].
 * Mono → 1 planar channel. RGB pack → planar R, G, B volumes.
 *
 * @param {import('./types.js').GenerateSettings} settings
 * @returns {import('./types.js').NoiseBuffer}
 */
export function generateNoise(settings) {
  const {
    packing = 'mono',
    dimensions,
    width,
    height,
    depth,
    tileable,
    channels,
  } = settings

  const slices = dimensions === 3 ? depth : 1
  const shared = { dimensions, width, height, depth, tileable }

  if (packing === 'rgb') {
    const r = generateChannel({ ...shared, ...channels.r, algorithmParams: { ...channels.r.algorithmParams } })
    const g = generateChannel({ ...shared, ...channels.g, algorithmParams: { ...channels.g.algorithmParams } })
    const b = generateChannel({ ...shared, ...channels.b, algorithmParams: { ...channels.b.algorithmParams } })
    const data = new Float32Array(r.length * 3)
    data.set(r, 0)
    data.set(g, r.length)
    data.set(b, r.length * 2)
    return { data, width, height, depth: slices, dimensions, channelCount: 3 }
  }

  const data = generateChannel({
    ...shared,
    ...channels.r,
    algorithmParams: { ...channels.r.algorithmParams },
  })
  return { data, width, height, depth: slices, dimensions, channelCount: 1 }
}

/**
 * @param {import('./types.js').NoiseBuffer} buffer
 * @param {number} channelIndex 0=R, 1=G, 2=B
 */
function channelOffset(buffer, channelIndex) {
  const voxelCount = buffer.width * buffer.height * buffer.depth
  return Math.min(channelIndex, buffer.channelCount - 1) * voxelCount
}

/**
 * Extract a Z-slice as RGBA bytes for canvas / Three.js DataTexture.
 *
 * @param {import('./types.js').NoiseBuffer} buffer
 * @param {number} [sliceZ]
 * @param {'rgb' | 'r' | 'g' | 'b'} [view]
 *   rgb = true color (or grayscale for mono). r/g/b = solo channel as grayscale.
 * @returns {Uint8Array}
 */
export function bufferToRgba(buffer, sliceZ = 0, view = 'rgb') {
  const { data, width, height, depth, channelCount } = buffer
  const z = Math.min(Math.max(0, sliceZ | 0), depth - 1)
  const sliceSize = width * height
  const sliceOffset = z * sliceSize
  const rgba = new Uint8Array(sliceSize * 4)

  const read = (channelIndex) => {
    const base = channelOffset(buffer, channelIndex) + sliceOffset
    return (i) => Math.round(data[base + i] * 255)
  }

  if (channelCount === 1 || view !== 'rgb') {
    const channelIndex = view === 'g' ? 1 : view === 'b' ? 2 : 0
    const sample = read(channelIndex)
    for (let i = 0; i < sliceSize; i++) {
      const v = sample(i)
      const o = i * 4
      rgba[o] = v
      rgba[o + 1] = v
      rgba[o + 2] = v
      rgba[o + 3] = 255
    }
    return rgba
  }

  const sampleR = read(0)
  const sampleG = read(1)
  const sampleB = read(2)
  for (let i = 0; i < sliceSize; i++) {
    const o = i * 4
    rgba[o] = sampleR(i)
    rgba[o + 1] = sampleG(i)
    rgba[o + 2] = sampleB(i)
    rgba[o + 3] = 255
  }
  return rgba
}
