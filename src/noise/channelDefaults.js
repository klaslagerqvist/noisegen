import { getAlgorithm, defaultAlgorithmParams } from './registry.js'

/**
 * @param {string} [algorithmId]
 * @param {Partial<import('./types.js').ChannelSettings>} [overrides]
 * @returns {import('./types.js').ChannelSettings}
 */
export function createChannelSettings(algorithmId = 'perlin', overrides = {}) {
  const algorithm = getAlgorithm(algorithmId) ?? getAlgorithm('perlin')
  const { algorithmParams: paramOverrides, ...rest } = overrides
  return {
    algorithmId: algorithm.id,
    seed: 42,
    invert: false,
    normalizeMode: 'range',
    useFbm: Boolean(algorithm.supports.fbm),
    octaves: 4,
    persistence: 0.5,
    lacunarity: 2,
    ...rest,
    algorithmParams: {
      ...defaultAlgorithmParams(algorithm),
      ...(paramOverrides ?? {}),
    },
  }
}

/**
 * Defaults aimed at a cloud-style RGB pack: Worley / Worley / Perlin.
 * @returns {{ r: import('./types.js').ChannelSettings, g: import('./types.js').ChannelSettings, b: import('./types.js').ChannelSettings }}
 */
export function createDefaultChannels() {
  return {
    r: createChannelSettings('worley', {
      seed: 42,
      invert: true,
      normalizeMode: 'minmax',
      useFbm: true,
      algorithmParams: { scale: 4 },
    }),
    g: createChannelSettings('worley', {
      seed: 1337,
      invert: true,
      normalizeMode: 'minmax',
      useFbm: true,
      algorithmParams: { scale: 8 },
    }),
    b: createChannelSettings('perlin', {
      seed: 7,
      invert: false,
      normalizeMode: 'range',
      useFbm: true,
      algorithmParams: { scale: 2 },
    }),
  }
}
