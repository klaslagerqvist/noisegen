/**
 * NoiseGen → Three.js cheat sheet
 * --------------------------------
 * Export from NoiseGen:  Export RAW (3D)
 * Filenames look like:
 *   noise-256x256x64-r8.raw    — Single packing (1 channel)
 *   noise-256x256x64-rgb8.raw  — RGB pack (3 channels)
 *
 * On-disk format:
 *   - R8:   1 byte per voxel (grayscale 0–255)
 *   - RGB8: 3 interleaved bytes per voxel (R,G,B), Z-major
 *   - Index: x + y * width + z * width * height  (× 3 for RGB8)
 *   - No header — size + format are in the filename (or pass dims yourself)
 *
 * GPU upload:
 *   - R8   → RedFormat (R8)
 *   - RGB8 → expanded to RGBA8 (A=255) then RGBAFormat
 *     Three.js / WebGL2 reject RGBFormat on Data3DTexture (texStorage3D).
 *     Sample .rgb in the shader; alpha is unused padding.
 *
 * Drop this file into a game project, or copy the bits you need.
 */

import {
  Data3DTexture,
  LinearFilter,
  NearestFilter,
  RedFormat,
  RGBAFormat,
  RepeatWrapping,
  UnsignedByteType,
} from 'three'

/**
 * Parse "…-256x256x64-r8.raw" / "…-rgb8.raw"
 * → { width, height, depth, format: 'r8' | 'rgb8' }
 */
export function parseNoiseRawFilename(urlOrName) {
  const name = String(urlOrName).split('/').pop()
  const match = name.match(/(\d+)x(\d+)x(\d+)(?:-(r8|rgb8))?/i)
  if (!match) {
    throw new Error(
      `Could not parse WxHxD from filename "${name}". Expected e.g. noise-256x256x64-r8.raw or …-rgb8.raw`,
    )
  }
  return {
    width: Number(match[1]),
    height: Number(match[2]),
    depth: Number(match[3]),
    format: /** @type {'r8' | 'rgb8'} */ ((match[4] || 'r8').toLowerCase()),
  }
}

/**
 * Expand interleaved RGB8 → RGBA8 (A = 255) for WebGL upload.
 *
 * @param {Uint8Array} rgb
 * @returns {Uint8Array}
 */
export function rgb8ToRgba8(rgb) {
  const voxels = (rgb.length / 3) | 0
  const rgba = new Uint8Array(voxels * 4)
  for (let i = 0, j = 0; i < voxels; i++, j += 4) {
    const k = i * 3
    rgba[j] = rgb[k]
    rgba[j + 1] = rgb[k + 1]
    rgba[j + 2] = rgb[k + 2]
    rgba[j + 3] = 255
  }
  return rgba
}

/**
 * Build a Data3DTexture from raw R8 or RGB8 bytes.
 *
 * @param {ArrayBuffer | Uint8Array} source
 * @param {{ width: number, height: number, depth: number, format?: 'r8' | 'rgb8' }} dims
 * @param {{ wrap?: boolean, filter?: 'linear' | 'nearest' }} [opts]
 */
export function createNoise3DTexture(source, dims, opts = {}) {
  const { width, height, depth, format = 'r8' } = dims
  const raw = source instanceof Uint8Array ? source : new Uint8Array(source)

  const fileChannels = format === 'rgb8' ? 3 : 1
  const expected = width * height * depth * fileChannels
  if (raw.byteLength !== expected) {
    throw new Error(
      `RAW size mismatch: got ${raw.byteLength} bytes, expected ${expected} (${width}x${height}x${depth} ${format})`,
    )
  }

  // RGB8 files are expanded to RGBA8 — Three.js Data3DTexture needs RGBAFormat.
  const data = format === 'rgb8' ? rgb8ToRgba8(raw) : raw
  const texture = new Data3DTexture(data, width, height, depth)
  texture.format = format === 'rgb8' ? RGBAFormat : RedFormat
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
 * const mono = await loadNoiseRaw3D('/textures/noise-256x256x64-r8.raw')
 * const pack = await loadNoiseRaw3D('/textures/noise-256x256x64-rgb8.raw')
 * material.uniforms.uNoise.value = pack
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
// // Single (R8) — sample .r
// const monoTex = await loadNoiseRaw3D('/textures/noise-256x256x64-r8.raw')
//
// // RGB pack file → uploaded as RGBA8; sample .rgb (A is unused)
// const packTex = await loadNoiseRaw3D('/textures/noise-256x256x64-rgb8.raw')
//
// const material = new THREE.ShaderMaterial({
//   uniforms: {
//     uNoise: { value: packTex },
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
//
//       // R8 mono:
//       // float n = texture(uNoise, uvw).r;
//
//       // RGB pack (GPU texture is RGBA8; A unused):
//       vec3 n = texture(uNoise, uvw).rgb;
//       float density = n.r * n.g; // example: combine Worley channels
//       float weather = n.b;
//
//       gl_FragColor = vec4(vec3(density * weather), 1.0);
//     }
//   `,
// })
