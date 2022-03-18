'use strict'

const canvas = document.getElementById('canvas')

let ctx
let imageData
let left
let top

const setCanvasDimensions = () => {
  const dpr = window.devicePixelRatio
  const rect = canvas.getBoundingClientRect()

  left = Math.round(rect.left)
  top = Math.round(rect.top)

  canvas.width = rect.width * dpr
  canvas.height = rect.height * dpr

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

const rStartFnInput = document.getElementById('rstartfn')
const gStartFnInput = document.getElementById('gstartfn')
const bStartFnInput = document.getElementById('bstartfn')

const rChangeFnInput = document.getElementById('rchangefn')
const gChangeFnInput = document.getElementById('gchangefn')
const bChangeFnInput = document.getElementById('bchangefn')

const defaultStartFn = (x, y) => x + y
const defaultChangeFn = (x, y, v, s) => x + y + v + s

let rStartFn = defaultStartFn
let gStartFn = defaultStartFn
let bStartFn = defaultStartFn

let rChangeFn = defaultChangeFn
let gChangeFn = defaultChangeFn
let bChangeFn = defaultChangeFn

let x = 0
let y = 0

const makeFnSubs = rhs => {
  return rhs
    .replace(/([0-9.]+)\s*([a-z]+)/gi, '$1*$2')
    .replace(/(\))\s*(\()/gi, '$1*$2')
    .replace(/\^/g, '**')
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

  if (/[^0-9xyvs*+\-/.() ]/.test(rhs)) {
    const err = new Error('Invalid change function: (x, y, v, s) => ' + rhs)
    console.error(err)
    window.alert(err.message)
    return
  }

  // eslint-disable-next-line no-new-func
  return new Function('x', 'y', 'v', 's', 'return ' + rhs)
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
}

const drawCircle = () => {
  ctx.beginPath()
  ctx.ellipse(x, y, 3, 3, 0, 0, 2 * Math.PI)
  ctx.closePath()
  ctx.stroke()
}

const controlPanel = document.getElementById('control-panel')
const rvalue = document.getElementById('rvalue')
const gvalue = document.getElementById('gvalue')
const bvalue = document.getElementById('bvalue')
const palette = document.getElementById('palette')

const updateRGB = () => {
  const index = x * 4 + y * imageData.width * 4
  let [r, g, b] = imageData.data.slice(index)

  r = '' + r
  g = '' + g
  b = '' + b

  r = r.padStart(3, '0')
  g = g.padStart(3, '0')
  b = b.padStart(3, '0')

  rvalue.innerText = 'r: ' + r
  gvalue.innerText = 'g: ' + g
  bvalue.innerText = 'b: ' + b
  palette.style.backgroundColor = `rgb(${r}, ${g}, ${b})`
}

const place = (newX, newY) => {
  const inBounds = (
    newX >= 0 && newX <= canvas.width &&
    newY >= 0 && newY <= canvas.height
  )

  if (!inBounds) return

  (x || y) && ctx.putImageData(imageData, 0, 0)

  x = newX
  y = newY

  drawCircle()
  updateRGB()
}

canvas.onclick = canvas.ontouchstart = event => {
  place(event.clientX - left, event.clientY - top)
}

document.body.onkeydown = event => {
  switch (event.key) {
    case 'ArrowUp':
      place(x, y - 1)
      break

    case 'ArrowDown':
      place(x, y + 1)
      break

    case 'ArrowLeft':
      place(x - 1, y)
      break

    case 'ArrowRight':
      place(x + 1, y)
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

const change = s => {
  let x = 0
  let y = 0

  for (let i = 0; i < imageData.data.length; i += 4) {
    if (++x === canvas.width) {
      x = 0
      ++y
    }

    imageData.data[i] = mod(rChangeFn, x, y, imageData.data[i], s)
    imageData.data[i + 1] = mod(gChangeFn, x, y, imageData.data[i + 1], s)
    imageData.data[i + 2] = mod(bChangeFn, x, y, imageData.data[i + 2], s)
  }

  ctx.putImageData(imageData, 0, 0)

  if (!x && !y) return

  drawCircle()
  updateRGB()
}

init()

const playBtn = document.getElementById('play-btn')
const stopBtn = document.getElementById('stop-btn')
const resetBtn = document.getElementById('reset-btn')
const speedSelect = document.getElementById('speed-select')
const stepInput = document.getElementById('step-input')
const startFnsBtn = document.getElementById('start-fns-btn')
const changeFnsBtn = document.getElementById('change-fns-btn')

const startFnsModal = document.getElementById('start-fns-modal')
const changeFnsModal = document.getElementById('change-fns-modal')
const closeStartFnsModalBtn = startFnsModal.querySelector('.close-btn')
const closeChangeFnsModalBtn = changeFnsModal.querySelector('.close-btn')

let interval
let ms = 200
let playing = false
let showingModal = false
let step = 1

speedSelect.onchange = event => {
  switch (event.target.value) {
    case 'slow':
      ms = 500
      break

    case 'medium':
      ms = 200
      break

    case 'fast':
      ms = 100
  }

  playing && play()
}

stepInput.oninput = event => {
  step = +event.target.value
}

startFnsBtn.onclick = event => {
  if (showingModal) return

  showingModal = true
  event.stopPropagation()
  startFnsModal.style.display = 'block'
}

changeFnsBtn.onclick = event => {
  if (showingModal) return

  showingModal = true
  event.stopPropagation()
  changeFnsModal.style.display = 'block'
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

  startFnsModal.style.display = 'none'
  showingModal = false
}

closeChangeFnsModalBtn.onclick = () => {
  rChangeFn = rChangeFnInput.value
    ? createChangeFn(rChangeFnInput.value)
    : defaultChangeFn

  gChangeFn = gChangeFnInput.value
    ? createChangeFn(gChangeFnInput.value)
    : defaultChangeFn

  bChangeFn = bChangeFnInput.value
    ? createChangeFn(bChangeFnInput.value)
    : defaultChangeFn

  changeFnsModal.style.display = 'none'
  showingModal = false
}

const play = () => {
  clearInterval(interval)

  interval = setInterval(() => {
    change(step)
  }, ms)

  playing = true
}

const stop = () => {
  clearInterval(interval)
  playing = false
}

playBtn.onclick = event => {
  event.stopPropagation()
  play()
}

stopBtn.onclick = event => {
  event.stopPropagation()
  stop()
}

resetBtn.onclick = event => {
  event.stopPropagation()
  init()
}
