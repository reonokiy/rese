// declare ort here so that it can be used in other files
declare const ort: any

declare interface DetectObject {
  x: number
  y: number
  w: number
  h: number
  class: number
  confidence: number
  allConfidence: number[]
}

declare interface Viewport {
  x: number
  y: number
  height: number
  width: number
  scale: number
}

declare interface Label {
  idx: number
  name: string
}

declare interface Position {
  x: number
  y: number
}

declare interface RectSize {
  width: number
  height: number
}

declare interface Rect {
  x: number
  y: number
  width: number
  height: number
}

declare type toNullable<T> = {
  [P in keyof T]: T[P] | null
}
