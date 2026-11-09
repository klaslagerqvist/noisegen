/**
 * Void-and-cluster blue noise (Ulichney).
 * Produces a tileable ranked dither LUT in [0, 1] — one unique value per texel.
 */

/**
 * @param {number} seed
 */
function mulberry32(seed) {
  let t = seed >>> 0
  return () => {
    t = (t + 0x6d2b79f5) >>> 0
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * @param {number} width
 * @param {number} height
 * @param {number} sigma
 * @param {number} seed
 * @param {number} initialDensity
 * @returns {Float32Array}
 */
export function voidAndCluster(
  width,
  height,
  sigma = 1.5,
  seed = 0,
  initialDensity = 0.1,
) {
  const n = width * height
  if (n <= 0) return new Float32Array(0)

  const rand = mulberry32(seed)
  const pattern = new Uint8Array(n)
  const energy = new Float64Array(n)
  const ranks = new Int32Array(n)
  ranks.fill(-1)

  const invTwoSigmaSq = 1 / (2 * sigma * sigma)
  // Kernel support: ~3 sigma is enough; always wrap (tileable).
  const radius = Math.max(1, Math.ceil(sigma * 3))

  /**
   * Add (sign=+1) or remove (sign=-1) a minority pixel's Gaussian contribution.
   * @param {number} px
   * @param {number} py
   * @param {number} sign
   */
  function splat(px, py, sign) {
    for (let dy = -radius; dy <= radius; dy++) {
      const y = ((py + dy) % height + height) % height
      const wy = dy * dy
      for (let dx = -radius; dx <= radius; dx++) {
        const x = ((px + dx) % width + width) % width
        const w = Math.exp(-(dx * dx + wy) * invTwoSigmaSq)
        energy[x + y * width] += sign * w
      }
    }
  }

  /** @returns {number} index of tightest cluster (max energy among 1s) */
  function tightestCluster() {
    let best = -1
    let bestE = -Infinity
    for (let i = 0; i < n; i++) {
      if (pattern[i] === 1 && energy[i] > bestE) {
        bestE = energy[i]
        best = i
      }
    }
    return best
  }

  /** @returns {number} index of largest void (min energy among 0s) */
  function largestVoid() {
    let best = -1
    let bestE = Infinity
    for (let i = 0; i < n; i++) {
      if (pattern[i] === 0 && energy[i] < bestE) {
        bestE = energy[i]
        best = i
      }
    }
    return best
  }

  function setOne(i) {
    if (pattern[i] === 1) return
    pattern[i] = 1
    splat(i % width, (i / width) | 0, 1)
  }

  function setZero(i) {
    if (pattern[i] === 0) return
    pattern[i] = 0
    splat(i % width, (i / width) | 0, -1)
  }

  // --- Initial sparse binary pattern ---
  let ones = Math.max(1, Math.min(n - 1, Math.round(n * initialDensity)))
  const order = new Int32Array(n)
  for (let i = 0; i < n; i++) order[i] = i
  for (let i = n - 1; i > 0; i--) {
    const j = (rand() * (i + 1)) | 0
    const tmp = order[i]
    order[i] = order[j]
    order[j] = tmp
  }
  for (let k = 0; k < ones; k++) setOne(order[k])

  // --- Rearrange until tightest cluster is not worse than largest void ---
  const maxSwap = n * 4
  for (let s = 0; s < maxSwap; s++) {
    const c = tightestCluster()
    const v = largestVoid()
    if (c < 0 || v < 0) break
    if (energy[c] <= energy[v]) break
    setZero(c)
    setOne(v)
  }

  // Snapshot optimized prototype
  const prototype = new Uint8Array(pattern)
  const protoOnes = ones

  // --- Phase 1: rank prototype 1s by removing tightest clusters ---
  for (let rank = protoOnes - 1; rank >= 0; rank--) {
    const c = tightestCluster()
    ranks[c] = rank
    setZero(c)
    ones--
  }

  // Restore prototype
  energy.fill(0)
  pattern.fill(0)
  ones = 0
  for (let i = 0; i < n; i++) {
    if (prototype[i]) {
      setOne(i)
      ones++
    }
  }

  // --- Phase 2 + 3: fill remaining voids from largest to smallest ---
  for (let rank = protoOnes; rank < n; rank++) {
    const v = largestVoid()
    ranks[v] = rank
    setOne(v)
    ones++
  }

  const out = new Float32Array(n)
  const denom = n > 1 ? n - 1 : 1
  for (let i = 0; i < n; i++) {
    out[i] = ranks[i] / denom
  }
  return out
}

/** @type {import('../types.js').NoiseAlgorithm} */
const blueNoise = {
  id: 'blueNoise',
  label: 'Blue noise',
  supports: {
    dims: [2],
    tileable: true,
    fbm: false,
    bake: true,
  },
  params: [
    {
      key: 'sigma',
      label: 'Sigma',
      type: 'number',
      min: 1,
      max: 3,
      step: 0.1,
      default: 1.5,
      hint: 'Gaussian kernel size in pixels. ~1.5 is typical for 64² dither LUTs.',
    },
    {
      key: 'initialDensity',
      label: 'Initial density',
      type: 'number',
      min: 0.05,
      max: 0.25,
      step: 0.01,
      default: 0.1,
      hint: 'Prototype fill fraction for void-and-cluster. 0.1 is the classic default.',
    },
  ],
  outputRange: [0, 1],
  create() {
    return {
      sample2() {
        return 0
      },
      sample3() {
        return 0
      },
    }
  },
  bake({ seed, params, width, height }) {
    const sigma = Number(params.sigma ?? 1.5)
    const initialDensity = Number(params.initialDensity ?? 0.1)
    return voidAndCluster(width, height, sigma, seed | 0, initialDensity)
  },
}

export default blueNoise
