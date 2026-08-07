import noise from '../lib/gustavson.js'

/** @type {import('../types.js').NoiseAlgorithm} */
const perlin = {
  id: 'perlin',
  label: 'Perlin',
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
  outputRange: [-1, 1],
  create({ seed }) {
    noise.seed(seed)

    return {
      sample2(x, y, period) {
        if (period != null) return noise.perlin2p(x, y, period)
        return noise.perlin2(x, y)
      },
      sample3(x, y, z, period) {
        if (period != null) return noise.perlin3p(x, y, z, period)
        return noise.perlin3(x, y, z)
      },
    }
  },
}

export default perlin
