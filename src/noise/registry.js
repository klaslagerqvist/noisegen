import perlin from './algorithms/perlin.js'
import worley from './algorithms/worley.js'

/** @type {import('./types.js').NoiseAlgorithm[]} */
const algorithms = [perlin, worley]

/**
 * @param {string} id
 * @returns {import('./types.js').NoiseAlgorithm | undefined}
 */
export function getAlgorithm(id) {
  return algorithms.find((a) => a.id === id)
}

export function listAlgorithms() {
  return algorithms.map(({ id, label, supports }) => ({ id, label, supports }))
}

/**
 * @param {import('./types.js').NoiseAlgorithm} algorithm
 */
export function defaultAlgorithmParams(algorithm) {
  /** @type {Record<string, unknown>} */
  const params = {}
  for (const p of algorithm.params) {
    params[p.key] = p.default
  }
  return params
}

export { algorithms }
