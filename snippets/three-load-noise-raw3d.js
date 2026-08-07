/**
 * NoiseGen → Three.js cheat sheet
 * --------------------------------
 * Export from NoiseGen:  Export RAW (3D)
 * Filename looks like:   noise-256x256x64-r8.raw
 *
 * Format:
 *   - 1 byte per voxel (R8 / grayscale 0–255)
 *   - Z-major slices: index = x + y * width + z * width * height
 *   - No header — size is in the filename (or pass dims yourself)
 *
 * Drop this file into a game project, or copy the bits you need.
 */

import {
  Data3DTexture,
  LinearFilter,
  NearestFilter,
  RedFormat,
  RepeatWrapping,
  UnsignedByteType,
} from 'three'

/**
 * Parse "…-256x256x64-r8.raw" → { width, height, depth }
 */
export function parseNoiseRawFilename(urlOrName) {
  const name = String(urlOrName).split('/').pop()
  const match = name.match(/(\d+)x(\d+)x(\d+)/i)
  if (!match) {
    throw new Error(
      `Could not parse WxHxD from filename "${name}". Expected e.g. noise-256x256x64-r8.raw`,
    )
  }
  return {
    width: Number(match[1]),
    height: Number(match[2]),
    depth: Number(match[3]),
  }
}

/**
 * Build a Data3DTexture from raw R8 bytes.
 *
 * @param {ArrayBuffer | Uint8Array} source
 * @param {{ width: number, height: number, depth: number }} dims
 * @param {{ wrap?: boolean, filter?: 'linear' | 'nearest' }} [opts]
 */
export function createNoise3DTexture(source, dims, opts = {}) {
  const { width, height, depth } = dims
  const data =
    source instanceof Uint8Array ? source : new Uint8Array(source)

  const expected = width * height * depth
  if (data.byteLength !== expected) {
    throw new Error(
      `RAW size mismatch: got ${data.byteLength} bytes, expected ${expected} (${width}x${height}x${depth})`,
    )
  }

  const texture = new Data3DTexture(data, width, height, depth)
  texture.format = RedFormat
  texture.type = UnsignedByteType
  texture.unpackAlignment = 1

  const wrap = opts.wrap !== false // default: repeat (tileable exports)
  const wrapping = wrap ? RepeatWrapping : texture.wrapS
  texture.wrapS = wrapping
  texture.wrapT = wrapping
  texture.wrapR = wrapping

  const filter = opts.filter === 'nearest' ? NearestFilter : LinearFilter
  texture.magFilter = filter
  texture.minFilter = filter
  texture.needsUpdate = true

  return texture
}

/**
 * Fetch a NoiseGen .raw file and return a ready-to-use Data3DTexture.
 *
 * @example
 * const noiseTex = await loadNoiseRaw3D('/textures/noise-256x256x64-r8.raw')
 * material.uniforms.uNoise.value = noiseTex
 */
export async function loadNoiseRaw3D(url, opts = {}) {
  const dims = opts.dims ?? parseNoiseRawFilename(url)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`)
  const buffer = await res.arrayBuffer()
  return createNoise3DTexture(buffer, dims, opts)
}

// ---------------------------------------------------------------------------
// Example: ShaderMaterial (copy into your game)
// ---------------------------------------------------------------------------
//
// import * as THREE from 'three'
// import { loadNoiseRaw3D } from './three-load-noise-raw3d.js'
//
// const noiseTex = await loadNoiseRaw3D('/textures/noise-256x256x64-r8.raw')
//
// const material = new THREE.ShaderMaterial({
//   uniforms: {
//     uNoise: { value: noiseTex },
//     uTime: { value: 0 },
//   },
//   vertexShader: `
//     varying vec3 vWorldPos;
//     void main() {
//       vec4 world = modelMatrix * vec4(position, 1.0);
//       vWorldPos = world.xyz;
//       gl_Position = projectionMatrix * viewMatrix * world;
//     }
//   `,
//   fragmentShader: `
//     precision highp sampler3D;
//
//     uniform sampler3D uNoise;
//     uniform float uTime;
//     varying vec3 vWorldPos;
//
//     void main() {
//       vec3 uvw = vWorldPos * 0.05 + vec3(0.0, 0.0, uTime * 0.02);
//       float n = texture(uNoise, uvw).r;
//       gl_FragColor = vec4(vec3(n), 1.0);
//     }
//   `,
// })

