import './style.css';
import {
  FIELD_HEIGHT,
  FIELD_WIDTH,
  createInitialState,
  renderGameToText as buildSnapshot,
  stepState
} from './game.js';

const app = document.querySelector('#app');
app.innerHTML = `
  <main class="shell">
    <header class="hero">
      <p class="eyebrow">Daily Classic Game</p>
      <h1>Arkanoid: Multi-ball Bonus</h1>
      <p>Break patterned bricks, chain hits, and trigger a second ball to maximize score.</p>
    </header>

    <section class="board-wrap">
      <canvas id="game-canvas" width="960" height="640" aria-label="Arkanoid playfield"></canvas>
      <aside class="panel">
        <div class="stats">
          <article><span>Score</span><strong id="score">0</strong></article>
          <article><span>Best</span><strong id="best">0</strong></article>
          <article><span>Lives</span><strong id="lives">3</strong></article>
          <article><span>Combo</span><strong id="combo">0</strong></article>
        </div>

        <p id="mode" class="chip">Ready</p>
        <p id="message" class="message">Press Space to launch.</p>

        <div class="controls">
          <button id="launch-btn" type="button">Launch (Space)</button>
          <button id="pause-btn" type="button">Pause (P)</button>
          <button id="reset-btn" type="button">Reset (R)</button>
        </div>

        <ul class="legend">
          <li><kbd>←</kbd><kbd>→</kbd> Move paddle</li>
          <li><kbd>Space</kbd> Launch ball</li>
          <li><kbd>P</kbd> Pause/Resume</li>
          <li><kbd>R</kbd> Reset run</li>
          <li><kbd>F</kbd> Toggle fullscreen</li>
        </ul>
      </aside>
    </section>
  </main>
`;

const canvas = document.querySelector('#game-canvas');
const ctx = canvas.getContext('2d');

const scoreEl = document.querySelector('#score');
const bestEl = document.querySelector('#best');
const livesEl = document.querySelector('#lives');
const comboEl = document.querySelector('#combo');
const modeEl = document.querySelector('#mode');
const messageEl = document.querySelector('#message');

const launchBtn = document.querySelector('#launch-btn');
const pauseBtn = document.querySelector('#pause-btn');
const resetBtn = document.querySelector('#reset-btn');

const state = createInitialState(27);
const controls = { left: false, right: false };
let queuedLaunch = false;
let queuedPause = false;
let queuedReset = false;
let lastTick = performance.now();
let accumulator = 0;
const STEP_MS = 1000 / 60;

function updateHud() {
  scoreEl.textContent = String(state.score);
  bestEl.textContent = String(state.highScore);
  livesEl.textContent = String(state.lives);
  comboEl.textContent = String(state.combo);
  modeEl.textContent = state.mode;
  messageEl.textContent = state.message;
}

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, FIELD_HEIGHT);
  gradient.addColorStop(0, '#0f2f4f');
  gradient.addColorStop(1, '#090f1a');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, FIELD_WIDTH, FIELD_HEIGHT);

  for (let i = 0; i < 28; i += 1) {
    const x = (i * 79) % FIELD_WIDTH;
    const y = (i * 127) % FIELD_HEIGHT;
    ctx.fillStyle = `rgba(110, 198, 255, ${0.05 + (i % 4) * 0.03})`;
    ctx.fillRect(x, y, 100, 2);
  }
}

function drawBricks() {
  for (const brick of state.bricks) {
    const hue = 190 + (Number(brick.id.split('-')[0]) * 18);
    ctx.fillStyle = `hsl(${hue} 80% 56%)`;
    ctx.fillRect(brick.x, brick.y, brick.width, brick.height);
    ctx.strokeStyle = 'rgba(220, 246, 255, 0.45)';
    ctx.strokeRect(brick.x + 0.5, brick.y + 0.5, brick.width - 1, brick.height - 1);
  }
}

function drawPaddle() {
  ctx.fillStyle = '#f5d26a';
  ctx.fillRect(state.paddle.x, state.paddle.y, state.paddle.width, state.paddle.height);
}

function drawBalls() {
  for (const ball of state.balls) {
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = ball.id.startsWith('bonus') ? '#ff8ecf' : '#f6f3e8';
    ctx.fill();
  }
}

function drawFrame() {
  drawBackground();
  drawBricks();
  drawPaddle();
  drawBalls();

  if (state.mode !== 'running') {
    ctx.fillStyle = 'rgba(4, 8, 14, 0.55)';
    ctx.fillRect(0, 0, FIELD_WIDTH, FIELD_HEIGHT);
    ctx.fillStyle = '#eaf6ff';
    ctx.font = '700 42px Trebuchet MS';
    ctx.textAlign = 'center';
    const heading = state.mode === 'won'
      ? 'Level Clear'
      : state.mode === 'lost'
        ? 'Game Over'
        : state.mode === 'paused'
          ? 'Paused'
          : 'Ready';
    ctx.fillText(heading, FIELD_WIDTH / 2, FIELD_HEIGHT / 2 - 10);
    ctx.font = '500 24px Trebuchet MS';
    ctx.fillText(state.message, FIELD_WIDTH / 2, FIELD_HEIGHT / 2 + 36);
  }

  updateHud();
}

function step(dt) {
  stepState(
    state,
    {
      left: controls.left,
      right: controls.right,
      launch: queuedLaunch,
      pause: queuedPause,
      reset: queuedReset
    },
    dt
  );

  queuedLaunch = false;
  queuedPause = false;
  queuedReset = false;
}

function frame(now) {
  accumulator += now - lastTick;
  lastTick = now;

  while (accumulator >= STEP_MS) {
    step(STEP_MS / 1000);
    accumulator -= STEP_MS;
  }

  drawFrame();
  window.requestAnimationFrame(frame);
}

function handleKey(isDown, event) {
  if (event.code === 'ArrowLeft') {
    controls.left = isDown;
    event.preventDefault();
  }
  if (event.code === 'ArrowRight') {
    controls.right = isDown;
    event.preventDefault();
  }

  if (!isDown) return;

  if (event.code === 'Space') {
    queuedLaunch = true;
    event.preventDefault();
  }
  if (event.code === 'KeyP') {
    queuedPause = true;
  }
  if (event.code === 'KeyR') {
    queuedReset = true;
  }
  if (event.code === 'KeyF') {
    if (!document.fullscreenElement) {
      canvas.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }
}

document.addEventListener('keydown', (event) => handleKey(true, event));
document.addEventListener('keyup', (event) => handleKey(false, event));

launchBtn.addEventListener('click', () => {
  queuedLaunch = true;
});
pauseBtn.addEventListener('click', () => {
  queuedPause = true;
});
resetBtn.addEventListener('click', () => {
  queuedReset = true;
});

window.render_game_to_text = () => buildSnapshot(state);
window.advanceTime = (ms) => {
  const steps = Math.max(1, Math.round(ms / STEP_MS));
  for (let i = 0; i < steps; i += 1) {
    step(STEP_MS / 1000);
  }
  drawFrame();
  return buildSnapshot(state);
};

drawFrame();
window.requestAnimationFrame(frame);
