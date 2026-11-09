/**
 * @typedef {'number' | 'select' | 'boolean'} ParamType
 *
 * @typedef {Object} AlgorithmParam
 * @property {string} key
 * @property {string} label
 * @property {ParamType} type
 * @property {number} [min]
 * @property {number} [max]
 * @property {number} [step]
 * @property {string|number|boolean} default
 * @property {string} [hint]
 * @property {{ label: string, value: string|number }[]} [options]
 *
 * @typedef {Object} NoiseSampler
 * @property {(x: number, y: number, period?: number) => number} sample2
 * @property {(x: number, y: number, z: number, period?: number) => number} sample3
 *
 * @typedef {Object} NoiseAlgorithm
 * @property {string} id
 * @property {string} label
 * @property {{ dims: number[], tileable: boolean, fbm: boolean, bake?: boolean }} supports
 * @property {AlgorithmParam[]} params
 * @property {[number, number]} outputRange
 * @property {(ctx: { seed: number, params: Record<string, unknown> }) => NoiseSampler} create
 * @property {(ctx: {
 *   seed: number,
 *   params: Record<string, unknown>,
 *   width: number,
 *   height: number,
 *   depth: number,
 * }) => Float32Array} [bake]
 *   Optional whole-buffer generator (e.g. blue noise). Skips point sampling.
 *
 * @typedef {Object} ChannelSettings
 * @property {string} algorithmId
 * @property {number} seed
 * @property {boolean} invert
 * @property {'range' | 'minmax'} normalizeMode
 *   range = map via algorithm.outputRange;
 *   minmax = stretch that channel to [0, 1]
 * @property {boolean} useFbm
 * @property {number} octaves
 * @property {number} persistence
 * @property {number} lacunarity
 * @property {Record<string, unknown>} algorithmParams
 *
 * @typedef {'mono' | 'rgb'} PackingMode
 *
 * @typedef {Object} GenerateSettings
 * @property {PackingMode} packing
 * @property {2|3} dimensions
 * @property {number} width
 * @property {number} height
 * @property {number} depth
 * @property {boolean} tileable
 * @property {{ r: ChannelSettings, g: ChannelSettings, b: ChannelSettings }} channels
 *
 * @typedef {Object} NoiseBuffer
 * @property {Float32Array} data
 *   Planar [0,1] volumes. Mono: one volume. RGB: R then G then B, each W×H×D.
 * @property {number} width
 * @property {number} height
 * @property {number} depth
 * @property {2|3} dimensions
 * @property {1|3} channelCount
 */

export {}
