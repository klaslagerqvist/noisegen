import { positiveMod, hash2, hash3 } from '../lib/hash.js'

function fade(t) {
  return t * t * (3 - 2 * t)
}

function mix(a, b, t) {
  return a + (b - a) * t
}

/**
 * @param {number} x
 * @param {number} y
 * @param {number} seed
 * @param {number} [period]
 */
function valueNoise2(x, y, seed, period) {
  const x0 = Math.floor(x)
  const y0 = Math.floor(y)
  const fx = fade(x - x0)
  const fy = fade(y - y0)

  const wrap = (i) => (period != null ? positiveMod(i, period) : i)
  const n00 = hash2(wrap(x0), wrap(y0), seed)
  const n10 = hash2(wrap(x0 + 1), wrap(y0), seed)
  const n01 = hash2(wrap(x0), wrap(y0 + 1), seed)
  const n11 = hash2(wrap(x0 + 1), wrap(y0 + 1), seed)

  return mix(mix(n00, n10, fx), mix(n01, n11, fx), fy)
}

/**
 * @param {number} x
 * @param {number} y
 * @param {number} z
 * @param {number} seed
 * @param {number} [period]
 */
function valueNoise3(x, y, z, seed, period) {
  const x0 = Math.floor(x)
  const y0 = Math.floor(y)
  const z0 = Math.floor(z)
  const fx = fade(x - x0)
  const fy = fade(y - y0)
  const fz = fade(z - z0)

  const wrap = (i) => (period != null ? positiveMod(i, period) : i)
  const n000 = hash3(wrap(x0), wrap(y0), wrap(z0), seed)
  const n100 = hash3(wrap(x0 + 1), wrap(y0), wrap(z0), seed)
  const n010 = hash3(wrap(x0), wrap(y0 + 1), wrap(z0), seed)
  const n110 = hash3(wrap(x0 + 1), wrap(y0 + 1), wrap(z0), seed)
  const n001 = hash3(wrap(x0), wrap(y0), wrap(z0 + 1), seed)
  const n101 = hash3(wrap(x0 + 1), wrap(y0), wrap(z0 + 1), seed)
  const n011 = hash3(wrap(x0), wrap(y0 + 1), wrap(z0 + 1), seed)
  const n111 = hash3(wrap(x0 + 1), wrap(y0 + 1), wrap(z0 + 1), seed)

  const nx00 = mix(n000, n100, fx)
  const nx10 = mix(n010, n110, fx)
  const nx01 = mix(n001, n101, fx)
  const nx11 = mix(n011, n111, fx)
  return mix(mix(nx00, nx10, fy), mix(nx01, nx11, fy), fz)
}

/** @type {import('../types.js').NoiseAlgorithm} */
const valueNoise = {
  id: 'valueNoise',
  label: 'Value',
  supports: {
    dims: [2, 3],
    tileable: true,
    fbm: true,
  },
  params: [
    {
      key: 'scale',
      label: 'Scale',
      type: 'number',
      min: 1,
      max: 64,
      step: 1,
      default: 4,
      hint: 'Noise cells across the texture. Integer scale = seamless when tileable.',
    },
  ],
  outputRange: [0, 1],
  create({ seed }) {
    const s = seed | 0
    return {
      sample2(x, y, period) {
        return valueNoise2(x, y, s, period)
      },
      sample3(x, y, z, period) {
        return valueNoise3(x, y, z, s, period)
      },
    }
  },
}

export default valueNoise
