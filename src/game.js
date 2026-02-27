const FIELD_WIDTH = 960;
const FIELD_HEIGHT = 640;
const BRICK_ROWS = 5;
const BRICK_COLS = 8;
const BRICK_WIDTH = 100;
const BRICK_HEIGHT = 24;
const BRICK_GAP = 12;
const BRICK_TOP = 80;
const BALL_RADIUS = 8;
const PADDLE_WIDTH = 150;
const PADDLE_HEIGHT = 18;
const PADDLE_Y = FIELD_HEIGHT - 52;
const PADDLE_SPEED = 460;
const INITIAL_LIVES = 3;

function lcg(seed) {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function buildBricks() {
  const totalWidth = BRICK_COLS * BRICK_WIDTH + (BRICK_COLS - 1) * BRICK_GAP;
  const left = (FIELD_WIDTH - totalWidth) / 2;
  const bricks = [];

  for (let row = 0; row < BRICK_ROWS; row += 1) {
    for (let col = 0; col < BRICK_COLS; col += 1) {
      bricks.push({
        id: `${row}-${col}`,
        x: left + col * (BRICK_WIDTH + BRICK_GAP),
        y: BRICK_TOP + row * (BRICK_HEIGHT + BRICK_GAP),
        width: BRICK_WIDTH,
        height: BRICK_HEIGHT,
        hp: 1
      });
    }
  }

  return bricks;
}

function newPrimaryBall() {
  return {
    id: 'primary',
    x: FIELD_WIDTH / 2,
    y: PADDLE_Y - BALL_RADIUS - 1,
    vx: 210,
    vy: -280,
    radius: BALL_RADIUS,
    active: true
  };
}

function newBonusBall(baseBall, state) {
  const jitter = (state.rng() - 0.5) * 80;
  return {
    id: `bonus-${state.frameCount}`,
    x: baseBall.x,
    y: baseBall.y,
    vx: -baseBall.vx + jitter,
    vy: Math.min(-200, baseBall.vy - 30),
    radius: BALL_RADIUS,
    active: true
  };
}

function createInitialState(seed = 1) {
  const primaryBall = newPrimaryBall();
  return {
    mode: 'ready',
    seed,
    rng: lcg(seed),
    frameCount: 0,
    score: 0,
    highScore: 0,
    lives: INITIAL_LIVES,
    level: 1,
    combo: 0,
    multiBallReady: false,
    paddle: {
      x: FIELD_WIDTH / 2 - PADDLE_WIDTH / 2,
      y: PADDLE_Y,
      width: PADDLE_WIDTH,
      height: PADDLE_HEIGHT
    },
    ball: primaryBall,
    balls: [primaryBall],
    bricks: buildBricks(),
    twist: 'multi-ball bonus',
    message: 'Press Space to launch.'
  };
}

function movePaddle(state, direction, dt) {
  if (!direction) return;
  state.paddle.x += direction * PADDLE_SPEED * dt;
  state.paddle.x = Math.max(0, Math.min(FIELD_WIDTH - state.paddle.width, state.paddle.x));

  if (state.mode === 'ready') {
    const anchor = state.balls[0];
    anchor.x = state.paddle.x + state.paddle.width / 2;
    anchor.y = state.paddle.y - anchor.radius - 1;
  }
}

function intersects(ball, rect) {
  const closestX = Math.max(rect.x, Math.min(ball.x, rect.x + rect.width));
  const closestY = Math.max(rect.y, Math.min(ball.y, rect.y + rect.height));
  const dx = ball.x - closestX;
  const dy = ball.y - closestY;
  return dx * dx + dy * dy <= ball.radius * ball.radius;
}

function resolvePaddleBounce(ball, paddle) {
  if (ball.vy <= 0) return;
  if (!intersects(ball, paddle)) return;

  const paddleCenter = paddle.x + paddle.width / 2;
  const normalized = (ball.x - paddleCenter) / (paddle.width / 2);
  ball.vx = normalized * 330;
  ball.vy = -Math.max(220, Math.abs(ball.vy));
  ball.y = paddle.y - ball.radius - 1;
}

function handleBrickHit(state, ball) {
  for (let i = 0; i < state.bricks.length; i += 1) {
    const brick = state.bricks[i];
    if (!intersects(ball, brick)) {
      continue;
    }

    state.bricks.splice(i, 1);
    state.combo += 1;
    const multiplier = 1 + Math.min(3, state.combo) * 0.25;
    state.score += Math.round(10 * multiplier);
    state.highScore = Math.max(state.highScore, state.score);

    const brickCenterY = brick.y + brick.height / 2;
    ball.vy = ball.y < brickCenterY ? -Math.abs(ball.vy) : Math.abs(ball.vy);

    if (state.combo >= 3) {
      state.multiBallReady = true;
    }

    if (state.multiBallReady && state.balls.length === 1) {
      state.balls.push(newBonusBall(ball, state));
      state.multiBallReady = false;
      state.message = 'Multi-ball bonus active!';
    }

    return true;
  }

  return false;
}

function stepRunningState(state, input, dt) {
  const direction = (input.left ? -1 : 0) + (input.right ? 1 : 0);
  movePaddle(state, direction, dt);

  for (const ball of state.balls) {
    if (!ball.active) continue;

    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    if (ball.x <= ball.radius) {
      ball.x = ball.radius;
      ball.vx = Math.abs(ball.vx);
    } else if (ball.x >= FIELD_WIDTH - ball.radius) {
      ball.x = FIELD_WIDTH - ball.radius;
      ball.vx = -Math.abs(ball.vx);
    }

    if (ball.y <= ball.radius) {
      ball.y = ball.radius;
      ball.vy = Math.abs(ball.vy);
    }

    resolvePaddleBounce(ball, state.paddle);
    handleBrickHit(state, ball);

    if (ball.y > FIELD_HEIGHT + ball.radius) {
      ball.active = false;
    }
  }

  state.balls = state.balls.filter((ball) => ball.active);
  state.ball = state.balls[0] ?? state.ball;

  if (state.balls.length === 0) {
    state.lives -= 1;
    state.combo = 0;
    if (state.lives <= 0) {
      state.mode = 'lost';
      state.message = 'Game over. Press R to reset.';
      return;
    }

    const resetBall = newPrimaryBall();
    resetBall.x = state.paddle.x + state.paddle.width / 2;
    resetBall.y = state.paddle.y - resetBall.radius - 1;
    state.balls = [resetBall];
    state.ball = resetBall;
    state.mode = 'ready';
    state.message = 'Life lost. Press Space to relaunch.';
    return;
  }

  if (state.bricks.length === 0) {
    state.mode = 'won';
    state.message = 'Level clear! Press R to play again.';
  }
}

function restartRound(state) {
  const seed = state.seed;
  const best = state.highScore;
  Object.assign(state, createInitialState(seed));
  state.highScore = best;
  state.message = 'Press Space to launch.';
}

function normalizeInput(input) {
  return {
    left: Boolean(input?.left),
    right: Boolean(input?.right),
    launch: Boolean(input?.launch),
    pause: Boolean(input?.pause),
    reset: Boolean(input?.reset)
  };
}

function stepState(state, input = {}, dt = 1 / 60) {
  const controls = normalizeInput(input);

  if (controls.reset) {
    restartRound(state);
    state.frameCount += 1;
    return state;
  }

  if (controls.pause && (state.mode === 'running' || state.mode === 'paused')) {
    state.mode = state.mode === 'paused' ? 'running' : 'paused';
    state.message = state.mode === 'paused' ? 'Paused' : 'Running';
  }

  if (state.mode === 'ready') {
    const direction = (controls.left ? -1 : 0) + (controls.right ? 1 : 0);
    movePaddle(state, direction, dt);
    if (controls.launch) {
      state.mode = 'running';
      state.message = 'Break the pattern and chain combos.';
    }
  } else if (state.mode === 'running') {
    stepRunningState(state, controls, dt);
  }

  state.frameCount += 1;
  return state;
}

function renderGameToText(state) {
  const snapshot = {
    mode: state.mode,
    coordinateSystem: 'origin: top-left, +x right, +y down, units: pixels',
    score: state.score,
    highScore: state.highScore,
    lives: state.lives,
    combo: state.combo,
    ballsInPlay: state.balls.length,
    paddle: {
      x: Number(state.paddle.x.toFixed(2)),
      y: state.paddle.y,
      width: state.paddle.width,
      height: state.paddle.height
    },
    balls: state.balls.map((ball) => ({
      id: ball.id,
      x: Number(ball.x.toFixed(2)),
      y: Number(ball.y.toFixed(2)),
      vx: Number(ball.vx.toFixed(2)),
      vy: Number(ball.vy.toFixed(2))
    })),
    bricksRemaining: state.bricks.length,
    message: state.message
  };

  return JSON.stringify(snapshot);
}

export {
  FIELD_WIDTH,
  FIELD_HEIGHT,
  createInitialState,
  movePaddle,
  restartRound,
  stepState,
  renderGameToText
};
