import { positiveMod, hash2, hash3 } from '../lib/hash.js'

/**
 * @param {number} x
 * @param {number} y
 * @param {number} seed
 * @param {number} [period]
 */
function whiteHash2(x, y, seed, period) {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  return hash2(
    period != null ? positiveMod(ix, period) : ix,
    period != null ? positiveMod(iy, period) : iy,
    seed,
  )
}

/**
 * @param {number} x
 * @param {number} y
 * @param {number} z
 * @param {number} seed
 * @param {number} [period]
 */
function whiteHash3(x, y, z, seed, period) {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const iz = Math.floor(z)
  return hash3(
    period != null ? positiveMod(ix, period) : ix,
    period != null ? positiveMod(iy, period) : iy,
    period != null ? positiveMod(iz, period) : iz,
    seed,
  )
}

/** @type {import('../types.js').NoiseAlgorithm} */
const whiteHash = {
  id: 'whiteHash',
  label: 'White hash',
  supports: {
    dims: [2, 3],
    tileable: true,
    fbm: false,
  },
  params: [
    {
      key: 'scale',
      label: 'Scale',
      type: 'number',
      min: 1,
      max: 256,
      step: 1,
      default: 32,
      hint: 'Cells across the texture. High scale ≈ per-texel static.',
    },
  ],
  outputRange: [0, 1],
  create({ seed }) {
    const s = seed | 0
    return {
      sample2(x, y, period) {
        return whiteHash2(x, y, s, period)
      },
      sample3(x, y, z, period) {
        return whiteHash3(x, y, z, s, period)
      },
    }
  },
}

export default whiteHash
