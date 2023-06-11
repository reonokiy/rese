<script lang="ts" setup>
// Element Bindings
const imgUploadRef = ref<HTMLInputElement | null>(null)
const mapAreaRef = ref<HTMLDivElement | null>(null)
const mapCanvasRef = ref<HTMLCanvasElement | null>(null)

// Element Refs
const { width, height } = useWindowSize()
const { x: mouseX, y: mouseY, sourceType: mouseSourceType } = useMouse()
const { pressed: mousePressed } = useMousePressed()

// Reactive Styles
const expandSidePanel = ref(false)
const onHighlight = ref(false)

// Data
const mapCanvas = new MapCanvas(mapCanvasRef)

// Lambda Functions
const highlight = () => onHighlight.value && mapCanvas.highlight(mouseX.value, mouseY.value)

useResizeObserver(mapAreaRef, () => {
  mapCanvas.resize(width.value, height.value)
})

// watch Mouse Move
watch([mouseX, mouseY], ([x, y], [ox, oy]) => {
  if (mousePressed.value)
    mapCanvas.move(ox - x, oy - y)
})

// Highlight Mouse Position
watch([mouseX, mouseY], ([x, y]) => {
  mapCanvas.render()
  highlight()
})

onMounted(() => {
  // use Mouse Wheel to Zoom
  mapAreaRef.value?.addEventListener('wheel', (e) => {
    e.preventDefault()
    mapCanvas.zoom(-e.deltaY)
    highlight()
  })
})

async function loadImageFromFileSystem() {
  const file = imgUploadRef.value?.files?.[0]
  if (file) {
    await mapCanvas.loadImageFromFileSystem(file)
    mapCanvas.render()
  }
}
</script>

<template>
  <div ref="mapAreaRef" class="map-area" h-full w-full>
    <canvas ref="mapCanvasRef" class="map-canvas" h-full w-full />
  </div>

  <div class="side-panel" :class="[expandSidePanel ? 'w-100' : 'w-14']" fixed bottom-4 right-4 top-4 flex="~ row-reverse" border rounded-xl bg-light-300 p-2 shadow-xl duration-400 ease-in-out>
    <div class="pannel" flex="~ col gap-4" w-10 flex-none>
      <button icon-btn-square :title="expandSidePanel ? 'Close Panel' : 'Open Panel'" @click="expandSidePanel = !expandSidePanel">
        <span :class="[expandSidePanel ? 'i-carbon-open-panel-filled-right' : 'i-carbon-open-panel-right']" inline-block />
      </button>

      <div h-0.5 rounded-full bg="sky-7/20" />

      <button title="Upload Image">
        <label for="image-upload" icon-btn-square btn-primary>
          <span i-carbon-image-reference inline-block />
        </label>
        <input id="image-upload" ref="imgUploadRef" hidden type="file" @change="loadImageFromFileSystem">
      </button>

      <button title="Upload Modal">
        <label for="model-upload" icon-btn-square btn-primary>
          <span i-carbon-model-alt inline-block />
        </label>
        <input id="model-upload" hidden type="file" @change="loadImageFromFileSystem">
      </button>

      <div h-0.5 rounded-full shadow-sm bg="sky-7/20" />

      <button :class="{ 'btn-primary': onHighlight }" icon-btn-square title="Highlight Image Position" @click="onHighlight = !onHighlight">
        <span i-carbon-3d-mpr-toggle inline-block />
      </button>

      <button icon-btn-square title="Zoom In" @click="mapCanvas.zoom(0.1, 1), highlight()">
        <span i-carbon-zoom-in inline-block />
      </button>

      <button icon-btn-square title="Zoom Out" @click="mapCanvas.zoom(-0.1, 1), highlight()">
        <span i-carbon-zoom-out inline-block />
      </button>

      <button icon-btn-square title="Center Image" @click="mapCanvas.centerImage()">
        <span i-carbon-center-to-fit inline-block />
      </button>
    </div>

    <Transition
      name="side-panel"
      enter-active-class="duration-600 ease"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="duration-100 ease"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="expandSidePanel" class="content" flex-1>
        <h1 text-3xl font-bold leading-loose>
          Config
        </h1>
        <section>
          <h2 text-2xl font-bold leading-loose>
            Info
          </h2>
          <div>
            <p>Image width: {{ mapCanvas.image.width }} px</p>
            <p>Image height: {{ mapCanvas.image.height }} px</p>
            <p>Viewport width: {{ width }} px</p>
            <p>Viewport height: {{ height }} px</p>
            <p>Input position: [{{ mouseX }}, {{ mouseY }}], type: {{ mouseSourceType }}</p>
          </div>
        </section>

        <section>
          <h2 text-2xl font-bold leading-loose>
            Current Dection
          </h2>
        </section>
      </div>
    </Transition>
  </div>
</template>
