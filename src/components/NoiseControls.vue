<script setup>
import { computed, ref, watch } from 'vue'
import { listAlgorithms, getAlgorithm, defaultAlgorithmParams } from '../noise/registry.js'
import { createChannelSettings } from '../noise/channelDefaults.js'

const settings = defineModel({ type: Object, required: true })

const algorithms = listAlgorithms()
const activeChannelKey = ref('r')

const channelKeys = /** @type {const} */ (['r', 'g', 'b'])

const isRgb = computed(() => settings.value.packing === 'rgb')

const activeChannel = computed(() => {
  const key = isRgb.value ? activeChannelKey.value : 'r'
  return settings.value.channels[key]
})

const algorithm = computed(() => getAlgorithm(activeChannel.value?.algorithmId))

const showFbm = computed(
  () => algorithm.value?.supports.fbm && activeChannel.value?.useFbm,
)

const isBaked = computed(() => Boolean(algorithm.value?.supports.bake))

/** Algorithms that support the shared dimension. */
const availableAlgorithms = computed(() =>
  algorithms.filter((a) => {
    const full = getAlgorithm(a.id)
    return full?.supports.dims.includes(settings.value.dimensions)
  }),
)

/** Shared dimension options: intersection of used channel algorithms. */
const availableDims = computed(() => {
  const keys = isRgb.value ? channelKeys : ['r']
  /** @type {Set<number> | null} */
  let dims = null
  for (const key of keys) {
    const algo = getAlgorithm(settings.value.channels[key].algorithmId)
    if (!algo) continue
    const set = new Set(algo.supports.dims)
    dims = dims ? new Set([...dims].filter((d) => set.has(d))) : set
  }
  return dims && dims.size ? [...dims].sort() : [2]
})

const showTileable = computed(() => {
  const keys = isRgb.value ? channelKeys : ['r']
  return keys.some((key) => {
    const algo = getAlgorithm(settings.value.channels[key].algorithmId)
    return algo?.supports.tileable && !algo.supports.bake
  })
})

function onAlgorithmChange() {
  const ch = activeChannel.value
  const algo = getAlgorithm(ch.algorithmId)
  if (!algo) return
  ch.algorithmParams = defaultAlgorithmParams(algo)
  if (!algo.supports.fbm) ch.useFbm = false
  if (algo.supports.bake) settings.value.tileable = true
}

watch(
  () => settings.value.dimensions,
  (dims) => {
    const keys = isRgb.value ? channelKeys : ['r']
    for (const key of keys) {
      const ch = settings.value.channels[key]
      const algo = getAlgorithm(ch.algorithmId)
      if (algo && !algo.supports.dims.includes(dims)) {
        const fallback =
          availableAlgorithms.value[0]?.id ??
          algorithms.find((a) => getAlgorithm(a.id)?.supports.dims.includes(dims))?.id ??
          'perlin'
        Object.assign(ch, createChannelSettings(fallback, { seed: ch.seed }))
      }
    }
  },
)

watch(
  () => settings.value.packing,
  (packing) => {
    if (packing === 'mono') activeChannelKey.value = 'r'
  },
)

watch(availableDims, (dims) => {
  if (!dims.includes(settings.value.dimensions)) {
    settings.value.dimensions = /** @type {2|3} */ (dims[0])
  }
})

function randomizeSeed() {
  activeChannel.value.seed = Math.floor(Math.random() * 65536)
}

function randomizeAllSeeds() {
  for (const key of channelKeys) {
    settings.value.channels[key].seed = Math.floor(Math.random() * 65536)
  }
}

function formatParam(param) {
  const value = activeChannel.value.algorithmParams[param.key]
  if (typeof value === 'number' && param.step && param.step < 1) {
    return Number(value).toFixed(2)
  }
  return value
}
</script>

<template>
  <aside class="controls" v-if="algorithm && activeChannel">
    <header class="controls__header">
      <h1>NoiseGen</h1>
      <p>Pre-generate tileable noise textures for games.</p>
    </header>

    <section class="group">
      <h2>Output</h2>

      <fieldset class="segmented">
        <legend>Packing</legend>
        <label class="segmented__option">
          <input v-model="settings.packing" type="radio" value="mono" />
          <span>Single</span>
        </label>
        <label class="segmented__option">
          <input v-model="settings.packing" type="radio" value="rgb" />
          <span>RGB pack</span>
        </label>
      </fieldset>

      <p class="hint hint--info">
        <template v-if="isRgb">
          Independent noise per channel — one texture fetch in your shader.
        </template>
        <template v-else>
          Single-channel (R8) texture — sample <code>.r</code> in your shader.
        </template>
      </p>

      <label class="field">
        <span>Resolution</span>
        <select v-model.number="settings.width">
          <option :value="32">32 × 32</option>
          <option :value="64">64 × 64</option>
          <option :value="128">128 × 128</option>
          <option :value="256">256 × 256</option>
          <option :value="512">512 × 512</option>
          <option :value="1024">1024 × 1024</option>
        </select>
      </label>

      <fieldset class="segmented">
        <legend>Dimensions</legend>
        <label
          v-for="d in availableDims"
          :key="d"
          class="segmented__option"
        >
          <input v-model.number="settings.dimensions" type="radio" :value="d" />
          <span>{{ d }}D</span>
        </label>
      </fieldset>

      <label v-if="settings.dimensions === 3" class="field">
        <span>Depth (slices)</span>
        <select v-model.number="settings.depth">
          <option :value="16">16</option>
          <option :value="32">32</option>
          <option :value="64">64</option>
          <option :value="128">128</option>
        </select>
      </label>

      <label v-if="showTileable" class="field field--check">
        <input v-model="settings.tileable" type="checkbox" />
        <span>Tileable</span>
      </label>
    </section>

    <section class="group">
      <h2>{{ isRgb ? 'Channel' : 'Algorithm' }}</h2>

      <fieldset v-if="isRgb" class="segmented channel-tabs">
        <legend>Edit channel</legend>
        <label
          v-for="key in channelKeys"
          :key="key"
          class="segmented__option"
          :class="`channel-tabs__${key}`"
        >
          <input v-model="activeChannelKey" type="radio" :value="key" />
          <span>{{ key.toUpperCase() }}</span>
        </label>
      </fieldset>

      <label class="field">
        <span>Type</span>
        <select v-model="activeChannel.algorithmId" @change="onAlgorithmChange">
          <option v-for="a in availableAlgorithms" :key="a.id" :value="a.id">
            {{ a.label }}
          </option>
        </select>
      </label>

      <label class="field">
        <span>Seed</span>
        <div class="row">
          <input
            v-model.number="activeChannel.seed"
            type="number"
            min="0"
            max="65535"
            step="1"
          />
          <button type="button" class="btn btn--ghost" @click="randomizeSeed">
            Random
          </button>
        </div>
      </label>

      <button
        v-if="isRgb"
        type="button"
        class="btn btn--ghost btn--block"
        @click="randomizeAllSeeds"
      >
        Randomize all seeds
      </button>

      <p v-if="isBaked" class="hint hint--info">
        Void-and-cluster LUT — use 64×64 or 128×128 for dither textures. Larger
        sizes get slow.
      </p>

      <label class="field field--check">
        <input v-model="activeChannel.invert" type="checkbox" />
        <span>Invert</span>
      </label>

      <label class="field">
        <span>
          Normalize
          <em
            title="Range uses the algorithm’s declared output bounds. Min/max stretches this channel to fill 0–1 (better contrast for inverted Worley / clouds)."
            >?</em
          >
        </span>
        <select v-model="activeChannel.normalizeMode">
          <option value="range">Algorithm range</option>
          <option value="minmax">Min / max (volume)</option>
        </select>
      </label>
    </section>

    <section class="group">
      <h2>{{ algorithm.label }} params</h2>
      <label
        v-for="param in algorithm.params"
        :key="param.key"
        class="field"
      >
        <span>
          {{ param.label }}
          <em v-if="param.hint" :title="param.hint">?</em>
        </span>
        <input
          v-if="param.type === 'number'"
          v-model.number="activeChannel.algorithmParams[param.key]"
          type="range"
          :min="param.min"
          :max="param.max"
          :step="param.step ?? 1"
        />
        <output v-if="param.type === 'number'">
          {{ formatParam(param) }}
        </output>
        <select
          v-else-if="param.type === 'select'"
          v-model="activeChannel.algorithmParams[param.key]"
        >
          <option
            v-for="opt in param.options"
            :key="String(opt.value)"
            :value="opt.value"
          >
            {{ opt.label }}
          </option>
        </select>
      </label>
    </section>

    <section v-if="algorithm.supports.fbm" class="group">
      <h2>Fractal (FBM)</h2>
      <label class="field field--check">
        <input v-model="activeChannel.useFbm" type="checkbox" />
        <span>Enable octaves</span>
      </label>

      <template v-if="showFbm">
        <label class="field">
          <span>Octaves</span>
          <input
            v-model.number="activeChannel.octaves"
            type="range"
            min="1"
            max="8"
            step="1"
          />
          <output>{{ activeChannel.octaves }}</output>
        </label>
        <label class="field">
          <span>Persistence</span>
          <input
            v-model.number="activeChannel.persistence"
            type="range"
            min="0.1"
            max="1"
            step="0.05"
          />
          <output>{{ activeChannel.persistence.toFixed(2) }}</output>
        </label>
        <label class="field">
          <span>Lacunarity</span>
          <input
            v-model.number="activeChannel.lacunarity"
            type="range"
            min="1.5"
            max="4"
            step="0.5"
          />
          <output>{{ activeChannel.lacunarity }}</output>
        </label>
        <p v-if="settings.tileable && activeChannel.lacunarity % 1 !== 0" class="hint">
          Non-integer lacunarity can break tiling on higher octaves.
        </p>
      </template>
    </section>
  </aside>
</template>

<style scoped>
.controls {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding: 1.5rem;
  overflow-y: auto;
  height: 100%;
  box-sizing: border-box;
  text-align: left;
}

.controls__header h1 {
  font-family: var(--display);
  font-size: 1.75rem;
  font-weight: 700;
  letter-spacing: -0.04em;
  margin: 0 0 0.35rem;
  color: var(--text-h);
}

.controls__header p {
  margin: 0;
  font-size: 0.875rem;
  color: var(--text);
  line-height: 1.4;
}

.group {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border);
}

.group h2 {
  font-family: var(--display);
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  margin: 0;
  color: var(--muted);
}

.field {
  display: grid;
  gap: 0.35rem;
  font-size: 0.875rem;
  color: var(--text-h);
}

.field > span {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.field em {
  font-style: normal;
  font-size: 0.7rem;
  width: 1rem;
  height: 1rem;
  display: inline-grid;
  place-items: center;
  border-radius: 50%;
  background: var(--border);
  color: var(--muted);
  cursor: help;
}

.field--check {
  grid-template-columns: auto 1fr;
  align-items: center;
  gap: 0.5rem;
}

.field input[type='number'],
.field select {
  width: 100%;
  box-sizing: border-box;
  padding: 0.45rem 0.6rem;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--panel-2);
  color: var(--text-h);
  font: inherit;
}

.field input[type='range'] {
  width: 100%;
  accent-color: var(--accent);
}

.field output {
  font-family: var(--mono);
  font-size: 0.8rem;
  color: var(--muted);
}

.row {
  display: flex;
  gap: 0.5rem;
}

.row input {
  flex: 1;
}

.segmented {
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 0.35rem;
  margin: 0;
  display: flex;
  gap: 0.25rem;
  background: var(--panel-2);
}

.segmented legend {
  padding: 0 0.35rem;
  font-size: 0.75rem;
  color: var(--muted);
}

.segmented__option {
  flex: 1;
  cursor: pointer;
}

.segmented__option input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.segmented__option span {
  display: block;
  text-align: center;
  padding: 0.4rem;
  border-radius: 6px;
  font-size: 0.85rem;
  color: var(--text);
  transition: background 0.15s, color 0.15s;
}

.segmented__option input:checked + span {
  background: var(--accent);
  color: var(--accent-contrast);
  font-weight: 600;
}

.channel-tabs__r input:checked + span {
  background: #c45c5c;
  color: #1a0808;
}

.channel-tabs__g input:checked + span {
  background: #5cad6e;
  color: #08140c;
}

.channel-tabs__b input:checked + span {
  background: #5c7ec4;
  color: #080e1a;
}

.btn {
  border: none;
  border-radius: 6px;
  padding: 0.45rem 0.75rem;
  font: inherit;
  font-size: 0.8rem;
  cursor: pointer;
}

.btn--ghost {
  background: var(--panel-2);
  color: var(--text-h);
  border: 1px solid var(--border);
}

.btn--ghost:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.btn--block {
  width: 100%;
}

.hint {
  margin: 0;
  font-size: 0.75rem;
  color: var(--warn);
  line-height: 1.35;
}

.hint--info {
  color: var(--muted);
}

.hint code {
  font-family: var(--mono);
  font-size: 0.7rem;
}
</style>
