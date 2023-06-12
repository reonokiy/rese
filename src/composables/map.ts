export interface Viewport {
  x: number
  y: number
  height: number
  width: number
  scale: number
}

export class MapCanvas {
  viewport: Viewport
  image: HTMLImageElement
  canvas: Ref<HTMLCanvasElement | null>
  ctx: CanvasRenderingContext2D | null
  status: Ref<Boolean>

  constructor(canvas: Ref<HTMLCanvasElement | null>) {
    this.viewport = reactive({
      x: 0,
      y: 0,
      height: 0,
      width: 0,
      scale: 10,
    })
    this.canvas = canvas
    this.image = new Image()
    this.ctx = null
    this.status = ref(false)
  }

  init() {
    try {
      this.ctx = this.canvas.value!.getContext('2d', { willReadFrequently: false })!
    }
    catch (e) {
      this.status.value = false
      throw e
    }
  }

  set(viewport: Viewport) {
    this.viewport = viewport
  }

  getCtx(): CanvasRenderingContext2D {
    if (!this.ctx)
      throw new Error('Canvas not initialized')
    return this.ctx
  }

  async loadImageFromFileSystem(file: File) {
    try {
      const reader = new FileReader()
      reader.onload = () => this.image.src = reader.result as string
      reader.readAsDataURL(file)
      await new Promise(resolve => this.image.onload = resolve)
      this.status.value = true
    }
    catch (e) {
      this.status.value = false
      throw e
    }

    // set viewport to the size of the image
    this.viewport.scale = this.getMinScale() * 0.75
    // center the image
    const srcCenter = [this.image.width / 2, this.image.height / 2]
    const dstCenter = [this.viewport.width / 2 / this.viewport.scale, this.viewport.height / 2 / this.viewport.scale]
    this.viewport.x = srcCenter[0] - dstCenter[0]
    this.viewport.y = srcCenter[1] - dstCenter[1]
    // then render
    this.render()
  }

  resize(width: number, height: number) {
    this.resizeViewport(width, height)
    this.resizeCanvas()
    this.render()
  }

  zoom(scale: number, rate = 0.0001) {
    this.viewport.scale = Math.max(Math.min(this.viewport.scale + scale * rate, 10), this.getMinScale())
    this.render()
  }

  move(x: number, y: number) {
    this.viewport.x += x / this.viewport.scale
    this.viewport.y += y / this.viewport.scale
    this.render()
  }

  render() {
    this.drawImage(this.image)
  }

  highlight(x: number, y: number, size = [640, 640], color = 'rgba(0, 0, 0, 0.3)') {
    const ctx = this.getCtx()
    const position = [
      Math.min(Math.max(Math.round(x - size[0] / 2), 0), this.viewport.width - size[0]),
      Math.min(Math.max(Math.round(y - size[1] / 2), 0), this.viewport.height - size[1]),
    ]
    // for area not in position, fill with black and opacity 0.1
    ctx.fillStyle = color
    ctx.fillRect(0, 0, this.viewport.width, position[1])
    ctx.fillRect(0, position[1], position[0], size[1])
    ctx.fillRect(position[0] + size[0], position[1], this.viewport.width - position[0] - size[0], size[1])
    ctx.fillRect(0, position[1] + size[1], this.viewport.width, this.viewport.height - position[1] - size[1])
  }

  getImage(mouseX: number, mouseY: number, size = [640, 640]): ImageData {
    const position = [
      Math.min(Math.max(Math.round(mouseX - size[0] / 2), 0), this.viewport.width - size[0]),
      Math.min(Math.max(Math.round(mouseY - size[1] / 2), 0), this.viewport.height - size[1]),
    ]
    const imageData = this.getCtx().getImageData(position[0], position[1], size[0], size[1])
    return imageData
  }

  centerImage() {
    const srcCenter = [this.image.width / 2, this.image.height / 2]
    const dstCenter = [this.viewport.width / 2 / this.viewport.scale, this.viewport.height / 2 / this.viewport.scale]
    this.viewport.x = srcCenter[0] - dstCenter[0]
    this.viewport.y = srcCenter[1] - dstCenter[1]
    this.render()
  }

  private resizeViewport(width: number, height: number) {
    this.viewport.width = width
    this.viewport.height = height
  }

  private resizeCanvas() {
    this.canvas.value!.width = this.viewport.width
    this.canvas.value!.height = this.viewport.height
  }

  private drawImage(image: HTMLImageElement) {
    const ctx = this.getCtx()
    ctx.fillStyle = 'black'
    ctx.fillRect(0, 0, this.viewport.width, this.viewport.height)
    ctx.drawImage(image, this.viewport.x, this.viewport.y, this.viewport.width / this.viewport.scale, this.viewport.height / this.viewport.scale, 0, 0, this.viewport.width, this.viewport.height)
  }

  private getMinScale() {
    return Math.min(this.viewport.width / this.image.width, this.viewport.height / this.image.height)
  }
}
