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
const selectedTab = ref('info')
const selectedImage = ref<number | null>(null)

function selectTab(tab: string) {
  selectedTab.value = tab
  expandSidePanel.value = true
}

// Data
const mapCanvas = new MapCanvas(mapCanvasRef)
const model = new ONNXModel()
const { files: imageFileList, open: openImageSelector, reset: resetImageFileList, onChange: onImageFileListChange } = useFileDialog()

// Lambda Functions
const highlight = () => onHighlight.value && mapCanvas.highlight(mouseX.value, mouseY.value)

onMounted(() => {
  mapCanvas.init()
  model.init('https://r2.ree.ink/models/levir-yolov8n-noprepocess-100epochs-best.onnx')
})

useResizeObserver(mapAreaRef, () => {
  mapCanvas.resize(width.value, height.value)
})

onKeyStroke(['D', 'd'], () => {
  model.predict(mapCanvas.getImage(mouseX.value, mouseY.value))
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
    mapCanvas.zoom(-e.deltaY)
    highlight()
  })
})

async function loadImageToCanvas(idx: number | null) {
  if (idx !== null && imageFileList.value && imageFileList.value.item(idx) !== null)
    mapCanvas.loadImageFromFileSystem(imageFileList.value.item(idx)!)
}
</script>

<template>
  <div ref="mapAreaRef" class="map-area" h-full w-full cursor-move>
    <canvas ref="mapCanvasRef" class="map-canvas" h-full w-full />
  </div>

  <div class="side-panel" :class="[expandSidePanel ? 'w-100' : 'w-14']" fixed bottom-4 right-4 top-4 flex="~ row-reverse" border rounded-xl bg-light-300 p-2 shadow-xl duration-300 ease-in-out>
    <div class="pannel" flex="~ col gap-4" w-10 flex-none>
      <button icon-btn-square :title="expandSidePanel ? 'Close Panel' : 'Open Panel'" @click="expandSidePanel = !expandSidePanel">
        <span :class="[expandSidePanel ? 'i-carbon-open-panel-filled-right' : 'i-carbon-open-panel-right']" inline-block />
      </button>

      <div h-0.5 rounded-full shadow-sm bg="sky-7/20" />

      <button v-show="expandSidePanel" title="Image" icon-btn-square :class="{ 'btn-primary': selectedTab === 'image' }" @click="selectTab('image')">
        <span i-carbon-image inline-block />
      </button>

      <button v-show="expandSidePanel" title="Network" icon-btn-square :class="{ 'btn-primary': selectedTab === 'network' }" @click="selectTab('network')">
        <span i-carbon-model-alt inline-block />
      </button>

      <!-- <button v-show="!expandSidePanel" title="Upload Image">
        <label for="image-upload" icon-btn-square btn-primary>
          <span i-carbon-image-reference inline-block />
        </label>
        <input id="image-upload" ref="imgUploadRef" hidden type="file" @change="loadImageFromFileSystem">
      </button>

      <button v-show="!expandSidePanel" title="Upload Modal">
        <label for="model-upload" icon-btn-square btn-primary>
          <span i-carbon-model-alt inline-block />
        </label>
        <input id="model-upload" hidden type="file" @change="loadImageFromFileSystem">
      </button> -->

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

      <div h-0.5 rounded-full shadow-sm bg="sky-7/20" />
    </div>

    <Transition
      name="side-panel"
      enter-active-class="duration-300 ease-in-out"
      enter-from-class="opacity-0 "
      enter-to-class="opacity-100"
      leave-active-class="duration-100 ease-in-out"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-show="expandSidePanel" class="content" flex-1 cursor-default overflow-hidden pl-2 pr-4>
        <div v-show="selectedTab === 'info'">
          <h1 panel-h1>
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

        <div v-show="selectedTab === 'image'" flex="~ col gap-2" h-full overflow-hidden>
          <h1 flex-none panel-h1>
            Image Options
          </h1>

          <div bg="sky-7/10" rounded-md p-2 shadow-sm>
            <div>Image Size: {{ mapCanvas.image.width }} x {{ mapCanvas.image.height }} px</div>
            <div>Canvas Size: {{ width }} x {{ height }} px</div>
          </div>

          <div bg="sky-7/10" rounded-md p-2 shadow-sm>
            <div>Viewport Position: ({{ Math.round(mapCanvas.viewport.x) }}, {{ Math.round(mapCanvas.viewport.y) }}) px</div>
            <div>Mouse Position: ({{ mouseX }}, {{ mouseY }}) px</div>
          </div>

          <div bg="sky-7/10" flex-1 overflow-hidden rounded-md p-2 shadow-sm flex="~ col gap-2">
            <h2 border="b-2 sky-7/20" px-2 py-1 text-xl leading-relaxed>
              Image List
            </h2>
            <div v-if="imageFileList || imageFileList!.length === 0" w-full cursor-pointer overflow-y-auto>
              <div v-for="idx in imageFileList!.length" :key="idx" :class="{ 'bg-light-3': selectedImage === idx }" mb-2 mr-2 rounded-md p-2 font-mono text-sm duration-300 ease-in-out @click="selectedImage = idx">
                {{ imageFileList![idx - 1].name }}
              </div>
            </div>
            <div v-else h-full flex="~ col gap-6" items-center justify-center text="sky-7/40">
              <span i-carbon-select-window block text-20 />
              <span text-2xl>Please Upload Image!</span>
            </div>
          </div>

          <div>
            <div my-1 mr-2 inline-block>
              <button bg="sky-7 hover:sky-8" color="white" flex="~ items-center justify-center" rounded-md p-2 shadow-sm duration-300 ease-in-out @click="openImageSelector()">
                <span i-carbon-image-reference mr-2 inline-block />
                <span>Upload Image</span>
              </button>
            </div>

            <div my-1 inline-block>
              <button bg="red-6/20 hover:red-6/30" flex="~ items-center justify-center" inline-block rounded-md p-2 shadow-sm duration-300 ease-in-out @click="loadImageToCanvas(selectedImage)">
                <span i-carbon-restart mr-2 inline-block />
                <span>Load Canvas</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>
