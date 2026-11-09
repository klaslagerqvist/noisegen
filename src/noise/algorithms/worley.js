import { positiveMod, hash2, hash3 } from '../lib/hash.js'

function dist2(dx, dy, metric) {
  const ax = Math.abs(dx)
  const ay = Math.abs(dy)
  if (metric === 'manhattan') return ax + ay
  if (metric === 'chebyshev') return Math.max(ax, ay)
  return Math.sqrt(ax * ax + ay * ay)
}

function dist3(dx, dy, dz, metric) {
  const ax = Math.abs(dx)
  const ay = Math.abs(dy)
  const az = Math.abs(dz)
  if (metric === 'manhattan') return ax + ay + az
  if (metric === 'chebyshev') return Math.max(ax, ay, az)
  return Math.sqrt(ax * ax + ay * ay + az * az)
}

/**
 * Soft max for mapping distances into ~[0, 1].
 * Uses ~half a cell (typical F1 ceiling) rather than the full cell diagonal,
 * so Algorithm-range output fills more of [0, 1] without a volume min/max pass.
 */
function maxDist(metric, dimensions) {
  if (metric === 'manhattan') return dimensions === 3 ? 1.5 : 1
  if (metric === 'chebyshev') return 0.5
  return dimensions === 3 ? Math.sqrt(3) * 0.5 : Math.SQRT2 * 0.5
}

/**
 * @param {number} d1
 * @param {number} d2
 * @param {string} feature
 * @param {string} metric
 * @param {2|3} dimensions
 */
function finalize(d1, d2, feature, metric, dimensions) {
  const max = maxDist(metric, dimensions)
  let v
  if (feature === 'f2') v = d2 / max
  else if (feature === 'f2-f1') v = (d2 - d1) / max
  else v = d1 / max
  return Math.min(1, Math.max(0, v))
}

/**
 * @param {number} x
 * @param {number} y
 * @param {number} seed
 * @param {number} jitter
 * @param {string} metric
 * @param {string} feature
 * @param {number} [period]
 */
function worley2(x, y, seed, jitter, metric, feature, period) {
  const xi = Math.floor(x)
  const yi = Math.floor(y)

  let f1 = Infinity
  let f2 = Infinity

  for (let oy = -1; oy <= 1; oy++) {
    for (let ox = -1; ox <= 1; ox++) {
      const cx = xi + ox
      const cy = yi + oy
      const hx = period != null ? positiveMod(cx, period) : cx
      const hy = period != null ? positiveMod(cy, period) : cy

      const rx = hash2(hx, hy, seed)
      const ry = hash2(hx, hy, seed + 1013)
      const px = cx + 0.5 + (rx - 0.5) * jitter
      const py = cy + 0.5 + (ry - 0.5) * jitter

      const d = dist2(px - x, py - y, metric)
      if (d < f1) {
        f2 = f1
        f1 = d
      } else if (d < f2) {
        f2 = d
      }
    }
  }

  return finalize(f1, f2, feature, metric, 2)
}

/**
 * @param {number} x
 * @param {number} y
 * @param {number} z
 * @param {number} seed
 * @param {number} jitter
 * @param {string} metric
 * @param {string} feature
 * @param {number} [period]
 */
function worley3(x, y, z, seed, jitter, metric, feature, period) {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const zi = Math.floor(z)

  let f1 = Infinity
  let f2 = Infinity

  for (let oz = -1; oz <= 1; oz++) {
    for (let oy = -1; oy <= 1; oy++) {
      for (let ox = -1; ox <= 1; ox++) {
        const cx = xi + ox
        const cy = yi + oy
        const cz = zi + oz
        const hx = period != null ? positiveMod(cx, period) : cx
        const hy = period != null ? positiveMod(cy, period) : cy
        const hz = period != null ? positiveMod(cz, period) : cz

        const rx = hash3(hx, hy, hz, seed)
        const ry = hash3(hx, hy, hz, seed + 1013)
        const rz = hash3(hx, hy, hz, seed + 2027)
        const px = cx + 0.5 + (rx - 0.5) * jitter
        const py = cy + 0.5 + (ry - 0.5) * jitter
        const pz = cz + 0.5 + (rz - 0.5) * jitter

        const d = dist3(px - x, py - y, pz - z, metric)
        if (d < f1) {
          f2 = f1
          f1 = d
        } else if (d < f2) {
          f2 = d
        }
      }
    }
  }

  return finalize(f1, f2, feature, metric, 3)
}

/** @type {import('../types.js').NoiseAlgorithm} */
const worley = {
  id: 'worley',
  label: 'Worley',
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
      default: 6,
      hint: 'Cells across the texture. Integer scale = seamless when tileable.',
    },
    {
      key: 'jitter',
      label: 'Jitter',
      type: 'number',
      min: 0,
      max: 1,
      step: 0.05,
      default: 1,
      hint: '0 = points at cell centers, 1 = fully random in each cell.',
    },
    {
      key: 'distance',
      label: 'Distance',
      type: 'select',
      default: 'euclidean',
      options: [
        { label: 'Euclidean', value: 'euclidean' },
        { label: 'Manhattan', value: 'manhattan' },
        { label: 'Chebyshev', value: 'chebyshev' },
      ],
    },
    {
      key: 'feature',
      label: 'Feature',
      type: 'select',
      default: 'f1',
      hint: 'F1 = nearest point. F2−F1 = cell edges. Invert F1 for cloud-like blobs.',
      options: [
        { label: 'F1 (nearest)', value: 'f1' },
        { label: 'F2 (2nd nearest)', value: 'f2' },
        { label: 'F2 − F1 (edges)', value: 'f2-f1' },
      ],
    },
  ],
  outputRange: [0, 1],
  create({ seed, params }) {
    const jitter = Number(params.jitter ?? 1)
    const metric = String(params.distance ?? 'euclidean')
    const feature = String(params.feature ?? 'f1')
    const s = seed | 0

    return {
      sample2(x, y, period) {
        return worley2(x, y, s, jitter, metric, feature, period)
      },
      sample3(x, y, z, period) {
        return worley3(x, y, z, s, jitter, metric, feature, period)
      },
    }
  },
}

export default worley
