<script lang="ts" setup>
// Element Bindings
const mapAreaRef = ref<HTMLDivElement | null>(null)
const mapCanvasRef = ref<HTMLCanvasElement | null>(null)

// Element Refs
const { width, height } = useWindowSize()
const { x: mouseX, y: mouseY } = useMouse()
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
const { files: imageFileList, open: openImageSelector } = useFileDialog({
  accept: '.jpg, .jpeg, .png',
  multiple: true,
})
const modelLink = ref('')
const { files: modelFileList, open: openModelSelector, onChange: onModelFileListChange } = useFileDialog({
  accept: '.onnx',
  multiple: false,
})
const modelInputSize = reactive({ width: 640, height: 640 } as RectSize)
const modelLabels = reactive([] as Label[])
const modelName = ref('')
const modelInferenceTime = reactive({
  modelInference: 0,
  preProcess: 0,
  postProcess: 0,
})
const toAddLabel = reactive({ idx: null, name: null } as toNullable<Label>)

function addLabel(idx: number | null, name: string | null) {
  if (idx !== null && name !== null) {
    modelLabels.push({ idx, name })
    toAddLabel.idx = null
    toAddLabel.name = null
  }
}

// Lambda Functions
const highlight = () => onHighlight.value && mapCanvas.highlight(mouseX.value, mouseY.value)

onMounted(() => {
  mapCanvas.init()
})

// resize canvas when window size changed
useResizeObserver(mapAreaRef, () => {
  mapCanvas.resize(width.value, height.value)
})

// execute predict when press 'D' or 'd'
onKeyStroke(['D', 'd'], async () => {
  if (model.status && mapCanvas.status) {
    const startTime = new Date().getTime()
    const size: RectSize = { width: modelInputSize.width, height: modelInputSize.height }
    const { data: image, position } = await mapCanvas.getImage({ x: mouseX.value, y: mouseY.value }, size)
    const result = await model.predict(image, { height: position.height, width: position.width })
    const objects = await processResult(result.output)
    await mapCanvas.addObjects(objects, size, position)
    const endTime = new Date().getTime()
    modelInferenceTime.modelInference = result.time.afterPredictTime - result.time.beforePredictTime
    modelInferenceTime.preProcess = result.time.beforePredictTime - startTime
    modelInferenceTime.postProcess = endTime - result.time.afterPredictTime
  }
  else if (!model.status) {
    window.alert('Model Not Loaded!')
  }
  else if (!mapCanvas.status) {
    window.alert('Image Not Loaded!')
  }
})

// move canvas when mouse pressed and moved
watch([mouseX, mouseY], ([x, y], [ox, oy]) => {
  if (mousePressed.value)
    mapCanvas.move(ox - x, oy - y)
})

// highlight the image position to detect when mouse moved
watch([mouseX, mouseY], () => {
  if (mapCanvas.status) {
    mapCanvas.render()
    highlight()
  }
})

// zoom canvas when mouse wheel scrolled
onMounted(() => {
  mapAreaRef.value?.addEventListener('wheel', (e) => {
    mapCanvas.zoom(-e.deltaY)
    highlight()
  })
})

async function loadImageToCanvas(idx: number | null) {
  if (idx !== null && imageFileList.value && imageFileList.value.item(idx) !== null)
    mapCanvas.loadImageFromFileSystem(imageFileList.value.item(idx)!)
}

async function loadModelFromFileSystem() {
  if (modelFileList.value && modelFileList.value.item(0) !== null) {
    const file = modelFileList.value.item(0)!
    const url = URL.createObjectURL(file)
    modelName.value = file.name
    await model.init(url)

    if (model.status)
      window.alert('Model Loaded!')
    else
      window.alert('Model Load Failed!')
  }
}

async function loadModelFromURL() {
  if (modelLink.value.length >= 0) {
    await model.init(modelLink.value)
    modelName.value = modelLink.value.split('/').pop()!
  }

  if (model.status)
    window.alert('Model Loaded!')
  else
    window.alert('Model Load Failed!')
}

// load model when model file list changed
onModelFileListChange(loadModelFromFileSystem)
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

      <button title="Info" icon-btn-square :class="{ 'btn-primary': selectedTab === 'info' }" @click="selectTab('info')">
        <span i-carbon-information inline-block />
      </button>

      <button title="Image" icon-btn-square :class="{ 'btn-primary': selectedTab === 'image' }" @click="selectTab('image')">
        <span i-carbon-image inline-block />
      </button>

      <button title="Network" icon-btn-square :class="{ 'btn-primary': selectedTab === 'network' }" @click="selectTab('network')">
        <span i-carbon-model-alt inline-block />
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
        <div v-show="selectedTab === 'info'" flex="~ col gap-2" h-full>
          <h1 panel-h1>
            ReSe
          </h1>

          <div flex="~ gap-2">
            <h2 bg="sky-7/10" rounded-md p-2 shadow-sm>
              Status
            </h2>
            <span bg="sky-7/10" rounded-md p-2 shadow-sm flex="~ items-center gap-2">Canvas
              <span v-if="mapCanvas.status.value" i-icon-park-outline-success inline-block color-green-7 />
              <span v-else i-ph-circle-wavy-warning-bold inline-block color-yellow-6 />
            </span>
            <span bg="sky-7/10" rounded-md p-2 shadow-sm flex="~ items-center gap-2">Model
              <span v-if="model.status.value" i-icon-park-outline-success inline-block color-green-7 />
              <span v-else i-ph-circle-wavy-warning-bold inline-block color-yellow-6 />
            </span>
          </div>

          <div flex="~ gap-2 wrap">
            <h2 bg="sky-7/10" rounded-md p-2 shadow-sm>
              Time
            </h2>
            <span bg="sky-7/10" rounded-md p-2 shadow-sm>
              Model Inference: {{ modelInferenceTime.modelInference }} ms
            </span>
            <span bg="sky-7/10" rounded-md p-2 shadow-sm>
              Pre Process: {{ modelInferenceTime.preProcess }} ms
            </span>
            <span bg="sky-7/10" rounded-md p-2 shadow-sm>
              Post Process: {{ modelInferenceTime.postProcess }} ms
            </span>
          </div>

          <div flex-auto />

          <div flex="~ gap-2">
            <span bg="sky-7/10" rounded-md p-2 shadow-sm>MIT © ReeInk</span>
            <a bg="sky-7/10" rounded-md p-2 shadow-sm flex="~ inline items-center gap-2" href="https://github.com/reeink/rese" target="_blank">
              <span i-carbon-logo-github inline-block /> reeink/rese
            </a>
          </div>

          <div flex="~ gap-2 wrap">
            <span bg="sky-7/10" rounded-md p-2 shadow-sm>Powered By</span>
            <a bg="sky-7/10" flex="~ inline items-center gap-2" rounded-md px-3 py-2 shadow-sm href="https://vuejs.org" target="_blank">
              <span i-carbon-logo-vue inline-block /> Vue
            </a>
            <a bg="sky-7/10" flex="~ inline items-center gap-2" rounded-md px-3 py-2 shadow-sm href="https://unocss.dev" target="_blank">
              <span i-vscode-icons-file-type-unocss inline-block /> UnoCSS
            </a>
            <a bg="sky-7/10" flex="~ inline items-center gap-2" href="https://github.com/action-hong/unocss-preset-scrollbar" target="_blank" rounded-md px-3 py-2 shadow-sm>
              <span i-carbon-logo-github inline-block />unocss-preset-scrollbar
            </a>
            <a bg="sky-7/10" rounded-md px-3 py-2 shadow-sm flex="~ inline items-center gap-2" href="https://onnx.ai" target="_blank">
              <span i-simple-icons-onnx inline-block />ONNX
            </a>
            <a bg="sky-7/10" rounded-md px-3 py-2 shadow-sm flex="~ inline items-center gap-2" href="https://onnxruntime.ai" target="_blank">
              ONNX Runtime
            </a>
            <a bg="sky-7/10" rounded-md px-3 py-2 shadow-sm flex="~ inline items-center gap-2" href="https://github.com/antfu/vitesse-lite" target="_blank">
              <span i-carbon-logo-github inline-block />vitesse-lite
            </a>
            <a bg="sky-7/10" rounded-md px-3 py-2 shadow-sm flex="~ inline items-center gap-2" href="https://pages.cloudflare.com" target="_blank">
              <span i-simple-icons-cloudflarepages inline-block /> Cloudflare Pages
            </a>
          </div>
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
            <div v-if="imageFileList && imageFileList!.length !== 0" w-full cursor-pointer overflow-y-auto scrollbar="~ w-1 rounded track-color-transparent thumb-color-sky-7/40">
              <div v-for="idx in imageFileList!.length" :key="idx" :class="{ 'bg-light-3': selectedImage === idx - 1 }" mb-2 mr-2 rounded-md p-2 font-mono text-sm duration-300 ease-in-out @click="selectedImage = idx - 1">
                {{ imageFileList![idx - 1].name }}
              </div>
            </div>
            <div v-else h-full flex="~ col gap-6" items-center justify-center text="sky-7/40">
              <span i-carbon-select-window block text-20 />
              <span text-2xl>Please Upload Image!</span>
            </div>
          </div>

          <div>
            <div mr-2 inline-block>
              <button bg="sky-7 hover:sky-8" color="white" flex="~ items-center justify-center" rounded-md p-2 shadow-sm duration-300 ease-in-out @click="openImageSelector(), selectedImage = null">
                <span i-carbon-image-reference mr-2 inline-block />
                <span>Upload Image</span>
              </button>
            </div>

            <div inline-block>
              <button bg="red-6/20 hover:red-6/30 disabled:neutral-500" color="disabled:white" flex="~ items-center justify-center" inline-block rounded-md p-2 shadow-sm duration-300 ease-in-out :disabled="selectedImage === null" @click="loadImageToCanvas(selectedImage)">
                <span i-carbon-restart mr-2 inline-block />
                <span>Load to Canvas</span>
              </button>
            </div>
          </div>
        </div>

        <div v-show="selectedTab === 'network'" flex="~ col gap-2" h-full overflow-hidden>
          <h1 flex-none panel-h1>
            Network Options
          </h1>

          <div bg="sky-7/10" rounded-md p-2 shadow-sm flex="~ items-center justify-between">
            <span>Model Name</span>
            <input v-model="modelName" type="text" inline-block w-18 w-46 rounded-md px-2 py-1 bg="white/60" placeholder="yolo.onnx">
          </div>

          <div bg="sky-7/10" flex="~ items-center justify-between" rounded-md p-2 shadow-sm>
            <span>
              Input Size
            </span>
            <span flex-none>
              <input v-model="modelInputSize.width" bg="white/60" type="number" inline-block w-18 rounded-md px-2 py-1 text-center> x <input v-model="modelInputSize.height" type="number" inline-block w-18 rounded-md px-2 py-1 text-center bg="white/60"> px
            </span>
          </div>

          <div bg="sky-7/10" flex="~ col gap-2" flex-auto overflow-hidden rounded-md p-2 shadow-sm>
            <h2>
              Labels
            </h2>

            <div flex="~ justify-between items-center gap-2" pr-2>
              <input v-model="toAddLabel.idx" placeholder="index" type="number" w-4 flex-auto rounded-md px-2 py-1 text-center bg="white/60">
              <input v-model="toAddLabel.name" placeholder="label" type="text" w-16 flex-auto rounded-md px-2 py-1 text-center bg="white/60">
              <button flex="~ items-center" bg="hover:white/60 disabled:transparent" mr-2 rounded-md p-2 duration-300 ease-in-out :disabled="toAddLabel.idx === null || toAddLabel.name === null" @click="addLabel(toAddLabel.idx, toAddLabel.name)">
                <span i-carbon-add inline-block />
              </button>
            </div>

            <div v-if="modelLabels.length > 0" overflow-y-auto scrollbar="~ w-1 rounded track-color-transparent thumb-color-sky-7/60" flex="~ col gap-2" pr-2>
              <div v-for="label in modelLabels" :key="label.idx" flex="~ items-center justify-between gap-2" bg="white/60" rounded-md p-2>
                <span w-4 flex-auto text-center>{{ label.idx }}</span>
                <span w-16 flex-auto text-center>{{ label.name }}</span>
                <button flex="~ items-center" bg="hover:white/60" rounded-md p-2 duration-300 ease-in-out @click="modelLabels.splice(modelLabels.indexOf(label), 1)">
                  <span i-carbon-subtract inline-block />
                </button>
              </div>
            </div>
          </div>

          <div>
            <input v-model="modelLink" type="text" placeholder="https://example.com/yolo.onnx" w-full rounded-md p-2 border="2 sky-7/30">
          </div>

          <div>
            <div my-1 mr-2 inline-block>
              <button bg="sky-7 hover:sky-8" color="white" flex="~ items-center justify-center" rounded-md p-2 shadow-sm duration-300 ease-in-out @click="openModelSelector()">
                <span i-carbon-cube mr-2 inline-block />
                <span>Upload Model</span>
              </button>
            </div>

            <div my-1 mr-2 inline-block>
              <button bg="sky-7 hover:sky-8 disabled:neutral-500" color="white" flex="~ items-center justify-center" rounded-md p-2 shadow-sm duration-300 ease-in-out :disabled="modelLink.length === 0" @click="loadModelFromURL()">
                <span i-carbon-link mr-2 inline-block />
                <span>Load from Link</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>
