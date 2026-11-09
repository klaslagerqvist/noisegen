<script setup>
import { reactive, ref, watch } from 'vue'
import NoiseControls from './components/NoiseControls.vue'
import NoisePreview from './components/NoisePreview.vue'
import { createChannelSettings, createDefaultChannels } from './noise/channelDefaults.js'
import { generateNoise } from './noise/generate.js'

const defaults = createDefaultChannels()

const settings = reactive({
  packing: 'mono',
  dimensions: 2,
  width: 256,
  depth: 64,
  tileable: true,
  channels: {
    r: createChannelSettings('perlin', {
      seed: 42,
      useFbm: true,
      octaves: 4,
      persistence: 0.5,
      lacunarity: 2,
    }),
    g: defaults.g,
    b: defaults.b,
  },
})

const buffer = ref(null)
const generating = ref(false)

let debounceTimer = 0
let genToken = 0

async function regenerate() {
  const token = ++genToken
  generating.value = true

  // Let the overlay paint before the heavy loop
  await new Promise((r) => setTimeout(r, 16))
  if (token !== genToken) return

  try {
    const result = generateNoise({
      packing: settings.packing,
      dimensions: settings.dimensions,
      width: settings.width,
      height: settings.width,
      depth: settings.depth,
      tileable: settings.tileable,
      channels: {
        r: {
          ...settings.channels.r,
          algorithmParams: { ...settings.channels.r.algorithmParams },
        },
        g: {
          ...settings.channels.g,
          algorithmParams: { ...settings.channels.g.algorithmParams },
        },
        b: {
          ...settings.channels.b,
          algorithmParams: { ...settings.channels.b.algorithmParams },
        },
      },
    })
    if (token !== genToken) return
    buffer.value = result
  } catch (err) {
    console.error(err)
  } finally {
    if (token === genToken) generating.value = false
  }
}

function scheduleGenerate() {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(regenerate, 120)
}

watch(settings, scheduleGenerate, { deep: true, immediate: true })
</script>

<template>
  <div class="app">
    <NoiseControls v-model="settings" class="app__sidebar" />
    <main class="app__main">
      <NoisePreview :buffer="buffer" :generating="generating" />
    </main>
  </div>
</template>

<style scoped>
.app {
  display: grid;
  grid-template-columns: minmax(260px, 320px) 1fr;
  width: 100%;
  height: 100svh;
  min-height: 100svh;
  overflow: hidden;
}

.app__sidebar {
  border-right: 1px solid var(--border);
  background: var(--panel);
}

.app__main {
  min-width: 0;
  min-height: 0;
}

@media (max-width: 800px) {
  .app {
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr;
    height: auto;
    min-height: 100svh;
    overflow: visible;
  }

  .app__sidebar {
    border-right: none;
    border-bottom: 1px solid var(--border);
    height: auto;
    max-height: none;
  }

  .app__main {
    min-height: 60svh;
  }
}
</style>
