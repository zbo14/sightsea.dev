'use strict'

const DPR = window.devicePixelRatio

const controlPanel = document.getElementById('control-panel')

const playBtn = document.getElementById('play-btn')
const resetBtn = document.getElementById('reset-btn')
const stepInput = document.getElementById('step-input')
const startFnsBtn = document.getElementById('start-fns-btn')
const changeFnsBtn = document.getElementById('change-fns-btn')

const infoCanvas = document.getElementById('info-canvas')
const sceneCanvas = document.getElementById('scene-canvas')
const surfaceCanvas = document.getElementById('surface-canvas')

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

let imageData
let left
let playing = false
let sceneCtx
let showingModal = false
let step = 1
let surfaceCtx
let top

const infoCtx = infoCanvas.getContext('2d')
infoCtx.font = '1em Cousine, monospace'

const setCanvasDimensions = () => {
  const rect = sceneCanvas.getBoundingClientRect()

  left = Math.round(rect.left)
  top = Math.round(rect.top)

  sceneCanvas.width = rect.width * DPR
  sceneCanvas.height = rect.height * DPR

  surfaceCanvas.width = rect.width * DPR
  surfaceCanvas.height = rect.height * DPR

  sceneCtx = sceneCanvas.getContext('2d')
  surfaceCtx = surfaceCanvas.getContext('2d')
  imageData = sceneCtx.createImageData(sceneCanvas.width, sceneCanvas.height)
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

const createStartFn = rhs => {
  // eslint-disable-next-line no-new-func
  return new Function('x', 'y', 'return ' + rhs.replace(/\s/g, ''))
}

const createChangeFn = rhs => {
  // eslint-disable-next-line no-new-func
  return new Function('r', 'g', 'b', 's', 'x', 'y', 'return ' + rhs.replace(/\s/g, ''))
}

const init = () => {
  const coords = [0, 0]

  for (let i = 0; i < imageData.data.length; i += 4) {
    if (++coords[0] === sceneCanvas.width) {
      coords[0] = 0
      ++coords[1]
    }

    imageData.data[i] = mod(rStartFn, ...coords)
    imageData.data[i + 1] = mod(gStartFn, ...coords)
    imageData.data[i + 2] = mod(bStartFn, ...coords)
    imageData.data[i + 3] = 255
  }

  sceneCtx.putImageData(imageData, 0, 0)
}

const drawInfo = () => {
  let xcoord = 'x: '
  let ycoord = 'y: '
  let rvalue = 'r: '
  let gvalue = 'g: '
  let bvalue = 'b: '
  let rgb

  if (x || y) {
    const index = x * 4 + y * imageData.width * 4
    const [r, g, b] = imageData.data.slice(index)

    xcoord += String(x).padStart(3, '0')
    ycoord += String(y).padStart(3, '0')
    rvalue += String(r).padStart(3, '0')
    gvalue += String(g).padStart(3, '0')
    bvalue += String(b).padStart(3, '0')
    rgb = `rgb(${r}, ${g}, ${b})`
  } else {
    xcoord = 'x: 000'
    ycoord = 'y: 000'
    rvalue = 'r: 000'
    gvalue = 'g: 000'
    bvalue = 'b: 000'
    rgb = 'white'
  }

  infoCtx.clearRect(0, 0, infoCanvas.width, infoCanvas.height)

  let nextX = Math.max(
    infoCtx.measureText(xcoord).width,
    infoCtx.measureText(ycoord).width
  ) + 20

  infoCtx.fillStyle = 'black'

  infoCtx.fillText(xcoord, 0, 20)
  infoCtx.fillText(ycoord, 0, 40)
  infoCtx.fillText(rvalue, nextX, 20)
  infoCtx.fillText(gvalue, nextX, 40)
  infoCtx.fillText(bvalue, nextX, 60)

  nextX += Math.max(
    infoCtx.measureText(rvalue).width,
    infoCtx.measureText(gvalue).width,
    infoCtx.measureText(bvalue).width
  ) + 20

  infoCtx.fillStyle = rgb
  infoCtx.fillRect(nextX, 0, nextX + 20, 60)
}

const drawCircle = () => {
  surfaceCtx.clearRect(0, 0, surfaceCanvas.width, surfaceCanvas.height)

  if (!x && !y) return

  surfaceCtx.beginPath()
  surfaceCtx.ellipse(x, y, 3, 3, 0, 0, 2 * Math.PI)
  surfaceCtx.closePath()
  surfaceCtx.stroke()
}

const moveCircle = (newX, newY) => {
  const inBounds = (
    newX >= 0 && newX <= sceneCanvas.width &&
    newY >= 0 && newY <= sceneCanvas.height
  )

  if (!inBounds) return

  (x || y) && sceneCtx.putImageData(imageData, 0, 0)

  x = newX
  y = newY

  window.requestAnimationFrame(drawCircle)
}

surfaceCanvas.onmousedown = event => {
  const newX = (event.clientX - left) * DPR
  const newY = (event.clientY - top) * DPR

  moveCircle(newX, newY)
  window.requestAnimationFrame(drawInfo)
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
  x = 0
  y = 0

  window.requestAnimationFrame(drawCircle)
  window.requestAnimationFrame(drawInfo)
}

const change = () => {
  playing && window.requestAnimationFrame(change)

  const coords = [0, 0]

  let r, g, b

  for (let i = 0; i < imageData.data.length; i += 4) {
    if (++coords[0] === sceneCanvas.width) {
      coords[0] = 0
      ++coords[1]
    }

    r = imageData.data[i]
    g = imageData.data[i + 1]
    b = imageData.data[i + 2]

    imageData.data[i] = mod(rChangeFn, r, g, b, step, ...coords)
    imageData.data[i + 1] = mod(gChangeFn, r, g, b, step, ...coords)
    imageData.data[i + 2] = mod(bChangeFn, r, g, b, step, ...coords)
  }

  sceneCtx.putImageData(imageData, 0, 0)
  if (x || y) window.requestAnimationFrame(drawInfo)
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
  try {
    rStartFn = rStartFnInput.value
      ? createStartFn(rStartFnInput.value)
      : defaultStartFn

    gStartFn = gStartFnInput.value
      ? createStartFn(gStartFnInput.value)
      : defaultStartFn

    bStartFn = bStartFnInput.value
      ? createStartFn(bStartFnInput.value)
      : defaultStartFn

    rStartFn(0, 0)
    bStartFn(0, 0)
    gStartFn(0, 0)

    hideModal(startFnsModal)
  } catch (err) {
    console.error(err)
    window.alert('Invalid start function:' + err.message)
  }
}

closeChangeFnsModalBtn.onclick = () => {
  try {
    rChangeFn = rChangeFnInput.value
      ? createChangeFn(rChangeFnInput.value)
      : defaultRChangeFn

    gChangeFn = gChangeFnInput.value
      ? createChangeFn(gChangeFnInput.value)
      : defaultGChangeFn

    bChangeFn = bChangeFnInput.value
      ? createChangeFn(bChangeFnInput.value)
      : defaultBChangeFn

    rChangeFn(0, 0, 0, 0, 0, 0)
    bChangeFn(0, 0, 0, 0, 0, 0)
    gChangeFn(0, 0, 0, 0, 0, 0)

    hideModal(changeFnsModal)
  } catch (err) {
    console.error(err)
    window.alert('Invalid change function:' + err.message)
  }
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

const warningModal = document.getElementById('warning-modal')
const closeWarningModalBtn = warningModal.querySelector('.close-btn')

showModal(warningModal)

closeWarningModalBtn.onclick = () => {
  hideModal(warningModal)
}

drawInfo()
