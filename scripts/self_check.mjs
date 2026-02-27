import fs from 'node:fs';
import path from 'node:path';
import { createInitialState, stepState, renderGameToText, restartRound } from '../src/game.js';

const state = createInitialState(27);
stepState(state, { launch: true }, 1 / 60);

for (let i = 0; i < 4; i += 1) {
  const brick = state.bricks[i];
  state.ball.x = brick.x + brick.width / 2;
  state.ball.y = brick.y + brick.height / 2;
  state.ball.vx = 0;
  state.ball.vy = 180;
  stepState(state, {}, 1 / 60);
}

const afterMultiBall = JSON.parse(renderGameToText(state));
const multiBallTriggered = afterMultiBall.ballsInPlay >= 2;
const scoreAfterChain = afterMultiBall.score;

stepState(state, { pause: true }, 1 / 60);
const pausedMode = state.mode;
stepState(state, { pause: true }, 1 / 60);
const resumedMode = state.mode;
restartRound(state);
const resetState = JSON.parse(renderGameToText(state));

const summary = {
  multiBallTriggered,
  scoreAfterChain,
  pausedMode,
  resumedMode,
  resetMode: resetState.mode,
  resetBallsInPlay: resetState.ballsInPlay,
  coordinateSystem: resetState.coordinateSystem
};

const outDir = path.join(process.cwd(), 'playwright/main-actions');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'solver-summary.json'), JSON.stringify(summary, null, 2));
fs.writeFileSync(path.join(outDir, 'solver-final-state.json'), JSON.stringify(resetState, null, 2));

console.log(JSON.stringify(summary));
