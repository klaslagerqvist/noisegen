<script setup>
import { computed, watch } from 'vue'
import { listAlgorithms, getAlgorithm, defaultAlgorithmParams } from '../noise/registry.js'

const settings = defineModel({ type: Object, required: true })

const algorithms = listAlgorithms()

const algorithm = computed(() => getAlgorithm(settings.value.algorithmId))

const showFbm = computed(
  () => algorithm.value?.supports.fbm && settings.value.useFbm,
)

watch(
  () => settings.value.algorithmId,
  (id) => {
    const algo = getAlgorithm(id)
    if (!algo) return
    settings.value.algorithmParams = defaultAlgorithmParams(algo)
    if (!algo.supports.fbm) settings.value.useFbm = false
    if (!algo.supports.dims.includes(settings.value.dimensions)) {
      settings.value.dimensions = algo.supports.dims[0]
    }
  },
)

function randomizeSeed() {
  settings.value.seed = Math.floor(Math.random() * 65536)
}
</script>

<template>
  <aside class="controls" v-if="algorithm">
    <header class="controls__header">
      <h1>NoiseGen</h1>
      <p>Pre-generate tileable noise textures for games.</p>
    </header>

    <section class="group">
      <h2>Algorithm</h2>
      <label class="field">
        <span>Type</span>
        <select v-model="settings.algorithmId">
          <option v-for="a in algorithms" :key="a.id" :value="a.id">
            {{ a.label }}
          </option>
        </select>
      </label>

      <label class="field">
        <span>Seed</span>
        <div class="row">
          <input v-model.number="settings.seed" type="number" min="0" max="65535" step="1" />
          <button type="button" class="btn btn--ghost" @click="randomizeSeed">
            Random
          </button>
        </div>
      </label>

      <fieldset class="segmented">
        <legend>Dimensions</legend>
        <label
          v-for="d in algorithm.supports.dims"
          :key="d"
          class="segmented__option"
        >
          <input v-model.number="settings.dimensions" type="radio" :value="d" />
          <span>{{ d }}D</span>
        </label>
      </fieldset>
    </section>

    <section class="group">
      <h2>Output</h2>
      <label class="field">
        <span>Resolution</span>
        <select v-model.number="settings.width">
          <option :value="128">128 × 128</option>
          <option :value="256">256 × 256</option>
          <option :value="512">512 × 512</option>
          <option :value="1024">1024 × 1024</option>
        </select>
      </label>

      <label v-if="settings.dimensions === 3" class="field">
        <span>Depth (slices)</span>
        <select v-model.number="settings.depth">
          <option :value="16">16</option>
          <option :value="32">32</option>
          <option :value="64">64</option>
          <option :value="128">128</option>
        </select>
      </label>

      <label v-if="algorithm.supports.tileable" class="field field--check">
        <input v-model="settings.tileable" type="checkbox" />
        <span>Tileable</span>
      </label>

      <label class="field field--check">
        <input v-model="settings.invert" type="checkbox" />
        <span>Invert</span>
      </label>

      <label class="field">
        <span>
          Normalize
          <em
            title="Range uses the algorithm’s declared output bounds. Min/max stretches the finished texture to fill 0–1 (better contrast for inverted Worley / clouds)."
            >?</em
          >
        </span>
        <select v-model="settings.normalizeMode">
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
          v-model.number="settings.algorithmParams[param.key]"
          type="range"
          :min="param.min"
          :max="param.max"
          :step="param.step ?? 1"
        />
        <output v-if="param.type === 'number'">
          {{
            typeof settings.algorithmParams[param.key] === 'number' &&
            param.step &&
            param.step < 1
              ? Number(settings.algorithmParams[param.key]).toFixed(2)
              : settings.algorithmParams[param.key]
          }}
        </output>
        <select
          v-else-if="param.type === 'select'"
          v-model="settings.algorithmParams[param.key]"
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
        <input v-model="settings.useFbm" type="checkbox" />
        <span>Enable octaves</span>
      </label>

      <template v-if="showFbm">
        <label class="field">
          <span>Octaves</span>
          <input
            v-model.number="settings.octaves"
            type="range"
            min="1"
            max="8"
            step="1"
          />
          <output>{{ settings.octaves }}</output>
        </label>
        <label class="field">
          <span>Persistence</span>
          <input
            v-model.number="settings.persistence"
            type="range"
            min="0.1"
            max="1"
            step="0.05"
          />
          <output>{{ settings.persistence.toFixed(2) }}</output>
        </label>
        <label class="field">
          <span>Lacunarity</span>
          <input
            v-model.number="settings.lacunarity"
            type="range"
            min="1.5"
            max="4"
            step="0.5"
          />
          <output>{{ settings.lacunarity }}</output>
        </label>
        <p v-if="settings.tileable && settings.lacunarity % 1 !== 0" class="hint">
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

.hint {
  margin: 0;
  font-size: 0.75rem;
  color: var(--warn);
  line-height: 1.35;
}
</style>
