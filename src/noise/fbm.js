/**
 * Fractal Brownian Motion over a noise sampler.
 * When `period` is set, each octave uses period * frequency so seams stay aligned
 * (requires integer lacunarity, typically 2).
 *
 * @param {import('./types.js').NoiseSampler} sampler
 * @param {number} x
 * @param {number} y
 * @param {number} z
 * @param {2|3} dimensions
 * @param {{ octaves: number, persistence: number, lacunarity: number, period?: number }} opts
 */
export function fbm(sampler, x, y, z, dimensions, opts) {
  const { octaves, persistence, lacunarity, period } = opts
  let total = 0
  let amplitude = 1
  let frequency = 1
  let maxAmp = 0

  for (let i = 0; i < octaves; i++) {
    const px = x * frequency
    const py = y * frequency
    const pz = z * frequency
    const octavePeriod =
      period != null ? Math.round(period * frequency) : undefined

    const value =
      dimensions === 3
        ? sampler.sample3(px, py, pz, octavePeriod)
        : sampler.sample2(px, py, octavePeriod)

    total += value * amplitude
    maxAmp += amplitude
    amplitude *= persistence
    frequency *= lacunarity
  }

  return maxAmp > 0 ? total / maxAmp : 0
}
