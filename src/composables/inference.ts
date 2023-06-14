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

  async predict(image: ImageData, size: RectSize) {
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
      x: x - w / 2,
      y: y - h / 2,
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

  return NMS(outputArray)
}

export function IOU(a: DetectObject, b: DetectObject) {
  const x1 = Math.max(a.x, b.x)
  const y1 = Math.max(a.y, b.y)
  const x2 = Math.min(a.x + a.w, b.x + b.w)
  const y2 = Math.min(a.y + a.h, b.y + b.h)
  const intersection = Math.max(0, x2 - x1) * Math.max(0, y2 - y1)
  const areaA = a.w * a.h
  const areaB = b.w * b.h
  const union = areaA + areaB - intersection
  return intersection / union
}

export async function NMS(objects: DetectObject[], threshold = 0.5) {
  const tmp = [] as DetectObject[][]
  const results = [] as DetectObject[]
  // for each class, do NMS
  for (const object of objects) {
    if (!tmp[object.class])
      tmp[object.class] = [object]
    else
      tmp[object.class].push(object)
  }

  for (const ithClass of tmp) {
    // if not Array, skip
    if (!Array.isArray(ithClass))
      continue

    const ithClassSorted = ithClass.sort((a, b) => b.confidence - a.confidence)
    const ithClassNMS = [] as typeof objects
    while (ithClassSorted.length > 0) {
      const current = ithClassSorted.shift()!
      ithClassNMS.push(current)
      ithClassSorted.forEach((e, idx) => {
        if (IOU(current, e) > threshold)
          ithClassSorted.splice(idx, 1)
      })
    }
    results.push(...ithClassNMS)
  }

  return results
}
