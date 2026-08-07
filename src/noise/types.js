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
 * @property {{ dims: number[], tileable: boolean, fbm: boolean }} supports
 * @property {AlgorithmParam[]} params
 * @property {[number, number]} outputRange
 * @property {(ctx: { seed: number, params: Record<string, unknown> }) => NoiseSampler} create
 *
 * @typedef {Object} GenerateSettings
 * @property {string} algorithmId
 * @property {number} seed
 * @property {2|3} dimensions
 * @property {number} width
 * @property {number} height
 * @property {number} depth
 * @property {boolean} tileable
 * @property {boolean} useFbm
 * @property {number} octaves
 * @property {number} persistence
 * @property {number} lacunarity
 * @property {Record<string, unknown>} algorithmParams
 *
 * @typedef {Object} NoiseBuffer
 * @property {Float32Array} data values in [0, 1]
 * @property {number} width
 * @property {number} height
 * @property {number} depth
 * @property {2|3} dimensions
 */

export {}
