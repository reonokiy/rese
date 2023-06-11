// import init, { Input, Session } from '@webonnx/wonnx-wasm'

// // Check for WebGPU availability first: if(navigator.gpu) { .. }
// await init()
// const session = await Session.fromBytes(modelBytes /* Uint8Array containing the ONNX file */)
// const input = new Input()
// input.insert('x', [13.0, -37.0])
// const result = await session.run(input) // This will be an object where the keys are the names of the model outputs and the values are arrays of numbers.
// session.free()
// input.free()
