'use strict'

const DPR = window.devicePixelRatio

const FORMATS = [
  'mp4',
  'mpeg',
  'ogg',
  'webm'
]

const controlPanel = document.getElementById('control-panel')

const playBtn = document.getElementById('play-btn')
const resetBtn = document.getElementById('reset-btn')
const recordBtn = document.getElementById('record-btn')
const stepInput = document.getElementById('step-input')
const startFnsBtn = document.getElementById('start-fns-btn')
const changeFnsBtn = document.getElementById('change-fns-btn')

const xcoord = document.getElementById('xcoord')
const ycoord = document.getElementById('ycoord')
const rvalue = document.getElementById('rvalue')
const gvalue = document.getElementById('gvalue')
const bvalue = document.getElementById('bvalue')
const palette = document.getElementById('palette')

const canvas = document.getElementById('canvas')

const startFnsModal = document.getElementById('start-fns-modal')
const changeFnsModal = document.getElementById('change-fns-modal')
const closeStartFnsModalBtn = startFnsModal.querySelector('.close-btn')
const closeChangeFnsModalBtn = changeFnsModal.querySelector('.close-btn')

const rStartFnInput = document.getElementById('rstartfn')
const gStartFnInput = document.getElementById('gstartfn')
const bStartFnInput = document.getElementById('bstartfn')

const rChangeFnInput = document.getElementById('rchangefn')
const gChangeFnInput = document.getElementById('gchangefn')
const bChangeFnInput = document.getElementById('bchangefn')

const recordModal = document.getElementById('record-modal')
const startRecordingBtn = document.getElementById('start-recording-btn')
const filenameInput = document.getElementById('filename-input')
const selectFiletype = document.getElementById('select-format')
const closeRecordModalBtn = recordModal.querySelector('.close-btn')

let ctx
let filename
let format
let imageData
let left
let mimeType
let playing = false
let recordedChunks = []
let recorder = null
let showingModal = false
let step = 1
let stream
let top

const setCanvasDimensions = () => {
  const rect = canvas.getBoundingClientRect()

  left = Math.round(rect.left)
  top = Math.round(rect.top)

  canvas.width = rect.width * DPR
  canvas.height = rect.height * DPR

  ctx = canvas.getContext('2d')
  imageData = ctx.createImageData(canvas.width, canvas.height)
}

window.onresize = event => {
  setCanvasDimensions()
  init()
}

setCanvasDimensions()

const mod = (fn, ...args) => {
  let x = fn(...args)

  if (x < 0) {
    x -= Math.floor(x / 256) * 256
  }

  return Math.round(x % 256)
}

const defaultStartFn = (x, y) => x + y

let rStartFn = defaultStartFn
let gStartFn = defaultStartFn
let bStartFn = defaultStartFn

const defaultRChangeFn = (r, g, b, s, x, y) => r + s
const defaultGChangeFn = (r, g, b, s, x, y) => g + s
const defaultBChangeFn = (r, g, b, s, x, y) => b + s

let rChangeFn = defaultRChangeFn
let gChangeFn = defaultGChangeFn
let bChangeFn = defaultBChangeFn

let x = 0
let y = 0

const makeFnSubs = rhs => {
  return rhs
    .replace(/(\(.*?\)|[a-z])(?=\(|[a-z]|[0-9.]+)/gi, '$1*')
    .replace(/([0-9.]+)(?=\(|[a-z])/gi, '$1*')
    .replace(/\^/g, '**')
    .toLowerCase()
}

const createStartFn = rhs => {
  rhs = makeFnSubs(rhs)

  if (/[^0-9xy*+\-/.() ]/.test(rhs)) {
    const err = new Error('Invalid start function: (x, y) => ' + rhs)
    console.error(err)
    window.alert(err.message)
    return
  }

  // eslint-disable-next-line no-new-func
  return new Function('x', 'y', 'return ' + rhs)
}

const createChangeFn = rhs => {
  rhs = makeFnSubs(rhs)

  if (/[^0-9rgbsxy*+\-/.() ]/.test(rhs)) {
    const err = new Error('Invalid change function: (r, g, b, s, x, y) => ' + rhs)
    console.error(err)
    window.alert(err.message)
    return
  }

  // eslint-disable-next-line no-new-func
  return new Function('r', 'g', 'b', 's', 'x', 'y', 'return ' + rhs)
}

const init = () => {
  let x = 0
  let y = 0

  for (let i = 0; i < imageData.data.length; i += 4) {
    if (++x === canvas.width) {
      x = 0
      ++y
    }

    imageData.data[i] = mod(rStartFn, x, y)
    imageData.data[i + 1] = mod(gStartFn, x, y)
    imageData.data[i + 2] = mod(bStartFn, x, y)
    imageData.data[i + 3] = 255
  }

  ctx.putImageData(imageData, 0, 0)

  drawCircle()
}

const drawCircle = () => {
  if (!x && !y) return

  ctx.beginPath()
  ctx.ellipse(x, y, 3, 3, 0, 0, 2 * Math.PI)
  ctx.closePath()
  ctx.stroke()

  xcoord.innerText = 'x: ' + String(x).padStart(4, '0')
  ycoord.innerText = 'y: ' + String(y).padStart(4, '0')

  const index = x * 4 + y * imageData.width * 4
  let [r, g, b] = imageData.data.slice(index)

  r = String(r).padStart(3, '0')
  g = String(g).padStart(3, '0')
  b = String(b).padStart(3, '0')

  rvalue.innerText = 'r: ' + r
  gvalue.innerText = 'g: ' + g
  bvalue.innerText = 'b: ' + b
  palette.style.backgroundColor = `rgb(${r}, ${g}, ${b})`
}

const moveCircle = (newX, newY) => {
  const inBounds = (
    newX >= 0 && newX <= canvas.width &&
    newY >= 0 && newY <= canvas.height
  )

  if (!inBounds) return

  (x || y) && ctx.putImageData(imageData, 0, 0)

  x = newX
  y = newY

  playing || window.requestAnimationFrame(drawCircle)
}

canvas.onmousedown = event => {
  const newX = (event.clientX - left) * DPR
  const newY = (event.clientY - top) * DPR

  moveCircle(newX, newY)
}

document.body.onkeydown = event => {
  switch (event.key) {
    case 'ArrowUp':
      moveCircle(x, y - 1)
      break

    case 'ArrowDown':
      moveCircle(x, y + 1)
      break

    case 'ArrowLeft':
      moveCircle(x - 1, y)
      break

    case 'ArrowRight':
      moveCircle(x + 1, y)
      break
  }
}

controlPanel.onclick = () => {
  if (!x && !y) return

  x = 0
  y = 0

  ctx.putImageData(imageData, 0, 0)

  rvalue.innerText = 'r: 000'
  gvalue.innerText = 'g: 000'
  bvalue.innerText = 'b: 000'

  palette.style.backgroundColor = 'white'
}

const change = () => {
  if (!playing) return

  let r, g, b

  let x = 0
  let y = 0

  for (let i = 0; i < imageData.data.length; i += 4) {
    if (++x === canvas.width) {
      x = 0
      ++y
    }

    r = imageData.data[i]
    g = imageData.data[i + 1]
    b = imageData.data[i + 2]

    imageData.data[i] = mod(rChangeFn, r, g, b, step, x, y)
    imageData.data[i + 1] = mod(gChangeFn, r, g, b, step, x, y)
    imageData.data[i + 2] = mod(bChangeFn, r, g, b, step, x, y)
  }

  ctx.putImageData(imageData, 0, 0)

  drawCircle()

  window.requestAnimationFrame(change)
}

init()

const showModal = modal => {
  if (showingModal) return

  showingModal = true
  modal.style.display = 'block'
}

const hideModal = modal => {
  modal.style.display = 'none'
  showingModal = false
}

stepInput.oninput = event => {
  step = +event.target.value
}

startFnsBtn.onclick = event => {
  event.stopPropagation()
  showModal(startFnsModal)
}

changeFnsBtn.onclick = event => {
  event.stopPropagation()
  showModal(changeFnsModal)
}

closeStartFnsModalBtn.onclick = () => {
  rStartFn = rStartFnInput.value
    ? createStartFn(rStartFnInput.value)
    : defaultStartFn

  gStartFn = gStartFnInput.value
    ? createStartFn(gStartFnInput.value)
    : defaultStartFn

  bStartFn = bStartFnInput.value
    ? createStartFn(bStartFnInput.value)
    : defaultStartFn

  hideModal(startFnsModal)
}

closeChangeFnsModalBtn.onclick = () => {
  rChangeFn = rChangeFnInput.value
    ? createChangeFn(rChangeFnInput.value)
    : defaultRChangeFn

  gChangeFn = gChangeFnInput.value
    ? createChangeFn(gChangeFnInput.value)
    : defaultGChangeFn

  bChangeFn = bChangeFnInput.value
    ? createChangeFn(bChangeFnInput.value)
    : defaultBChangeFn

  hideModal(changeFnsModal)
}

const play = () => {
  playing = true

  window.requestAnimationFrame(change)
}

const stop = () => {
  playing = false
}

playBtn.onclick = event => {
  event.stopPropagation()

  if (playing) {
    stop()
    playBtn.innerHTML = '&#x25B6;'
  } else {
    play()
    playBtn.innerHTML = '&#x25A0;'
  }
}

resetBtn.onclick = event => {
  event.stopPropagation()
  init()
}

for (const format of FORMATS) {
  if (window.MediaRecorder.isTypeSupported('video/' + format)) {
    const option = document.createElement('option')
    option.innerText = option.value = format
    selectFiletype.appendChild(option)
  }
}

recordBtn.onclick = async event => {
  if (recorder) {
    recorder.stop()
    recorder = false
    stream = null

    recordBtn.style.color = 'black'

    const blob = new window.Blob(recordedChunks, { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')

    a.href = url
    a.download = filename + '.' + format
    a.click()

    URL.revokeObjectURL(url)

    recordedChunks = []

    stop()

    return
  }

  showModal(recordModal)

  await new Promise(resolve => {
    startRecordingBtn.onclick = resolve
  })

  hideModal(recordModal)

  filename = filenameInput.value
  format = selectFiletype.value

  stream = canvas.captureStream(240)
  mimeType = 'video/' + format

  recordedChunks = []
  recorder = new window.MediaRecorder(stream, { mimeType })

  recorder.ondataavailable = event => {
    recordedChunks.push(event.data)
  }

  recorder.start(1e3)

  recordBtn.style.color = 'red'
  playing || play()
}

closeRecordModalBtn.onclick = event => {
  hideModal(recordModal)
}

const warningModal = document.getElementById('warning-modal')
const closeWarningModalBtn = warningModal.querySelector('.close-btn')

showModal(warningModal)

closeWarningModalBtn.onclick = () => {
  hideModal(warningModal)
}
