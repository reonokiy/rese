export interface DetectObject {
  x: number
  y: number
  w: number
  h: number
  class: number
  confidence: number
  allConfidence: number[]
}

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

  async predict(image: ImageData, size = { height: 640, width: 640 }) {
    if (!this.session)
      throw new Error('model not loaded')

    const startTime = new Date().getTime()
    const inputName = this.session.inputNames[0]
    const outputName = this.session.outputNames[0]

    const tensor = await ort.Tensor.fromImage(image, {
      resizeHeight: size.height,
      resizeWidth: size.width,
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

export async function processResult(output: any, threshold = 0.5) {
  if (threshold < 0 || threshold > 1)
    throw new Error('threshold must be between 0 and 1')
  const get = (i: number, j: number, k: number) => output.data[i * output.dims[1] * output.dims[2] + j * output.dims[2] + k]
  const getIthObject = (k: number) => {
    const x = get(0, 0, k)
    const y = get(0, 1, k)
    const w = get(0, 2, k)
    const h = get(0, 3, k)
    const allConfidence = []
    let maxConfidence = 0
    let maxConfidenceIdx = 0
    for (let i = 4; i < output.dims[1]; i++) {
      const t = get(0, i, k)
      allConfidence.push(t)
      if (t > maxConfidence) {
        maxConfidence = t
        maxConfidenceIdx = i - 4
      }
    }
    return {
      x,
      y,
      w,
      h,
      class: maxConfidenceIdx,
      confidence: maxConfidence,
      allConfidence,
    } as DetectObject
  }

  const outputArray = [] as DetectObject[]
  for (let k = 0; k < output.dims[2]; k++) {
    const ithObject = getIthObject(k)
    if (ithObject.confidence > threshold)
      outputArray.push(ithObject)
  }

  function NMS() {
    const iou = (a: any, b: any) => {
      const x1 = Math.max(a.x - a.w / 2, b.x - b.w / 2)
      const y1 = Math.max(a.y - a.h / 2, b.y - b.h / 2)
      const x2 = Math.min(a.x + a.w / 2, b.x + b.w / 2)
      const y2 = Math.min(a.y + a.h / 2, b.y + b.h / 2)
      const intersection = Math.max(0, x2 - x1) * Math.max(0, y2 - y1)
      const union = a.w * a.h + b.w * b.h - intersection
      return intersection / union
    }

    const result = [] as DetectObject[]
    // for each class, do NMS
    for (let i = 0; i < output.dims[1] - 4; i++) {
      const ithClass = outputArray.filter((e: any) => e.class === i)
      const ithClassSorted = ithClass.sort((a: any, b: any) => b.confidence - a.confidence)
      const ithClassNMS = [] as typeof outputArray
      while (ithClassSorted.length > 0) {
        const current = ithClassSorted.shift()!
        ithClassNMS.push(current)
        ithClassSorted.forEach((e: any, idx: number) => {
          if (iou(current, e) > 0.5)
            ithClassSorted.splice(idx, 1)
        })
      }
      result.push(...ithClassNMS)
    }

    return result
  }

  return NMS()
}
