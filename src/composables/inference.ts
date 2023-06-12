export class ONNXModel {
  path: Ref<String | null>
  session: any
  status: Ref<Boolean>

  constructor() {
    this.path = ref<String | null>(null)
    this.status = ref(false)
  }

  getStatus() {
    return this.status
  }

  getPath() {
    return this.path
  }

  async init(path: string) {
    this.path.value = path
    this.session = await ort.InferenceSession.create(this.path.value)
    this.status.value = true
  }

  async predict(image: ImageData) {
    const startTime = new Date().getTime()
    if (!this.session)
      throw new Error('model not loaded')

    const inputName = this.session.inputNames[0]
    const outputName = this.session.outputNames[0]

    const tensor = await ort.Tensor.fromImage(image, {
      resizeHeight: 640,
      resizeWidth: 640,
      tensorLayout: 'NCHW',
    })
    const input = { [inputName]: tensor }
    const beforePredictTime = new Date().getTime()
    const output = await this.session.run(input)
    const afterPredictTime = new Date().getTime()
    return {
      output: output[outputName],
      time: {
        startTime,
        beforePredictTime,
        afterPredictTime,
      },
    }
  }
}
