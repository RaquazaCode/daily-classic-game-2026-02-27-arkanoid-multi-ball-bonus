import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialState,
  stepState,
  movePaddle,
  restartRound,
  renderGameToText
} from '../src/game.js';

test('initial state exposes arkanoid defaults', () => {
  const state = createInitialState(7);
  assert.equal(state.mode, 'ready');
  assert.equal(state.score, 0);
  assert.equal(state.bricks.length, 40);
});

test('ball bounces off paddle and grants score when hitting brick', () => {
  const state = createInitialState(3);
  state.mode = 'running';
  state.ball.x = state.bricks[0].x + 2;
  state.ball.y = state.bricks[0].y + 2;
  state.ball.vx = 0;
  state.ball.vy = 140;
  stepState(state, { left: false, right: false, launch: false }, 1 / 60);
  assert.equal(state.score > 0, true);
});

test('multi-ball twist spawns bonus ball after streak', () => {
  const state = createInitialState(9);
  state.mode = 'running';
  state.combo = 3;
  state.multiBallReady = true;
  state.ball.x = state.bricks[1].x + 2;
  state.ball.y = state.bricks[1].y + 2;
  state.ball.vx = 0;
  state.ball.vy = 140;
  stepState(state, { left: false, right: false, launch: false }, 1 / 60);
  assert.equal(state.balls.length, 2);
});

test('pause and reset return deterministic ready state', () => {
  const state = createInitialState(12);
  state.mode = 'running';
  movePaddle(state, 1, 1 / 60);
  restartRound(state);
  assert.equal(state.mode, 'ready');
  assert.equal(state.balls.length, 1);
  const text = renderGameToText(state);
  const parsed = JSON.parse(text);
  assert.equal(parsed.mode, 'ready');
});
