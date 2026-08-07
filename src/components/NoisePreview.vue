<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import * as THREE from 'three'
import { bufferToRgba } from '../noise/generate.js'
import { downloadPng } from '../noise/exportPng.js'
import { exportRaw3d } from '../noise/exportRaw.js'

const props = defineProps({
  buffer: {
    type: Object,
    default: null,
  },
  generating: {
    type: Boolean,
    default: false,
  },
})

const host = ref(null)
const sliceZ = ref(0)
const showTiling = ref(false)

let renderer
let scene
let camera
let mesh
let texture
let animId = 0

function initThree() {
  const el = host.value
  if (!el) return

  const width = el.clientWidth
  const height = el.clientHeight

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(width, height)
  el.appendChild(renderer.domElement)

  scene = new THREE.Scene()
  camera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, 0.1, 10)
  camera.position.z = 1

  const geo = new THREE.PlaneGeometry(1, 1)
  const mat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    toneMapped: false,
  })
  mesh = new THREE.Mesh(geo, mat)
  scene.add(mesh)

  const empty = new Uint8Array([40, 40, 44, 255])
  texture = new THREE.DataTexture(empty, 1, 1, THREE.RGBAFormat)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.magFilter = THREE.NearestFilter
  texture.minFilter = THREE.NearestFilter
  texture.needsUpdate = true
  mat.map = texture

  const loop = () => {
    animId = requestAnimationFrame(loop)
    renderer.render(scene, camera)
  }
  loop()
}

function resize() {
  if (!host.value || !renderer || !camera) return
  const w = host.value.clientWidth
  const h = host.value.clientHeight
  if (w === 0 || h === 0) return

  renderer.setSize(w, h)

  const aspect = w / h
  const view = 0.55
  if (aspect > 1) {
    camera.left = -view * aspect
    camera.right = view * aspect
    camera.top = view
    camera.bottom = -view
  } else {
    camera.left = -view
    camera.right = view
    camera.top = view / aspect
    camera.bottom = -view / aspect
  }
  camera.updateProjectionMatrix()
}

function updateTexture() {
  if (!props.buffer || !texture || !mesh) return

  const { width, height, depth } = props.buffer
  if (sliceZ.value >= depth) sliceZ.value = Math.max(0, depth - 1)

  const rgba = bufferToRgba(props.buffer, sliceZ.value)

  texture.dispose()
  texture = new THREE.DataTexture(rgba, width, height, THREE.RGBAFormat)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.magFilter = THREE.NearestFilter
  texture.minFilter = THREE.NearestFilter
  texture.wrapS = showTiling.value ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping
  texture.wrapT = showTiling.value ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping
  texture.repeat.set(showTiling.value ? 2 : 1, showTiling.value ? 2 : 1)
  texture.needsUpdate = true
  mesh.material.map = texture
  mesh.material.needsUpdate = true
  resize()
}

function exportCurrent() {
  if (!props.buffer) return
  const rgba = bufferToRgba(props.buffer, sliceZ.value)
  const { width, height, dimensions } = props.buffer
  const sliceTag = dimensions === 3 ? `-z${sliceZ.value}` : ''
  downloadPng(rgba, width, height, `noise-${width}x${height}${sliceTag}.png`)
}

function exportVolumeRaw() {
  if (!props.buffer || props.buffer.dimensions !== 3) return
  exportRaw3d(props.buffer)
}

function onResize() {
  resize()
}

watch(
  () => props.buffer,
  () => {
    sliceZ.value = 0
    updateTexture()
  },
)

watch(sliceZ, updateTexture)
watch(showTiling, updateTexture)

onMounted(() => {
  initThree()
  window.addEventListener('resize', onResize)
  updateTexture()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  cancelAnimationFrame(animId)
  texture?.dispose()
  mesh?.geometry.dispose()
  mesh?.material.dispose()
  renderer?.dispose()
  if (renderer?.domElement?.parentNode) {
    renderer.domElement.parentNode.removeChild(renderer.domElement)
  }
})
</script>

<template>
  <div class="preview">
    <div class="preview__toolbar">
      <label v-if="buffer?.dimensions === 3" class="slice">
        <span>Z slice</span>
        <input
          v-model.number="sliceZ"
          type="range"
          min="0"
          :max="Math.max(0, (buffer?.depth ?? 1) - 1)"
          step="1"
        />
        <output>{{ sliceZ }} / {{ (buffer?.depth ?? 1) - 1 }}</output>
      </label>

      <label class="check">
        <input v-model="showTiling" type="checkbox" />
        <span>Preview 2×2 tiling</span>
      </label>

      <div class="export-actions">
        <button
          type="button"
          class="btn"
          :disabled="!buffer || generating"
          @click="exportCurrent"
        >
          Export PNG
        </button>
        <button
          v-if="buffer?.dimensions === 3"
          type="button"
          class="btn btn--secondary"
          :disabled="!buffer || generating"
          title="R8 volume, Z-major slices — dims are in the filename"
          @click="exportVolumeRaw"
        >
          Export RAW (3D)
        </button>
      </div>
    </div>

    <div ref="host" class="preview__canvas">
      <div v-if="generating" class="preview__overlay">Generating…</div>
    </div>

    <p v-if="buffer" class="preview__meta">
      {{ buffer.width }}×{{ buffer.height
      }}<template v-if="buffer.dimensions === 3">×{{ buffer.depth }}</template>
      · {{ buffer.dimensions }}D
    </p>
  </div>
</template>

<style scoped>
.preview {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background:
    radial-gradient(ellipse 80% 60% at 50% 40%, #2a2d36 0%, transparent 70%),
    linear-gradient(160deg, #1a1c22 0%, #12131a 50%, #0e1014 100%);
}

.preview__toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1rem;
  padding: 0.85rem 1.25rem;
  border-bottom: 1px solid var(--border);
  background: rgba(18, 19, 26, 0.85);
  backdrop-filter: blur(8px);
}

.slice {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  color: var(--text);
  flex: 1;
  min-width: 180px;
}

.slice input {
  flex: 1;
  accent-color: var(--accent);
}

.slice output {
  font-family: var(--mono);
  font-size: 0.75rem;
  color: var(--muted);
  min-width: 4rem;
}

.check {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.8rem;
  color: var(--text);
  cursor: pointer;
}

.export-actions {
  margin-left: auto;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.btn {
  border: none;
  border-radius: 6px;
  padding: 0.5rem 1rem;
  font: inherit;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  background: var(--accent);
  color: var(--accent-contrast);
}

.btn--secondary {
  background: var(--panel-2);
  color: var(--text-h);
  border: 1px solid var(--border);
}

.btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn:not(:disabled):hover {
  filter: brightness(1.08);
}

.btn--secondary:not(:disabled):hover {
  border-color: var(--accent);
  color: var(--accent);
  filter: none;
}

.preview__canvas {
  position: relative;
  flex: 1;
  min-height: 280px;
}

.preview__canvas :deep(canvas) {
  display: block;
  width: 100% !important;
  height: 100% !important;
}

.preview__overlay {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  background: rgba(10, 12, 16, 0.55);
  color: var(--text-h);
  font-family: var(--display);
  letter-spacing: 0.04em;
  z-index: 2;
}

.preview__meta {
  margin: 0;
  padding: 0.6rem 1.25rem;
  font-family: var(--mono);
  font-size: 0.75rem;
  color: var(--muted);
  border-top: 1px solid var(--border);
}
</style>
